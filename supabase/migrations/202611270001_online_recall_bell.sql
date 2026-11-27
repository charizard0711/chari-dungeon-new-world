-- Recall stays in the expedition/current floor; it never returns the character to town.
alter function public.online_world(text,jsonb)rename to online_world_pre_recall;
create function public.online_world(action text,payload jsonb default '{}')returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();p online_presence;m online_adventure_members;c online_characters;
 s jsonb;cfg jsonb;boss jsonb;spot record;sx int;sy int;quantity int;nowms bigint;result jsonb;
begin
 if action<>'use_item'or payload->>'kind'is distinct from'warp'then return online_world_pre_recall(action,payload);end if;
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)then raise exception 'ログインしてください。';end if;
 perform set_config('lock_timeout','1500ms',true);
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into p from online_presence where user_id=uid;
 select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
 if p.location is distinct from'dungeon'or m.id is null then raise exception 'リコールベルはダンジョン内で使ってください。';end if;
 perform pg_advisory_xact_lock(hashtextextended('online-room:'||m.room_id::text,0));
 select * into c from online_characters where id=p.character_id for update;
 select snapshot into s from online_adventure_rooms where id=m.room_id for update;
 quantity:=coalesce((c.inventory->>'warp')::int,0);nowms:=online_adventure_now_ms();boss:=s->'bossEncounter';
 if quantity<=0 then raise exception 'リコールベルを持っていません。';end if;
 if c.hp<=0 or m.rail_trip is not null then raise exception '今はリコールベルを使えません。';end if;
 if m.floor=1 and online_in_boss_room(m.x,m.y)and(boss->>'phase'='opening'or(boss->'smash'is not null and nowms<(boss#>>'{smash,at}')::bigint+(boss#>>'{smash,duration}')::int))then raise exception 'ボスの演出中は行動できません。';end if;
 select data into cfg from online_adventure_config where id='floor1';
 sx:=case when m.floor=1 then(cfg#>>'{spawn,x}')::int else 5 end;
 sy:=case when m.floor=1 then(cfg#>>'{spawn,y}')::int else 8 end;
 if m.x=sx and m.y=sy then return online_world_pre_recall('poll','{}');end if;
 select x,y into spot from generate_series(sx-3,sx+3)gx(x)cross join generate_series(sy-3,sy+3)gy(y)
 where abs(x-sx)+abs(y-sy)<=3 and not online_adventure_blocked(x,y,m.floor,s)
 and not exists(select 1 from online_adventure_members a join online_presence op on op.character_id=a.character_id where a.room_id=m.room_id and a.floor=m.floor and a.character_id<>c.id and a.finished_at is null and a.x=gx.x and a.y=gy.y and op.location='dungeon'and op.seen_at>clock_timestamp()-interval '30 seconds')
 and not(m.floor=1 and exists(select 1 from jsonb_array_elements(coalesce(s->'enemies','[]'))e where(e->>'hp')::int>0 and(e->>'x')::int=gx.x and(e->>'y')::int=gy.y))
 order by abs(x-sx)+abs(y-sy),y,x limit 1;
 if spot.x is null then raise exception '入口付近がふさがっています。リコールベルは消費しません。';end if;
 if spot.x=m.x and spot.y=m.y then return online_world_pre_recall('poll','{}');end if;
 update online_characters set inventory=jsonb_set(inventory,'{warp}',to_jsonb(quantity-1))where id=c.id;
 update online_adventure_members set x=spot.x,y=spot.y,dir='up'where id=m.id;
 update online_presence set dir='up',seen_at=clock_timestamp(),moved_at=clock_timestamp()where user_id=uid;
 update online_adventure_rooms set snapshot=jsonb_set(jsonb_set(snapshot,'{roots}',coalesce(snapshot->'roots','{}')-c.id::text),'{panelParalysis}',coalesce(snapshot->'panelParalysis','{}')-c.id::text)where id=m.room_id;
 if m.floor=1 then perform online_maze_sync(m.room_id);end if;
 result:=online_world_pre_recall('poll','{}');return result;
end$$;
revoke all on function public.online_world_pre_recall(text,jsonb)from public,anon,authenticated;
revoke all on function public.online_world(text,jsonb)from public,anon;
grant execute on function public.online_world(text,jsonb)to authenticated;
notify pgrst,'reload schema';
