begin;
alter table online_characters add column invisible_until timestamptz;
-- Invisible characters cannot be chosen for direct enemy attacks. Floor AOEs
-- remain hazards, and an attack breaks invisibility before combat is processed.
do $$declare s text;begin
 select pg_get_functiondef('online_turn_target(uuid,jsonb)'::regprocedure)into s;
 if position('c.hp>0'in s)=0 then raise exception 'Invisibility targeting hook missing';end if;
 s:=replace(s,'c.hp>0','c.hp>0 and(c.invisible_until is null or c.invisible_until<=clock_timestamp())');execute s;
 select pg_get_functiondef('online_motion_state(uuid)'::regprocedure)into s;
 s:=replace(s,'''dir'',a.dir,','''dir'',a.dir,''invisibleUntil'',(select coalesce(extract(epoch from v.invisible_until)*1000,0)::bigint from online_characters v where v.id=a.character_id),');
 s:=replace(s,'return jsonb_build_object(','return jsonb_build_object(''invisibleUntil'',coalesce(extract(epoch from c.invisible_until)*1000,0)::bigint,');execute s;
end$$;
alter function online_world(text,jsonb)rename to online_world_pre_invisibility;
create function online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p online_presence;m online_adventure_members;c online_characters;s jsonb;result jsonb;actors jsonb;stamp bigint:=online_adventure_now_ms();begin
 if auth.uid()is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)then raise exception 'ログインしてください。';end if;
 if action in('attack','skill')or(action='use_item'and payload->>'kind'='invis')then
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));select * into p from online_presence where user_id=auth.uid();
 select * into c from online_characters where id=p.character_id and user_id=auth.uid();select * into m from online_adventure_members where character_id=c.id and finished_at is null;if p.location='dungeon'and m.id is not null then perform pg_advisory_xact_lock(hashtextextended('online-room:'||m.room_id::text,0));end if;
 if action='use_item'then
 select * into m from online_adventure_members where character_id=c.id and finished_at is null;
 if p.location is distinct from'dungeon'or m.id is null or c.hp<=0 then raise exception 'ダンジョンで生存中に使えます。';end if;
 perform pg_advisory_xact_lock(hashtextextended('online-room:'||m.room_id::text,0));select snapshot into s from online_adventure_rooms where id=m.room_id for update;
 if m.rail_trip is not null or(online_in_boss_room(m.x,m.y)and(s#>>'{bossEncounter,phase}'='opening'or(s#>'{bossEncounter,smash}'is not null and stamp<(s#>>'{bossEncounter,smash,at}')::bigint+(s#>>'{bossEncounter,smash,duration}')::int)))then raise exception '今は使えません。';end if;
 if coalesce((c.inventory->>'invis')::int,0)<1 then raise exception '透明ポーションを持っていません。';end if;
 update online_characters set invisible_until=clock_timestamp()+interval '10 seconds',inventory=jsonb_set(inventory,'{invis}',to_jsonb((inventory->>'invis')::int-1))where id=c.id;
 action:='poll';payload:='{}';
 else update online_characters set invisible_until=null where id=c.id and invisible_until is not null;end if;
 end if;
 result:=online_world_pre_invisibility(action,payload);
 if result->'active'is not null and result->'active'<>'null'::jsonb then
 result:=jsonb_set(result,'{active,invisibleUntil}',(select to_jsonb(coalesce(extract(epoch from invisible_until)*1000,0)::bigint)from online_characters where id=(result#>>'{active,id}')::uuid));
 select coalesce(jsonb_agg(a||jsonb_build_object('invisibleUntil',coalesce(extract(epoch from v.invisible_until)*1000,0)::bigint)),'[]')into actors from jsonb_array_elements(result->'players')a join online_characters v on v.id=(a->>'character_id')::uuid;
 result:=jsonb_set(result,'{players}',actors);end if;return result;
end$$;
revoke all on function online_world_pre_invisibility(text,jsonb)from public,anon,authenticated;
revoke all on function online_world(text,jsonb)from public,anon;
grant execute on function online_world(text,jsonb)to authenticated;
notify pgrst,'reload schema';
commit;
