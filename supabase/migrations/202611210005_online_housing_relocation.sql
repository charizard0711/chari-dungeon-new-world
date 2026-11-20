-- Move only occupants/loot covered by the new kiosk footprint; preserve all saves.
do $$declare p record;nx int;ny int;begin
 perform pg_advisory_xact_lock(71390119);
 for p in select user_id,x,y from public.online_presence where location='town'and public.online_town_blocked(x,y)loop
  select tile_x,tile_y into nx,ny from public.online_free_town_tile(p.x,p.y,p.user_id);
  if nx is not null then update public.online_presence set x=nx,y=ny where user_id=p.user_id;end if;
 end loop;
 for p in select id,dropped_by,x,y from public.online_ground_items where public.online_town_blocked(x,y)loop
  select tile_x,tile_y into nx,ny from public.online_free_town_tile(p.x,p.y,p.dropped_by);
  if nx is not null then update public.online_ground_items set x=nx,y=ny where id=p.id;end if;
 end loop;
end$$;
