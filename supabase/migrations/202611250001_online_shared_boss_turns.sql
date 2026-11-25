begin;
-- Choices are private, authoritative and resolved under the existing room lock.
alter table online_boss_intents drop constraint online_boss_intents_action_check;
alter table online_boss_intents add constraint online_boss_intents_action_check check(action in('move','attack','skill','wait','use_item'));
alter function online_world(text,jsonb) rename to online_world_pre_shared_turns;
alter function online_adventure_tick(uuid) rename to online_adventure_tick_pre_shared_turns;
alter function online_turn_enemy(uuid,text,uuid) rename to online_turn_enemy_pre_shared_turns;
alter function online_lock_action(text) rename to online_lock_action_pre_shared_turns;
create function online_lock_action(a text)returns void language plpgsql security definer set search_path=public,pg_temp as $$begin
-- The outer caller owns the room lock. Do not acquire another user's lock
-- while their own request may be waiting for this same room (lock inversion).
if current_setting('online.resolving_boss',true)='on'then return;end if;
perform online_lock_action_pre_shared_turns(a);end$$;

create function online_boss_participants(rid uuid)returns setof uuid language sql stable security definer set search_path=public,pg_temp as $$
select a.character_id from online_adventure_members a join online_presence p on p.character_id=a.character_id join online_characters c on c.id=a.character_id
where a.room_id=rid and a.finished_at is null and a.floor=1 and p.location='dungeon' and p.seen_at>clock_timestamp()-interval '30 seconds' and c.hp>0 and online_in_boss_room(a.x,a.y)
$$;

-- Internal actor calls retain the real item, panel, reward and animation paths.
create or replace function online_boss_actor_action(actor uuid,act text,data jsonb)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare old_sub text:=current_setting('request.jwt.claim.sub',true);old_claims text:=current_setting('request.jwt.claims',true);begin
perform set_config('request.jwt.claim.sub',actor::text,true);
perform set_config('request.jwt.claims',(coalesce(nullif(old_claims,''),'{}')::jsonb||jsonb_build_object('sub',actor,'is_anonymous',false))::text,true);
perform online_world_pre_shared_turns(act,data);
perform set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);perform set_config('request.jwt.claims',coalesce(old_claims,''),true);
exception when others then
perform set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);perform set_config('request.jwt.claims',coalesce(old_claims,''),true);raise;
end$$;

-- Older economy/core wrappers also contain direct per-user locks. Internal
-- actors already execute atomically under the room owner; skip those too.
do $$declare f record;s text;begin
for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname like'online_world%'and prokind='f'loop
s:=pg_get_functiondef(f.oid);
s:=regexp_replace(s,'perform pg_advisory_xact_lock\(hashtextextended\((uid::text|auth.uid\(\)::text),\s*0\)\);','if current_setting(''online.resolving_boss'',true)is distinct from''on''then \& end if;','g');execute s;
end loop;end$$;

