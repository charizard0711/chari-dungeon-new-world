begin;
create table public.online_boss_rounds(room_id uuid primary key references public.online_adventure_rooms(id)on delete cascade,number int not null default 1,deadline bigint not null);
create table public.online_boss_intents(room_id uuid references public.online_adventure_rooms(id)on delete cascade,character_id uuid references public.online_characters(id)on delete cascade,action text not null check(action in('move','attack','skill','wait')),payload jsonb not null,primary key(room_id,character_id));
alter table public.online_boss_rounds enable row level security;alter table public.online_boss_intents enable row level security;revoke all on public.online_boss_rounds,public.online_boss_intents from public,anon,authenticated;
create function public.online_in_boss_room(px int,py int)returns boolean language sql immutable as $$select px between 106 and 124 and py between 18 and 41$$;
revoke all on function public.online_in_boss_room(int,int)from public,anon,authenticated;
-- The existing real-time simulation keeps all encounters outside the boss arena.
alter function public.online_adventure_tick(uuid)rename to online_adventure_tick_realtime;
do $$declare source text;begin
 select pg_get_functiondef('public.online_adventure_tick_realtime(uuid)'::regprocedure)into source;
 source:=replace(source,'if (enemy->>''hp'')::int<=0 then continue;end if;','if (enemy->>''hp'')::int<=0 or public.online_in_boss_room((enemy->>''x'')::int,(enemy->>''y'')::int) then continue;end if;');
 source:=replace(source,'if not exists(select 1 from jsonb_array_elements(enemies) alive', 'if tele->>''mode''=''turn'' then danger:=danger||jsonb_build_array(tele);continue;end if; if public.online_in_boss_room(coalesce((tele->''tiles''->0->>''x'')::int,-1),coalesce((tele->''tiles''->0->>''y'')::int,-1)) then continue;end if; if not exists(select 1 from jsonb_array_elements(enemies) alive');
 execute source;
end$$;
revoke all on function public.online_adventure_tick_realtime(uuid)from public,anon,authenticated;
alter function public.online_world(text,jsonb)rename to online_world_pre_turns;
revoke all on function public.online_world_pre_turns(text,jsonb)from public,anon,authenticated;
create function public.online_boss_actor_action(actor uuid,act text,data jsonb)returns void language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare old_sub text:=current_setting('request.jwt.claim.sub',true);old_claims text:=current_setting('request.jwt.claims',true);claims jsonb;
begin
 claims:=coalesce(nullif(old_claims,''),'{}')::jsonb;perform set_config('request.jwt.claim.sub',actor::text,true);perform set_config('request.jwt.claims',(claims||jsonb_build_object('sub',actor,'is_anonymous',false))::text,true);
 begin perform public.online_world_pre_turns(act,data);exception when others then null;end;
 perform set_config('request.jwt.claim.sub',coalesce(old_sub,''),true);perform set_config('request.jwt.claims',coalesce(old_claims,''),true);
