-- A dedicated, authoritative dungeon movement path. No world/inventory/social wrapper chain.
create table online_motion_channels(character_id uuid primary key references online_characters(id)on delete cascade,session_id uuid not null,sequence int not null,reply jsonb not null);
alter table online_motion_channels enable row level security;
revoke all on online_motion_channels from public,anon,authenticated;
create or replace function online_motion_state(cid uuid)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare m online_adventure_members;c online_characters;s jsonb;actors jsonb;loot jsonb;begin
select * into m from online_adventure_members where character_id=cid and finished_at is null;select * into c from online_characters where id=cid;select snapshot into s from online_adventure_rooms where id=m.room_id;
select coalesce(jsonb_agg(jsonb_build_object('character_id',a.character_id,'x',a.x,'y',a.y,'dir',a.dir,'railTrip',a.rail_trip)),'[]')into actors from online_adventure_members a join online_presence p on p.character_id=a.character_id where a.room_id=m.room_id and a.floor=m.floor and a.finished_at is null and p.location='dungeon'and p.seen_at>clock_timestamp()-interval '5 seconds';
select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'kind',d.kind,'category',d.category,'x',d.x,'y',d.y,'amount',d.amount)),'[]')into loot from online_adventure_loot d where d.room_id=m.room_id and d.floor=m.floor;
return jsonb_build_object('roomId',m.room_id,'floor',m.floor,'characterId',cid,'hp',c.hp,'skillStepsRemaining',c.skill_steps_remaining,'timeStopTurns',c.time_stop_turns,'x',m.x,'y',m.y,'snapshot',s,'positions',actors,'drops',loot,'serverTime',online_adventure_now_ms());end$$;
create or replace function online_combat_pulse()returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p online_presence;m online_adventure_members;begin
if auth.uid()is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)then raise exception 'ログインしてください。';end if;
if not pg_try_advisory_xact_lock(hashtextextended(auth.uid()::text,0))then return jsonb_build_object('deferred',true);end if;
select * into p from online_presence where user_id=auth.uid();select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
if p.location is distinct from'dungeon'or m.id is null then return jsonb_build_object('deferred',true);end if;
if not pg_try_advisory_xact_lock(hashtextextended('online-room:'||m.room_id::text,0))then return jsonb_build_object('deferred',true);end if;
update online_presence set seen_at=clock_timestamp()where user_id=auth.uid()and seen_at<clock_timestamp()-interval '1 second';
if m.floor=1 then perform online_adventure_tick(m.room_id);end if;return online_motion_state(p.character_id);end$$;
create function online_dungeon_walk(payload jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();p online_presence;m online_adventure_members;c online_characters;channel online_motion_channels;session uuid;seq int;s jsonb;cfg jsonb;step jsonb;panel jsonb;area jsonb;buff jsonb;used jsonb;kind text;nx int;ny int;accepted int:=0;spent int:=0;available int;ms int;stamp timestamptz;budget timestamptz;nowms bigint;stopped boolean:=false;hpmax int;result jsonb;begin
if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)then raise exception 'ログインしてください。';end if;
session:=(payload->>'session')::uuid;seq:=(payload->>'sequence')::int;
if session is null or seq is null or seq<1 or jsonb_typeof(payload->'steps')is distinct from'array'or jsonb_array_length(payload->'steps')not between 1 and 3 then raise exception '移動経路を確認してください。';end if;
perform set_config('lock_timeout','800ms',true);perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
select * into p from online_presence where user_id=uid;select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
if p.location is distinct from'dungeon'or m.id is null or m.room_id::text is distinct from payload->>'roomId'or m.floor is distinct from(payload->>'floor')::int then raise exception 'エリアが変わりました。状態を再確認してください。';end if;
perform pg_advisory_xact_lock(hashtextextended('online-room:'||m.room_id::text,0));
select * into channel from online_motion_channels where character_id=p.character_id;
if channel.session_id=session then
if seq=channel.sequence then return online_motion_state(p.character_id)||channel.reply;end if;
if seq<>channel.sequence+1 then raise exception '移動の順番を再確認してください。';end if;
elsif seq<>1 then raise exception '移動の順番を再確認してください。';end if;
select * into c from online_characters where id=p.character_id;
if c.hp<=0 or m.rail_trip is not null then raise exception '今は移動できません。';end if;
if m.floor=1 then perform online_adventure_tick(m.room_id);end if;
select * into m from online_adventure_members where id=m.id;select snapshot into s from online_adventure_rooms where id=m.room_id;select data into cfg from online_adventure_config where id='floor1';
stamp:=clock_timestamp();nowms:=online_adventure_now_ms();ms:=online_move_step_ms(c.id);budget:=greatest(p.moved_at,stamp-make_interval(secs=>3*ms/1000.0));available:=greatest(0,least(3,floor(extract(epoch from(stamp-budget))*1000/ms)::int));
for step in select value from jsonb_array_elements(payload->'steps')limit available loop
if s#>>'{bossEncounter,phase}'='opening'or(s#>>'{bossEncounter,phase}'='battle'and s#>'{bossEncounter,smash}'is not null and nowms<(s#>>'{bossEncounter,smash,at}')::bigint+(s#>>'{bossEncounter,smash,duration}')::int)then stopped:=true;exit;end if;
if coalesce((s#>array['panelParalysis',c.id::text])::int,0)>0 or coalesce((s#>array['roots',c.id::text])::int,0)>0 then
s:=jsonb_set(s,'{panelParalysis}',coalesce(s->'panelParalysis','{}')||jsonb_build_object(c.id::text,0));s:=jsonb_set(s,'{roots}',coalesce(s->'roots','{}')||jsonb_build_object(c.id::text,0));s:=jsonb_set(s,'{panelShocks}',coalesce(s->'panelShocks','{}')||jsonb_build_object(c.id::text,nowms));spent:=spent+1;stopped:=true;exit;end if;
nx:=(step->>'x')::int;ny:=(step->>'y')::int;
if nx is null or ny is null or abs(nx-m.x)+abs(ny-m.y)<>1 or online_adventure_blocked(nx,ny,m.floor,s)then stopped:=true;exit;end if;
if m.floor=1 and nx between 94 and 97 and ny between 36 and 37 and not coalesce((s#>>'{bridge,latched}')::boolean,false)and coalesce(s#>>'{bridge,holder}','')=c.id::text then stopped:=true;exit;end if;
if m.floor=1 and online_in_boss_room(nx,ny)and not online_in_boss_room(m.x,m.y)and s#>>'{bossEncounter,phase}'in('opening','battle','returning')then stopped:=true;exit;end if;
if exists(select 1 from online_adventure_members a join online_presence q on q.character_id=a.character_id where a.room_id=m.room_id and a.floor=m.floor and a.character_id<>c.id and a.finished_at is null and q.location='dungeon'and q.seen_at>clock_timestamp()-interval '5 seconds'and a.x=nx and a.y=ny)or(m.floor=1 and exists(select 1 from jsonb_array_elements(s->'enemies')e where(e->>'hp')::int>0 and(e->>'x')::int=nx and(e->>'y')::int=ny))then stopped:=true;exit;end if;
update online_adventure_members set x=nx,y=ny,dir=case when nx>m.x then'right'when nx<m.x then'left'when ny>m.y then'down'else'up'end where id=m.id returning * into m;
spent:=spent+1;accepted:=accepted+1;
update online_characters set skill_steps_remaining=greatest(0,skill_steps_remaining-1)where id=c.id;
if m.floor=1 then
for area in select value from jsonb_array_elements(cfg->'areas')loop if nx>=(area->>'x')::int and nx<(area->>'x')::int+(area->>'w')::int and ny>=(area->>'y')::int and ny<(area->>'y')::int+(area->>'h')::int and not(s->'discovered'?(area->>'id'))then s:=jsonb_set(s,'{discovered}',s->'discovered'||jsonb_build_array(area->>'id'));end if;end loop;
if not coalesce((s->>'trapDisabled')::boolean,false)and exists(select 1 from jsonb_array_elements(cfg->'traps')a where(a->>'x')::int=nx and(a->>'y')::int=ny)then update online_characters set hp=greatest(1,hp-8)where id=c.id;end if;
if exists(select 1 from jsonb_array_elements(coalesce(s->'webs','[]'))w where(w->>'x')::int=nx and(w->>'y')::int=ny)then s:=jsonb_set(s,'{roots}',coalesce(s->'roots','{}')||jsonb_build_object(c.id::text,1));end if;
s:=s||jsonb_build_object('lightTurns',coalesce(s->'lightTurns','{}')||jsonb_build_object(c.id::text,greatest(0,coalesce((s#>array['lightTurns',c.id::text])::int,0)-1)),'actedAt',coalesce(s->'actedAt','{}')||jsonb_build_object(c.id::text,nowms));
select value into panel from jsonb_array_elements(s->'effectPanels')where(value->>'x')::int=nx and(value->>'y')::int=ny and not coalesce((value->>'destroyed')::boolean,false)limit 1;kind:=panel->>'kind';
if kind='heal'then used:=coalesce(s#>array['panelHealUsed',c.id::text],'[]');hpmax:=case when coalesce((c.gear->>'weapon')::boolean,false)and c.gear->>'weapon_key'like'star_%'then 150 else 100 end;
if not(used?(panel->>'id'))and(select hp from online_characters where id=c.id)<hpmax then update online_characters set hp=least(hpmax,hp+25)where id=c.id;s:=jsonb_set(s,'{panelHealUsed}',coalesce(s->'panelHealUsed','{}')||jsonb_build_object(c.id::text,used||jsonb_build_array(panel->>'id')));end if;
elsif kind='paralysis'then s:=jsonb_set(s,'{panelParalysis}',coalesce(s->'panelParalysis','{}')||jsonb_build_object(c.id::text,1));s:=jsonb_set(s,'{panelShocks}',coalesce(s->'panelShocks','{}')||jsonb_build_object(c.id::text,nowms));
elsif kind in('attack_up','defense_up','attack_down','defense_down')then buff:=coalesce(s#>array['panelBuffs',c.id::text],'{}')||jsonb_build_object(kind,jsonb_build_object('source',panel->>'id','rate',case when kind like'%_up'then 1.2 else .8 end));s:=jsonb_set(s,'{panelBuffs}',coalesce(s->'panelBuffs','{}')||jsonb_build_object(c.id::text,buff));end if;
end if;
update online_adventure_rooms set snapshot=s where id=m.room_id and snapshot is distinct from s;
if m.floor=1 then perform online_maze_sync(m.room_id);select snapshot into s from online_adventure_rooms where id=m.room_id;end if;
end loop;
update online_presence set seen_at=stamp,moved_at=case when spent>0 then budget+make_interval(secs=>spent*ms/1000.0)else moved_at end where user_id=uid;
update online_adventure_rooms set snapshot=s where id=m.room_id and snapshot is distinct from s;
result:=online_motion_state(c.id)||jsonb_build_object('ack',jsonb_build_object('sequence',seq,'accepted',accepted,'stopped',stopped,'retryAfterMs',case when available=0 then greatest(1,ms-floor(extract(epoch from(stamp-budget))*1000)::int)else 0 end));
insert into online_motion_channels values(c.id,session,seq,jsonb_build_object('ack',result->'ack'))on conflict(character_id)do update set session_id=excluded.session_id,sequence=excluded.sequence,reply=excluded.reply;return result;end$$;
revoke all on function online_motion_state(uuid)from public,anon,authenticated;
revoke all on function online_dungeon_walk(jsonb)from public,anon;
grant execute on function online_dungeon_walk(jsonb)to authenticated;
notify pgrst,'reload schema';
-- Advance all nearby enemies against one in-memory JSON value, then persist once.
-- Keep the established trait/attack implementation; remove per-enemy room reads/writes.
do $$declare body text;s text;needle text;begin
select prosrc into body from pg_proc where oid='online_turn_enemy_pre_cinematic(uuid,text,uuid)'::regprocedure;
needle:='select snapshot into s from online_adventure_rooms where id=rid for update;';
if position(needle in body)=0 then raise exception 'Enemy frame read hook missing';end if;
body:=replace(body,needle,'s:=frame;');body:=replace(body,'return;','return frame;');
needle:='update online_adventure_rooms set snapshot=s||jsonb_build_object(''enemies'',es,''telegraphs'',danger)where id=rid;';
if position(needle in body)=0 then raise exception 'Enemy frame write hook missing';end if;
body:=replace(body,needle,'return s||jsonb_build_object(''enemies'',es,''telegraphs'',danger);');
execute format('create function online_enemy_step_state(rid uuid,eid text,cid uuid,frame jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as %L',body);
select pg_get_functiondef('online_adventure_tick(uuid)'::regprocedure)into s;
s:=replace(s,'oldbeat:=coalesce((e->>''attackBeat'')::int,0);perform online_turn_enemy(rid,e->>''id'',target);','oldbeat:=coalesce((e->>''attackBeat'')::int,0);s:=online_enemy_step_state(rid,e->>''id'',target,s);');
s:=replace(s,'from online_adventure_rooms q,jsonb_array_elements(q.snapshot->''enemies'')with ordinality where q.id=rid and value->>''id''=e->>''id''','from jsonb_array_elements(s->''enemies'')with ordinality where value->>''id''=e->>''id''');
s:=replace(s,'update online_adventure_rooms set snapshot=jsonb_set(snapshot,array[''enemies'',idx::text],after_e)where id=rid;','s:=jsonb_set(s,array[''enemies'',idx::text],after_e);');
s:=replace(s,'perform set_config(''online.realtime_tick'',''off'',true);perform online_adventure_tick_pre_shared_turns(rid);','update online_adventure_rooms set snapshot=s where id=rid;perform set_config(''online.realtime_tick'',''off'',true);perform online_adventure_tick_pre_shared_turns(rid);');
if position('s:=online_enemy_step_state'in s)=0 then raise exception 'Enemy frame scheduler hook missing';end if;execute s;
end$$;
revoke all on function online_enemy_step_state(uuid,text,uuid,jsonb)from public,anon,authenticated;
notify pgrst,'reload schema';
-- Reuse the first authoritative combat result instead of rebuilding the entire world a second time.
-- Refresh only state that death traits / boss transitions can change after that result.
create function online_refresh_combat_result(result jsonb,cid uuid)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare packet jsonb;actors jsonb;begin
if result is null then raise exception 'Combat result missing';end if;packet:=online_motion_state(cid);
select coalesce(jsonb_agg(p||jsonb_build_object('x',a->'x','y',a->'y','dir',a->'dir','railTrip',a->'railTrip')),'[]')into actors from jsonb_array_elements(result->'players')p join jsonb_array_elements(packet->'positions')a on p->>'character_id'=a->>'character_id';
result:=jsonb_set(result,'{players}',actors);result:=jsonb_set(result,'{active}',result->'active'||jsonb_build_object('hp',packet->'hp','skillStepsRemaining',packet->'skillStepsRemaining','timeStopTurns',packet->'timeStopTurns'));
result:=jsonb_set(result,'{adventure}',result->'adventure'||jsonb_build_object('x',packet->'x','y',packet->'y','snapshot',packet->'snapshot'));
return result||jsonb_build_object('trainingHits',packet#>'{snapshot,events}','messages',packet#>'{snapshot,messages}','serverTime',packet->'serverTime');end$$;
do $$declare s text;needle text;pos int;begin
select pg_get_functiondef('online_world_pre_railway(text,jsonb)'::regprocedure)into s;
needle:='perform online_adventure_tick(m.room_id);return online_world_pre_target_turns(''poll'',''{}'');';
if position(needle in s)=0 then raise exception 'Combat final refresh hook missing';end if;
pos:=length(s)-position(reverse(needle)in reverse(s))-length(needle)+2;
s:=substring(s,1,pos-1)||'perform online_adventure_tick(m.room_id);return online_refresh_combat_result(result,c.id);'||substring(s,pos+length(needle));execute s;end$$;
revoke all on function online_refresh_combat_result(jsonb,uuid)from public,anon,authenticated;
notify pgrst,'reload schema';
-- Cache the immutable floor config once per simulation tick / movement batch.
-- The generated helpers are copies of the established collision/LOS rules with a config argument.
do $$declare body text;s text;begin
select prosrc into body from pg_proc where oid='online_adventure_blocked_pre_cinematic(integer,integer,integer,jsonb)'::regprocedure;
if position('select data into cfg from online_adventure_config where id=''floor1'';'in body)=0 then raise exception 'Collision config hook missing';end if;
body:=replace(body,'select data into cfg from online_adventure_config where id=''floor1'';','cfg:=frame_cfg;');
body:=replace(body,'begin','begin if f=1 and exists(select 1 from jsonb_array_elements(coalesce(s->''brokenFloors'',''[]''))b where(b->>''x'')::int=px and(b->>''y'')::int=py)then return true;end if;');
execute format('create function online_frame_blocked(px int,py int,f int,s jsonb,frame_cfg jsonb)returns boolean language plpgsql security definer set search_path=public,pg_temp as %L',body);
select prosrc into body from pg_proc where oid='online_turn_los(integer,integer,integer,integer,jsonb)'::regprocedure;
body:=replace(body,'select data into cfg from online_adventure_config where id=''floor1'';','cfg:=frame_cfg;');
execute format('create function online_frame_los(ax int,ay int,bx int,by int,s jsonb,frame_cfg jsonb)returns boolean language plpgsql security definer set search_path=public,pg_temp as %L',body);
select prosrc into body from pg_proc where oid='online_enemy_step_state(uuid,text,uuid,jsonb)'::regprocedure;
body:=replace(body,'select data into cfg from online_adventure_config where id=''floor1'';','cfg:=frame_cfg;');
body:=replace(body,'online_turn_los(nx,ny,m.x,m.y,s)','online_frame_los(nx,ny,m.x,m.y,s,frame_cfg)');
body:=replace(body,'online_adventure_blocked(nx+dx,ny+dy,1,s)','online_frame_blocked(nx+dx,ny+dy,1,s,frame_cfg)');
body:=replace(body,'online_adventure_blocked(m.x+dx,m.y,1,s)','online_frame_blocked(m.x+dx,m.y,1,s,frame_cfg)');
body:=replace(body,'online_adventure_blocked(m.x,m.y+dx,1,s)','online_frame_blocked(m.x,m.y+dx,1,s,frame_cfg)');
execute format('create function online_enemy_step_cached(rid uuid,eid text,cid uuid,frame jsonb,frame_cfg jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as %L',body);
select pg_get_functiondef('online_adventure_tick(uuid)'::regprocedure)into s;
s:=replace(s,'declare r online_adventure_rooms;','declare cfg jsonb;r online_adventure_rooms;');
s:=replace(s,'perform set_config(''online.realtime_tick'',''on'',true);','select data into cfg from online_adventure_config where id=''floor1'';perform set_config(''online.realtime_tick'',''on'',true);');
s:=replace(s,'s:=online_enemy_step_state(rid,e->>''id'',target,s);','s:=online_enemy_step_cached(rid,e->>''id'',target,s,cfg);');execute s;
select pg_get_functiondef('online_dungeon_walk(jsonb)'::regprocedure)into s;s:=replace(s,'online_adventure_blocked(nx,ny,m.floor,s)','online_frame_blocked(nx,ny,m.floor,s,cfg)');execute s;
end$$;
revoke all on function online_frame_blocked(int,int,int,jsonb,jsonb),online_frame_los(int,int,int,int,jsonb,jsonb),online_enemy_step_cached(uuid,text,uuid,jsonb,jsonb)from public,anon,authenticated;
notify pgrst,'reload schema';