create function online_turn_enemy(rid uuid,eid text,cid uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$begin
if current_setting('online.resolving_boss',true)='on' and current_setting('online.shared_enemy_phase',true)is distinct from'on'then return;end if;
perform online_turn_enemy_pre_shared_turns(rid,eid,cid);end$$;

-- Retire the old queue interceptor. Only the outermost RPC queues choices now.
do $$declare s text;begin
select pg_get_functiondef('online_adventure_tick_pre_shared_turns(uuid)'::regprocedure)into s;
if position('s-''turn'''in s)=0 then raise exception 'Idle tick write hook missing';end if;
s:=replace(s,'s-''turn''','s');execute s;
select pg_get_functiondef('online_turn_enemy_pre_cinematic(uuid,text,uuid)'::regprocedure)into s;
if position('g:=pr->>''gimmick'''in s)=0 then raise exception 'Enemy behavior hook missing';end if;
-- An ordinary boss has no special gimmick; NULL must not suppress every third turn.
s:=replace(s,'g:=pr->>''gimmick''','g:=coalesce(pr->>''gimmick'',''none'')');execute s;
select pg_get_functiondef('online_world_pre_housing(text,jsonb)'::regprocedure)into s;
if position('if p.location=''dungeon'''in s)=0 then raise exception 'Legacy boss queue hook missing';end if;
s:=replace(s,'if p.location=''dungeon''','if current_setting(''online.resolving_boss'',true)is distinct from''on'' and p.location=''dungeon''');execute s;
-- During a validated simultaneous move, a moving ally vacates their old tile.
select pg_get_functiondef('online_world_adventures(text,jsonb)'::regprocedure)into s;
if position('and m.x=nx and m.y=ny'in s)=0 then raise exception 'Simultaneous movement hook missing';end if;
s:=replace(s,'and m.x=nx and m.y=ny','and m.x=nx and m.y=ny and not(current_setting(''online.resolving_boss'',true)=''on'' and coalesce(nullif(current_setting(''online.shared_moves'',true),''''),''[]'')::jsonb ? m.character_id::text)');execute s;
end$$;

create function online_adventure_tick(rid uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare s jsonb;b online_boss_rounds;ids uuid[];ready int;total int;nowms bigint:=online_adventure_now_ms();v jsonb;valid jsonb:='[]';changed boolean;m record;q record;e jsonb;target uuid;fast jsonb:='[]';typ text;speed int;act text;data jsonb;failures jsonb:='[]';begin
if current_setting('online.resolving_boss',true)='on'then return;end if;
perform pg_advisory_xact_lock(hashtextextended('online-room:'||rid::text,0));
perform online_adventure_tick_pre_shared_turns(rid);select snapshot into s from online_adventure_rooms where id=rid;
select array_agg(p)into ids from online_boss_participants(rid)p;total:=coalesce(cardinality(ids),0);
if total=0 or s#>>'{bossEncounter,phase}'is distinct from'battle' or exists(select 1 where s#>'{bossEncounter,smash}'is not null and nowms<(s#>>'{bossEncounter,smash,at}')::bigint+(s#>>'{bossEncounter,smash,duration}')::int)or not exists(select 1 from online_adventure_rooms r where r.id=rid and r.status='active')or not exists(select 1 from jsonb_array_elements(s->'enemies')e where coalesce((e->>'boss')::boolean,false)and(e->>'hp')::int>0)then
delete from online_boss_intents where room_id=rid;delete from online_boss_rounds where room_id=rid;
update online_adventure_rooms set snapshot=snapshot-'turn'where id=rid and snapshot?'turn';return;end if;
delete from online_boss_intents where room_id=rid and not(character_id=any(ids));
insert into online_boss_rounds(room_id,deadline)values(rid,0)on conflict do nothing;
select * into b from online_boss_rounds where room_id=rid;
select count(*)into ready from online_boss_intents where room_id=rid;
-- An empty round waits indefinitely. The first choice starts the grace period.
if ready>0 and b.deadline=0 then update online_boss_rounds set deadline=nowms+1800 where room_id=rid returning * into b;end if;
if b.deadline=0 or(nowms<b.deadline and(ready<total or nowms<b.deadline-1800+268))then
s:=s||jsonb_build_object('turn',jsonb_build_object('number',b.number,'deadline',b.deadline,'durationMs',1800,'ready',ready,'participants',total));
update online_adventure_rooms set snapshot=s where id=rid and snapshot is distinct from s;return;end if;

perform set_config('online.resolving_boss','on',true);perform set_config('online.shared_enemy_phase','off',true);
-- Validate against one starting snapshot, then remove blocked chains. Swaps work.
select coalesce(jsonb_agg(jsonb_build_object('id',a.character_id,'x',(q.payload->>'x')::int,'y',(q.payload->>'y')::int)),'[]')into valid
from online_boss_intents q join online_adventure_members a on a.room_id=q.room_id and a.character_id=q.character_id
where q.room_id=rid and q.action='move'and a.character_id=any(ids)and abs(a.x-(q.payload->>'x')::int)+abs(a.y-(q.payload->>'y')::int)=1
and online_in_boss_room((q.payload->>'x')::int,(q.payload->>'y')::int)and not online_adventure_blocked((q.payload->>'x')::int,(q.payload->>'y')::int,1,s)
and coalesce((s#>>array['roots',a.character_id::text])::int,0)=0 and coalesce((s#>>array['panelParalysis',a.character_id::text])::int,0)=0
and not exists(select 1 from jsonb_array_elements(s->'enemies')e where(e->>'hp')::int>0 and(e->>'x')::int=(q.payload->>'x')::int and(e->>'y')::int=(q.payload->>'y')::int);
loop changed:=false;for v in select jsonb_array_elements(valid)loop
if exists(select 1 from online_adventure_members a where a.room_id=rid and a.character_id=any(ids)and a.character_id<>(v->>'id')::uuid and a.x=(v->>'x')::int and a.y=(v->>'y')::int and not exists(select 1 from jsonb_array_elements(valid)z where z->>'id'=a.character_id::text))then
select coalesce(jsonb_agg(z),'[]')into valid from jsonb_array_elements(valid)z where z->>'id'<>v->>'id';changed:=true;exit;end if;
end loop;exit when not changed;end loop;
perform set_config('online.shared_moves',(select coalesce(jsonb_agg(z->>'id'),'[]')::text from jsonb_array_elements(valid)z),true);
for m in select a.character_id,c.user_id from online_adventure_members a join online_characters c on c.id=a.character_id where a.room_id=rid and a.character_id=any(ids)order by a.character_id loop
select * into q from online_boss_intents where room_id=rid and character_id=m.character_id;
if q.action='move'then
if exists(select 1 from jsonb_array_elements(valid)z where z->>'id'=m.character_id::text)then act:='move';data:=q.payload;else act:='wait';data:='{}';
update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{roots}',coalesce(snapshot->'roots','{}')||jsonb_build_object(m.character_id::text,0))where id=rid;end if;
update online_presence set moved_at='epoch'where character_id=m.character_id;perform online_boss_actor_action(m.user_id,act,data);
end if;end loop;
perform set_config('online.shared_moves','[]',true);
-- All movement has finished. A fast enemy may strike before a slower attack,
-- but each monster (and each warning countdown) advances only once per round.
select snapshot into s from online_adventure_rooms where id=rid;
for e in select jsonb_array_elements(s->'enemies')loop
if(e->>'hp')::int<=0 or not online_in_boss_room((e->>'x')::int,(e->>'y')::int)then continue;end if;
target:=online_turn_target(rid,e);select * into q from online_boss_intents where room_id=rid and character_id=target;
if q.action in('attack','skill')then
select k.weapon_type into typ from online_characters c left join online_catalog k on k.key=regexp_replace(c.gear->>'weapon_key','^star_','')and coalesce((c.gear->>'weapon')::boolean,false)where c.id=target;
speed:=coalesce((online_mob_profile(e->>'key')->>'speed')::int,90);
if speed>online_weapon_speed(typ)then fast:=fast||jsonb_build_array(e->>'id');perform set_config('online.shared_enemy_phase','on',true);perform online_turn_enemy(rid,e->>'id',target);perform set_config('online.shared_enemy_phase','off',true);end if;
end if;end loop;
for m in select a.character_id,c.user_id from online_adventure_members a join online_characters c on c.id=a.character_id where a.room_id=rid and a.character_id=any(ids)order by a.character_id loop
select * into q from online_boss_intents where room_id=rid and character_id=m.character_id;
if q.action='move'then continue;end if;
if not exists(select 1 from online_characters where id=m.character_id and hp>0)then continue;end if;
update online_presence set moved_at='epoch'where character_id=m.character_id;update online_adventure_members set attack_at='epoch'where room_id=rid and character_id=m.character_id;
begin perform online_boss_actor_action(m.user_id,coalesce(q.action,'wait'),coalesce(q.payload,'{}'));
failures:=failures||jsonb_build_array(jsonb_build_object('characterId',m.character_id,'action',coalesce(q.action,'wait'),'kind',q.payload->>'kind'));
exception when others then failures:=failures||jsonb_build_array(jsonb_build_object('characterId',m.character_id,'message',sqlerrm));end;
end loop;
perform online_maze_sync(rid);select snapshot into s from online_adventure_rooms where id=rid;
for e in select jsonb_array_elements(s->'enemies')loop
if(e->>'hp')::int>0 and online_in_boss_room((e->>'x')::int,(e->>'y')::int)and not(fast?(e->>'id'))then
target:=online_turn_target(rid,e);if target is not null then perform set_config('online.shared_enemy_phase','on',true);perform online_turn_enemy(rid,e->>'id',target);perform set_config('online.shared_enemy_phase','off',true);end if;end if;end loop;
delete from online_boss_intents where room_id=rid;update online_boss_rounds set number=number+1,deadline=0 where room_id=rid;
update online_adventure_rooms set snapshot=snapshot||jsonb_build_object('turnResults',failures,'turnResolved',b.number)where id=rid;
perform set_config('online.resolving_boss','off',true);perform online_adventure_tick(rid);
end$$;

create function online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare p online_presence;m online_adventure_members;s jsonb;result jsonb;nx int;ny int;queued boolean:=false;begin
if auth.uid()is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)then raise exception 'ログインしてください。';end if;
perform online_lock_action(action);select * into p from online_presence where user_id=auth.uid();select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
if p.location='dungeon'and m.floor=1 and online_in_boss_room(m.x,m.y)then update online_presence set seen_at=clock_timestamp()where character_id=p.character_id;end if;
if p.location='dungeon'and m.floor=1 and online_in_boss_room(m.x,m.y)and action in('move','attack','skill','wait','use_item')then
perform online_adventure_tick(m.room_id);select snapshot into s from online_adventure_rooms where id=m.room_id;
if s->'turn'is not null and exists(select 1 from online_boss_participants(m.room_id)c where c=m.character_id)then
select * into m from online_adventure_members where id=m.id;
if action='move'then nx:=(payload->>'x')::int;ny:=(payload->>'y')::int;
if nx is null or ny is null or abs(nx-m.x)+abs(ny-m.y)<>1 or not online_in_boss_room(nx,ny)or online_adventure_blocked(nx,ny,1,s)or exists(select 1 from jsonb_array_elements(s->'enemies')e where(e->>'hp')::int>0 and(e->>'x')::int=nx and(e->>'y')::int=ny)then raise exception 'その移動先は選べません。';end if;
if exists(select 1 from online_boss_intents q where q.room_id=m.room_id and q.character_id<>m.character_id and q.action='move'and(q.payload->>'x')::int=nx and(q.payload->>'y')::int=ny)then raise exception '味方がその移動先を選んでいます。';end if;
elsif action in('attack','skill')and coalesce(payload->>'dir','')not in('up','down','left','right')then raise exception '攻撃方向を選んでください。';end if;
insert into online_boss_intents values(m.room_id,m.character_id,action,payload)on conflict(room_id,character_id)do update set action=excluded.action,payload=excluded.payload;
perform online_adventure_tick(m.room_id);queued:=true;
end if;end if;
result:=online_world_pre_shared_turns(case when queued then'poll'else action end,case when queued then'{}'::jsonb else payload end);
if result#>>'{adventure,inside}'='true'then result:=jsonb_set(result,'{adventure}',(result->'adventure')||jsonb_build_object('intent',(select jsonb_build_object('action',q.action,'payload',q.payload)from online_boss_intents q where q.room_id=m.room_id and q.character_id=p.character_id),'intents',coalesce((select jsonb_agg(jsonb_build_object('characterId',q.character_id,'action',q.action,'payload',q.payload))from online_boss_intents q where q.room_id=m.room_id),'[]')));end if;
return result;end$$;

revoke all on function online_world_pre_shared_turns(text,jsonb),online_adventure_tick_pre_shared_turns(uuid),online_turn_enemy_pre_shared_turns(uuid,text,uuid),online_boss_participants(uuid),online_boss_actor_action(uuid,text,jsonb),online_adventure_tick(uuid),online_turn_enemy(uuid,text,uuid),online_lock_action(text),online_lock_action_pre_shared_turns(text)from public,anon,authenticated;
revoke all on function online_world(text,jsonb)from public,anon;grant execute on function online_world(text,jsonb)to authenticated;
notify pgrst,'reload schema';commit;
