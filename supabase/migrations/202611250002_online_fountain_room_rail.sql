-- Discovery belongs to this expedition, never another room with the same floor number.
create table public.online_room_rail_unlocks(
 room_id uuid references public.online_adventure_rooms(id) on delete cascade,
 character_id uuid references public.online_characters(id) on delete cascade,
 floor int not null,primary key(room_id,character_id,floor));
alter table public.online_room_rail_unlocks enable row level security;
revoke all on public.online_room_rail_unlocks from public,anon,authenticated;
create or replace function public.online_unlock_boss_rail()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$begin
 if new.snapshot#>>'{bossEncounter,phase}'='battle' then
 insert into online_room_rail_unlocks(room_id,character_id,floor)
 select new.id,c.id,1 from online_characters c where coalesce(new.snapshot#>'{bossEncounter,participants}','[]')?c.id::text
 on conflict do nothing;
 end if;return new;
end$$;
insert into online_room_rail_unlocks(room_id,character_id,floor)
select r.id,c.id,1 from online_adventure_rooms r join online_characters c on coalesce(r.snapshot#>'{bossEncounter,participants}','[]')?c.id::text
where r.snapshot#>>'{bossEncounter,phase}' in('battle','returning','cleared') on conflict do nothing;
-- Patch both authoritative gate checks and the packet flag; old global unlocks are ignored.
do $$declare f record;s text;checks int:=0;flags int:=0;begin
 for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname like 'online_world%' and prokind='f' loop
 s:=pg_get_functiondef(f.oid);
 if position('online_rail_unlocks where character_id=m.character_id and floor=1' in s)>0 then
 s:=replace(s,'online_rail_unlocks where character_id=m.character_id and floor=1','online_room_rail_unlocks where room_id=m.room_id and character_id=m.character_id and floor=m.floor');checks:=checks+1;end if;
 if position('online_rail_unlocks where character_id=cid and floor=1' in s)>0 then
 s:=replace(s,'online_rail_unlocks where character_id=cid and floor=1','online_room_rail_unlocks where room_id=(result#>>''{adventure,id}'')::uuid and character_id=cid and floor=(result#>>''{adventure,floor}'')::int');flags:=flags+1;end if;
 if s<>pg_get_functiondef(f.oid)then execute s;end if;
 end loop;
 if checks<>2 or flags<>1 then raise exception 'Rail scope hooks missing: %, %',checks,flags;end if;
end$$;
-- Reset gates that were opened using a different room's discovery.
update online_adventure_members m set rail_gates='{}'where not exists(select 1 from online_room_rail_unlocks u where u.room_id=m.room_id and u.character_id=m.character_id and u.floor=m.floor);
alter table public.online_presence add column fountain_heal_seq bigint not null default 0;
alter function public.online_world(text,jsonb)rename to online_world_pre_town_fountain;
create function public.online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare before_pos online_presence;after_pos online_presence;c online_characters;result jsonb;maximum int;token bigint;begin
 select * into before_pos from online_presence where user_id=auth.uid();
 result:=online_world_pre_town_fountain(action,payload);
 select * into after_pos from online_presence where user_id=auth.uid();
 if action='move'and before_pos.location='town'and after_pos.location='town'and before_pos.character_id=after_pos.character_id
 and(before_pos.x<>after_pos.x or before_pos.y<>after_pos.y)
 and power(after_pos.x-12,2)+power(after_pos.y-9,2)<=power(2.3,2)then
 select * into c from online_characters where id=after_pos.character_id for update;
 maximum:=case when coalesce((c.gear->>'weapon')::boolean,false)and coalesce(c.gear->>'weapon_key','')like 'star_%'then 150 else 100 end;
 if c.hp>0 and c.hp<maximum then
 update online_characters set hp=maximum where id=c.id;
 update online_presence set fountain_heal_seq=fountain_heal_seq+1 where user_id=auth.uid()returning fountain_heal_seq into token;
 result:=jsonb_set(result,'{active,hp}',to_jsonb(maximum));
 result:=jsonb_set(result,'{characters}',(select jsonb_agg(case when e->>'id'=c.id::text then jsonb_set(e,'{hp}',to_jsonb(maximum))else e end)from jsonb_array_elements(result->'characters')e));
 end if;
 end if;
 return result||jsonb_build_object('townHeal',coalesce(token,after_pos.fountain_heal_seq,0));
end$$;
revoke all on function public.online_world_pre_town_fountain(text,jsonb)from public,anon,authenticated;
revoke all on function public.online_world(text,jsonb)from public,anon;
grant execute on function public.online_world(text,jsonb)to authenticated;
