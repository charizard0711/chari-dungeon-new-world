begin;
-- Acquire shared-resource locks in one order; ordinary dungeon actions never join the global town economy lock.
create function public.online_lock_action(a text)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();rid uuid;local_action boolean;begin
 select m.room_id into rid from online_presence p join online_adventure_members m on m.character_id=p.character_id and m.finished_at is null where p.user_id=uid and p.location='dungeon';
 local_action:=rid is not null and a in('move','attack','skill','wait','use_item','chat','poll','list','map_pin');
 if a not in('poll','list')and not local_action then perform pg_advisory_xact_lock(71390119);end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if rid is not null then perform pg_advisory_xact_lock(hashtextextended('online-room:'||rid::text,0));end if;
end$$;
revoke all on function public.online_lock_action(text)from public,anon,authenticated;
do $$declare f record;s text;begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'and p.proname like 'online_world%'and p.prokind='f'loop
 s:=pg_get_functiondef(f.oid);if position('perform pg_advisory_xact_lock(71390119);'in s)>0 then s:=replace(s,'perform pg_advisory_xact_lock(71390119);','perform public.online_lock_action(action);');execute s;end if;
 end loop;
end$$;
-- Tick currently writes the same large JSON on every poll even when no deaths occurred.
do $$declare s text;begin
 select pg_get_functiondef('public.online_adventure_tick(uuid)'::regprocedure)into s;
 s:=replace(s,'update online_adventure_rooms set snapshot=s-''turn'',pending_step_at=null where id=rid;','update online_adventure_rooms set snapshot=s-''turn'',pending_step_at=null where id=rid and (snapshot is distinct from s-''turn'' or pending_step_at is not null);');execute s;
end$$;
-- Only nearby enemies in the actor's area participate in a turn; arena targets never cross the boss boundary.
do $$declare s text;begin
 select pg_get_functiondef('public.online_world_pre_railway(text,jsonb)'::regprocedure)into s;
 if position('for e in select jsonb_array_elements(s->''enemies'')loop'in s)>0 then
 s:=replace(s,'for e in select jsonb_array_elements(s->''enemies'')loop','for e in select value from jsonb_array_elements(s->''enemies'') where abs((value->>''x'')::int-m.x)+abs((value->>''y'')::int-m.y)<=9 and online_in_boss_room((value->>''x'')::int,(value->>''y'')::int)=online_in_boss_room(m.x,m.y) loop');execute s; else raise exception 'Expected target turn loop missing';end if;
 select pg_get_functiondef('public.online_turn_target(uuid,jsonb)'::regprocedure)into s;
 s:=replace(s,'and a.floor=1','and a.floor=1 and online_in_boss_room(a.x,a.y)=online_in_boss_room((e->>''x'')::int,(e->>''y'')::int)');execute s;
end$$;
create table public.online_map_pins(character_id uuid not null references online_characters(id)on delete cascade,scope text not null check(scope in('party','room')),group_id uuid not null,floor int not null,x int not null,y int not null,created_at timestamptz not null default clock_timestamp(),primary key(character_id,scope));
create index on public.online_map_pins(scope,group_id,created_at);
alter table public.online_map_pins enable row level security;
revoke all on public.online_map_pins from public,anon,authenticated;
alter function public.online_world(text,jsonb)rename to online_world_pre_latency;
revoke all on function public.online_world_pre_latency(text,jsonb)from public,anon,authenticated;
create function public.online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare uid uuid:=auth.uid();p online_presence;m online_adventure_members;pid uuid;gid uuid;scope text;result jsonb;px int;py int;begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)then raise exception 'ログインしてください。';end if;
 perform online_lock_action(action);
 select * into p from online_presence where user_id=uid;
 select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
 select party_id into pid from online_party_members where character_id=p.character_id;
 if action='map_pin'then
 scope:=payload->>'scope';px:=(payload->>'x')::int;py:=(payload->>'y')::int;
 if p.location<>'dungeon'or m.id is null then raise exception 'ダンジョン内でピンを立ててください。';end if;
 gid:=case payload->>'scope' when'party'then pid when'room'then m.room_id end;
 if gid is null then raise exception '共有先に参加していません。';end if;
 if px is null or py is null or px<0 or py<0 or px>=115 or py>=94 then raise exception 'マップの範囲を選んでください。';end if;
 if exists(select 1 from online_map_pins z where z.character_id=p.character_id and z.scope=payload->>'scope' and z.created_at>clock_timestamp()-interval '1 second')then raise exception '少し待ってからピンを立ててください。';end if;
 insert into online_map_pins(character_id,scope,group_id,floor,x,y)values(p.character_id,payload->>'scope',gid,m.floor,px,py)on conflict(character_id,scope)do update set group_id=excluded.group_id,floor=excluded.floor,x=excluded.x,y=excluded.y,created_at=clock_timestamp();
 action:='poll';payload:='{}';end if;
 result:=online_world_pre_latency(action,payload);
 result:=result||jsonb_build_object('mapPins',coalesce((select jsonb_agg(jsonb_build_object('characterId',z.character_id,'name',c.name,'scope',z.scope,'floor',z.floor,'x',z.x,'y',z.y))from online_map_pins z join online_characters c on c.id=z.character_id where z.created_at>clock_timestamp()-interval '30 seconds'and ((z.scope='room'and z.group_id=m.room_id)or(z.scope='party'and z.group_id=pid))),'[]'));
 return result;
end$$;
revoke all on function public.online_world(text,jsonb)from public,anon;grant execute on function public.online_world(text,jsonb)to authenticated;
notify pgrst,'reload schema';
commit;