end$$;
revoke all on function public.online_boss_actor_action(uuid,text,jsonb)from public,anon,authenticated;
create function public.online_adventure_tick(rid uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare r public.online_adventure_rooms;b public.online_boss_rounds;s jsonb;enemies jsonb;e jsonb;t jsonb;danger jsonb:='[]';pending record;m record;now_ms bigint:=public.online_adventure_now_ms();i int;nx int;ny int;dx int;dy int;dist int;tiles jsonb;dead record;spawn jsonb;valid_moves jsonb;changed boolean;v jsonb;target record;
begin
 /* death_cue_v1 retained for turn-based respawns */
 if current_setting('online.resolving_boss',true)='on'then return;end if;
 perform pg_advisory_xact_lock(hashtextextended('online-room:'||rid::text,0));
 perform public.online_adventure_tick_realtime(rid);
 select * into r from online_adventure_rooms where id=rid for update;if r.id is null then return;end if;s:=r.snapshot;
 if r.status<>'active'or not exists(select 1 from jsonb_array_elements(s->'enemies') e where(e->>'boss')::boolean and(e->>'hp')::int>0)or not exists(select 1 from online_adventure_members a join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.finished_at is null and a.floor=1 and p.location='dungeon'and p.seen_at>clock_timestamp()-interval '3 seconds'and public.online_in_boss_room(a.x,a.y))then
  delete from online_boss_rounds where room_id=rid;delete from online_boss_intents where room_id=rid;update online_adventure_rooms set snapshot=s-'turn'where id=rid;return;
 end if;
 insert into online_boss_rounds(room_id,deadline)values(rid,now_ms+1200)on conflict do nothing;select * into b from online_boss_rounds where room_id=rid;
 if now_ms<b.deadline then update online_adventure_rooms set snapshot=s||jsonb_build_object('turn',jsonb_build_object('number',b.number,'deadline',b.deadline,'durationMs',1200))where id=rid;return;end if;
 -- Resolve one round only; never catch up after network pauses or offline rooms.
 perform set_config('online.resolving_boss','on',true);
 delete from online_boss_intents q where q.room_id=rid and not exists(select 1 from online_adventure_members a join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.character_id=q.character_id and a.finished_at is null and a.floor=1 and p.location='dungeon'and p.seen_at>clock_timestamp()-interval '3 seconds'and public.online_in_boss_room(a.x,a.y));
 select coalesce(jsonb_agg(jsonb_build_object('id',q.character_id,'x',(q.payload->>'x')::int,'y',(q.payload->>'y')::int)),'[]')into valid_moves from online_boss_intents q join online_adventure_members a on a.character_id=q.character_id and a.room_id=rid where q.room_id=rid and q.action='move'and abs(a.x-(q.payload->>'x')::int)+abs(a.y-(q.payload->>'y')::int)=1 and not public.online_adventure_blocked((q.payload->>'x')::int,(q.payload->>'y')::int,1,s)and not exists(select 1 from jsonb_array_elements(s->'enemies') e where(e->>'hp')::int>0 and(e->>'x')::int=(q.payload->>'x')::int and(e->>'y')::int=(q.payload->>'y')::int);
 -- Vacating chains and swaps succeed together. A stationary player still blocks.
 loop changed:=false;for v in select jsonb_array_elements(valid_moves)loop
  if exists(select 1 from online_adventure_members a join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.character_id<>(v->>'id')::uuid and a.floor=1 and p.location='dungeon'and p.seen_at>clock_timestamp()-interval '3 seconds'and a.x=(v->>'x')::int and a.y=(v->>'y')::int and not exists(select 1 from jsonb_array_elements(valid_moves)other where other->>'id'=a.character_id::text))then select coalesce(jsonb_agg(value),'[]')into valid_moves from jsonb_array_elements(valid_moves)where value->>'id'<>v->>'id';changed:=true;exit;end if;
 end loop;exit when not changed;end loop;
 for v in select jsonb_array_elements(valid_moves)loop
  update online_adventure_members set dir=case when(v->>'x')::int>x then'right'when(v->>'x')::int<x then'left'when(v->>'y')::int>y then'down'else'up'end,x=(v->>'x')::int,y=(v->>'y')::int where room_id=rid and character_id=(v->>'id')::uuid;
  update online_characters set skill_steps_remaining=greatest(0,skill_steps_remaining-1)where id=(v->>'id')::uuid;
 end loop;
 for pending in select q.*,c.user_id from online_boss_intents q join online_characters c on c.id=q.character_id where q.room_id=rid and q.action<>'move' order by q.character_id loop perform public.online_boss_actor_action(pending.user_id,pending.action,pending.payload);end loop;
 select * into r from online_adventure_rooms where id=rid;s:=r.snapshot;enemies:=s->'enemies';
 if r.status='active'then
  -- Damage checks use positions AFTER all player moves. Telegraph tiles never chase players.
  for t in select jsonb_array_elements(s->'telegraphs')loop
   if t->>'mode'<>'turn'or t->>'mode'is null then danger:=danger||jsonb_build_array(t);continue;end if;
   if not exists(select 1 from jsonb_array_elements(enemies)e where e->>'id'=t->>'source'and(e->>'hp')::int>0)then continue;end if;
   if(t->>'remaining')::int>1 then danger:=danger||jsonb_build_array(t||jsonb_build_object('remaining',(t->>'remaining')::int-1));else
    for m in select a.character_id,a.x,a.y from online_adventure_members a join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.floor=1 and a.finished_at is null and p.location='dungeon'and p.seen_at>clock_timestamp()-interval '3 seconds'loop if exists(select 1 from jsonb_array_elements(t->'tiles')tile where(tile->>'x')::int=m.x and(tile->>'y')::int=m.y)then update online_characters set hp=greatest(0,hp-greatest(2,(t->>'damage')::int-public.online_adventure_defence(id)))where id=m.character_id;end if;end loop;
   end if;
  end loop;
  for i in 0..jsonb_array_length(enemies)-1 loop e:=enemies->i;if(e->>'hp')::int<=0 or not public.online_in_boss_room((e->>'x')::int,(e->>'y')::int)then continue;end if;
   nx:=(e->>'x')::int;ny:=(e->>'y')::int;select a.* into target from online_adventure_members a join online_presence p on p.character_id=a.character_id join online_characters c on c.id=a.character_id where a.room_id=rid and a.floor=1 and a.finished_at is null and p.location='dungeon'and p.seen_at>clock_timestamp()-interval '3 seconds'and c.hp>0 and public.online_in_boss_room(a.x,a.y)order by abs(a.x-nx)+abs(a.y-ny),a.character_id limit 1;
   if target.id is null then continue;end if;dist:=abs(target.x-nx)+abs(target.y-ny);
   if dist<=1 then update online_characters set hp=greatest(0,hp-greatest(1,(e->>'atk')::int-public.online_adventure_defence(id)))where id=target.character_id;e:=e||jsonb_build_object('attackBeat',coalesce((e->>'attackBeat')::int,0)+1);
   else for dx,dy in select a,b from(values(1,0),(-1,0),(0,1),(0,-1))d(a,b)order by abs(nx+a-target.x)+abs(ny+b-target.y)loop
    if not public.online_in_boss_room(nx+dx,ny+dy)or public.online_adventure_blocked(nx+dx,ny+dy,1,s)or abs(nx+dx-target.x)+abs(ny+dy-target.y)>=dist then continue;end if;
    if exists(select 1 from jsonb_array_elements(enemies)other where other->>'id'<>e->>'id'and(other->>'hp')::int>0 and(other->>'x')::int=nx+dx and(other->>'y')::int=ny+dy)or exists(select 1 from online_adventure_members a join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.floor=1 and p.location='dungeon'and p.seen_at>clock_timestamp()-interval '3 seconds'and a.x=nx+dx and a.y=ny+dy)then continue;end if;
    nx:=nx+dx;ny:=ny+dy;e:=e||jsonb_build_object('x',nx,'y',ny,'movedAt',now_ms,'moveIntervalMs',1200,'dir',case when dx>0 then'right'when dx<0 then'left'when dy>0 then'down'else'up'end);exit;
   end loop;end if;
   if coalesce((e->>'boss')::boolean,false)and b.number%4=1 and not exists(select 1 from jsonb_array_elements(danger)t where t->>'source'=e->>'id')then
    tiles:='[]';for dx in -3..3 loop if not public.online_adventure_blocked(target.x+dx,target.y,1,s)then tiles:=tiles||jsonb_build_array(jsonb_build_object('x',target.x+dx,'y',target.y));end if;if dx<>0 and not public.online_adventure_blocked(target.x,target.y+dx,1,s)then tiles:=tiles||jsonb_build_array(jsonb_build_object('x',target.x,'y',target.y+dx));end if;end loop;
    danger:=danger||jsonb_build_array(jsonb_build_object('id','turn:'||b.number,'mode','turn','source',e->>'id','name','結晶の十字撃','remaining',2,'damage',18,'tiles',tiles));
   end if;enemies:=jsonb_set(enemies,array[i::text],e);
  end loop;
  s:=s||jsonb_build_object('enemies',enemies,'telegraphs',danger);
 end if;
 select data->'spawn'into spawn from online_adventure_config where id='floor1';
 for dead in select a.* from online_adventure_members a join online_characters c on c.id=a.character_id where a.room_id=rid and a.finished_at is null and c.hp<=0 loop
  select x,y into nx,ny from generate_series((spawn->>'x')::int-3,(spawn->>'x')::int+3)gx(x)cross join generate_series((spawn->>'y')::int-3,(spawn->>'y')::int+3)gy(y)where not public.online_adventure_blocked(x,y,1,s)and not exists(select 1 from online_adventure_members a join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.character_id<>dead.character_id and p.location='dungeon'and a.x=gx.x and a.y=gy.y)order by abs(x-(spawn->>'x')::int)+abs(y-(spawn->>'y')::int),y,x limit 1;
  update online_adventure_members set x=nx,y=ny,floor=1 where id=dead.id;update online_characters set hp=50 where id=dead.character_id;s:=jsonb_set(s,'{deaths}',coalesce(s->'deaths','{}')||jsonb_build_object(dead.character_id::text,coalesce((s#>>array['deaths',dead.character_id::text])::int,0)+1));
 end loop;
 update online_boss_rounds set number=number+1,deadline=now_ms+1200 where room_id=rid;delete from online_boss_intents where room_id=rid;
 s:=s||jsonb_build_object('turn',jsonb_build_object('number',b.number+1,'deadline',now_ms+1200,'durationMs',1200));update online_adventure_rooms set snapshot=s where id=rid;
 perform set_config('online.resolving_boss','off',true);
end$$;
revoke all on function public.online_adventure_tick(uuid)from public,anon,authenticated;
create function public.online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare uid uuid:=auth.uid();c uuid;m public.online_adventure_members;p public.online_presence;r public.online_adventure_rooms;result jsonb;nx int;ny int;queued boolean:=false;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)then raise exception 'ログインしてください。';end if;/* poll_contention_v1 */ if action not in ('poll','list') then perform pg_advisory_xact_lock(71390119); end if;
 select * into p from online_presence where user_id=uid;c:=p.character_id;select * into m from online_adventure_members where character_id=c and finished_at is null;
 if p.location='dungeon'and m.floor=1 and public.online_in_boss_room(m.x,m.y)and action in('move','attack','skill','wait')then
  perform public.online_adventure_tick(m.room_id);select * into r from online_adventure_rooms where id=m.room_id;select * into m from online_adventure_members where id=m.id;
  if r.status='active'and public.online_in_boss_room(m.x,m.y)and exists(select 1 from online_boss_rounds where room_id=m.room_id)then
   if action='move'then nx:=(payload->>'x')::int;ny:=(payload->>'y')::int;if nx is not null and ny is not null and abs(nx-m.x)+abs(ny-m.y)<>1 then return public.online_world_pre_turns('poll','{}');end if;if nx is null or ny is null or public.online_adventure_blocked(nx,ny,1,r.snapshot)or exists(select 1 from jsonb_array_elements(r.snapshot->'enemies')e where(e->>'hp')::int>0 and(e->>'x')::int=nx and(e->>'y')::int=ny)then raise exception 'その移動先は選べません。';end if;
    if exists(select 1 from online_boss_intents q where q.room_id=m.room_id and q.character_id<>c and q.action='move'and(q.payload->>'x')::int=nx and(q.payload->>'y')::int=ny)then raise exception '味方がその移動先を選んでいます。';end if;
   elsif action in('attack','skill')and coalesce(payload->>'dir','')not in('up','down','left','right')then raise exception '攻撃方向を選んでください。';end if;
   insert into online_boss_intents values(m.room_id,c,action,payload)on conflict(room_id,character_id)do update set action=excluded.action,payload=excluded.payload;queued:=true;
  end if;
 end if;
 result:=public.online_world_pre_turns(case when queued then'poll'else action end,case when queued then'{}'::jsonb else payload end);
 if result->'adventure'->>'inside'='true'then result:=jsonb_set(result,'{adventure}',(result->'adventure')||jsonb_build_object('intent',(select jsonb_build_object('action',q.action,'payload',q.payload)from online_boss_intents q where q.room_id=m.room_id and q.character_id=c),'intents',coalesce((select jsonb_agg(jsonb_build_object('characterId',q.character_id,'action',q.action,'payload',q.payload))from online_boss_intents q where q.room_id=m.room_id),'[]')));end if;
 return result;
end$$;
revoke all on function public.online_world(text,jsonb)from public,anon;grant execute on function public.online_world(text,jsonb)to authenticated;
do $$declare fn record;source text;needle text:='if action not in (''poll'',''list'') then perform pg_advisory_xact_lock(71390119); end if;';begin
 for fn in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname like 'online_world%'loop
 source:=pg_get_functiondef(fn.oid);if position(needle in source)>0 and position('boss_internal_lock_v1' in source)=0 then source:=replace(source,needle,'/* boss_internal_lock_v1 */ if current_setting(''online.resolving_boss'',true) is distinct from ''on'' then '||needle||' end if;');execute source;end if;end loop;end$$;
notify pgrst,'reload schema';commit;
