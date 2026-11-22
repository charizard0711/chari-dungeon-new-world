-- Permanent per-character, per-floor discovery. Clients cannot write unlocks.
create table public.online_rail_unlocks(character_id uuid references public.online_characters(id) on delete cascade,floor int not null,unlocked_at timestamptz not null default now(),primary key(character_id,floor));
alter table public.online_rail_unlocks enable row level security;
revoke all on public.online_rail_unlocks from anon,authenticated;
create function public.online_unlock_boss_rail()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$begin
 if new.snapshot#>>'{bossEncounter,phase}'='battle' then
 insert into online_rail_unlocks(character_id,floor)
 select c.id,1 from online_characters c where coalesce(new.snapshot#>'{bossEncounter,participants}','[]')?c.id::text
 on conflict do nothing;
 end if;return new;
end$$;
create trigger online_boss_rail_unlock after insert or update of snapshot on public.online_adventure_rooms for each row execute function public.online_unlock_boss_rail();
-- Existing recorded participants are eligible as well; opening alone is insufficient.
insert into online_rail_unlocks(character_id,floor)
select distinct c.id,1 from online_adventure_rooms r join online_characters c on coalesce(r.snapshot#>'{bossEncounter,participants}','[]')?c.id::text
where r.snapshot#>>'{bossEncounter,phase}' in('battle','returning','cleared') on conflict do nothing;
alter function public.online_world(text,jsonb) rename to online_world_pre_railway;
create function public.online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare p online_presence;m online_adventure_members;r online_adventure_rooms;result jsonb;cid uuid;sx int;sy int;dx int;dy int;spot record;begin
 if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'ログインしてください。';end if;
 if action='interact' and payload->>'id' in('rail_entry','rail_boss') then
 perform pg_advisory_xact_lock(71390119);
 select * into p from online_presence where user_id=auth.uid();
 select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
 if p.location is distinct from 'dungeon' or m.id is null or m.floor<>1 then raise exception '第1層の駅から利用してください。';end if;
 perform pg_advisory_xact_lock(hashtextextended('online-room:'||m.room_id::text,0));
 select * into r from online_adventure_rooms where id=m.room_id for update;
 if not exists(select 1 from online_rail_unlocks where character_id=m.character_id and floor=1)then raise exception '一度フロアボスとの戦闘に参加すると改札が解放されます。';end if;
 if payload->>'id'='rail_entry' then sx:=49;sy:=80;dx:=52;dy:=26;else sx:=53;sy:=26;dx:=49;dy:=79;end if;
 if abs(m.x-sx)+abs(m.y-sy)>2 then raise exception '改札の近くで操作してください。';end if;
 if (select hp from online_characters where id=m.character_id)<=0 then raise exception '復活後に利用してください。';end if;
 if online_in_boss_room(m.x,m.y)and r.snapshot#>>'{bossEncounter,phase}' in('opening','battle','returning')then raise exception 'ボス戦中は脱出できません。';end if;
 if m.attack_at>clock_timestamp()-interval '2 seconds' then raise exception '攻撃が終わってから乗車してください。';end if;
 select cx as x,cy as y into spot from generate_series(dx-1,dx+1)gx(cx) cross join generate_series(dy-1,dy+1)gy(cy)
 where not online_adventure_blocked(cx,cy,1,r.snapshot)
 and not exists(select 1 from online_adventure_members a join online_presence op on op.character_id=a.character_id where a.room_id=m.room_id and a.floor=1 and a.finished_at is null and a.character_id<>m.character_id and a.x=cx and a.y=cy and op.location='dungeon' and op.seen_at>clock_timestamp()-interval '30 seconds')
 and not exists(select 1 from jsonb_array_elements(r.snapshot->'enemies')e where(e->>'hp')::int>0 and(e->>'x')::int=cx and(e->>'y')::int=cy)
 order by abs(cx-dx)+abs(cy-dy),cy,cx limit 1;
 if spot.x is null then raise exception '到着ホームが混雑しています。少し待ってください。';end if;
 update online_adventure_members set x=spot.x,y=spot.y,attack_at=clock_timestamp() where id=m.id;
 update online_presence set dir='up',moved_at=clock_timestamp(),seen_at=clock_timestamp() where user_id=auth.uid();
 result:=online_world_pre_railway('poll','{}');
 else result:=online_world_pre_railway(action,payload);end if;
 cid:=nullif(result#>>'{active,id}','')::uuid;
 if result->'adventure' is not null and result->'adventure'<>'null'::jsonb then
 result:=jsonb_set(result,'{adventure,railUnlocked}',to_jsonb(exists(select 1 from online_rail_unlocks where character_id=cid and floor=1)));
 end if;return result;
end$$;
revoke all on function public.online_unlock_boss_rail(),public.online_world_pre_railway(text,jsonb) from public,anon,authenticated;
revoke all on function public.online_world(text,jsonb) from public,anon;
grant execute on function public.online_world(text,jsonb) to authenticated;
