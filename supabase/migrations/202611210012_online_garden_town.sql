begin;
select pg_advisory_xact_lock(71390119);
-- Generated from gardenMap.ts and plaza footprints; never change saved ownership/interiors.
create or replace function public.online_town_blocked(x int,y int)returns boolean language sql immutable security definer set search_path=public,pg_temp as $$
 select case when x<-24 or x>48 or y<-23 or y>41 then true else
 substring((array['###################################...###################################',
'#.##############################........##############################..#',
'#.#........##........##........#........#........##........##........#..#',
'#.##......####......####......##........##......####......####......##..#',
'###.#########........##........#........#........##........##.########.##',
'#.#.#########........##..#.....#........#..#.....##........##.########..#',
'#.############.#########......##........##......####.##################.#',
'###.#########..#####.##......#.#........#......#.##..#####.##.########.##',
'#.#.#########..#####.##...###..#........#...###..##..#####.##.########..#',
'#.############.#########..###.##........##..###.####.#################..#',
'###.#########..#####.##...###..#........#...###..##..#####.##.########.##',
'#.##......####......####......##........##......####......####......##..#',
'#.##.#....####.#....####.#....##........##.#....####.#....####.#....##..#',
'###.##...#.##.##...#.##.##...#.#........#.##...#.##.##...#.##.##...#.#.##',
'#.#####.#########.#########.####........#####.#########.#########.####..#',
'#.......................................................................#',
'###...................................................................###',
'#......#...........#...........#.........#...........#...........#......#',
'#.......................................................................#',
'##..#....#....##.#....................................#.#.#....#....#..##',
'#.....#....#....#.......##.##.##..........##.##.##..........#....#....#.#',
'#...#....#.#..#.#.......................................#.#..#.#....#...#',
'##..........#....#.......................................#....#........##',
'#.......................######.............######.......................#',
'#......................##########.......##########......................#',
'##..#....#....#.........#########.......#########.........#....#....#..##',
'#.....#....#...###......#########.......#########.....#.#...#....#....#.#',
'#.#.#....#.#..#.#......#..................#......#......#.#..#.#....#.#.#',
'##..........#....#..........#...#.......#...#............#....#........##',
'#.......................................................................#',
'#.......................................................................#',
'...................................###...................................',
'...........................#.......###...................................',
'...................................###...................................',
'#.......................................#...............................#',
'#........................##...................##........................#',
'#......................#.##.##.............##.##.#......................#',
'##.........#....#.......#.......#.......#.......#.......#....#.........##',
'#.#.........#..#.#....................................#.##....#.......#.#',
'#...#....#....#........##########.......##########........#....#....#...#',
'##....#....#....#.......#########.......#########...........#....#....###',
'#...#....#....#.........#########.......#########.........#....#....#...#',
'#.......................................................................#',
'##.........#....#.......##.##.##..........##.##.##......#....#.........##',
'#...........#....#.......................................#....#.........#',
'#...#..#.#....##.#.#...........#.........#...........##.#.#....#.#..#...#',
'################################........#################################',
'#.#.#....#.##.#......##........#........#........##.......###..#....##..#',
'#.##......####......####......##........##......####......####......##..#',
'###.#########........##........#........#........##........##.########.##',
'#.#.#########........##..#.....#........#..#.....##........##.#########.#',
'#.############.#########......##........##......####.#################..#',
'###.#########..#####.##......#.#........#......#.##..#####.##.########.##',
'#.#.#########..#####.##...###..#........#...###..##..#####.##.########..#',
'#.############.#########..###.##........##..###.####.#################..#',
'###.#########..#####.##...###..#........#...###..##..#####.##.########.##',
'#.##......####......####......##........##......####......####......##..#',
'#.##.#....####.#....####.#....##........##.#....####.#....####.#....##..#',
'###.##...#.##.##...#.##.##...#.#........#.##...#.##.##...#.##.##...#.#.##',
'#.#####.#########.#########.####........#####.#########.#########.####..#',
'#.#...................................................................#.#',
'#.......................................................................#',
'#.......................................................................#',
'#...#..#..#..#..#..#..#..#..#..#...........#..#..#..#..#..#..#..#..#....#',
'###################################...###################################'])[y-(-23)+1] from x-(-24)+1 for 1)='#' end;
$$;
revoke all on function public.online_town_blocked(int,int) from public,anon,authenticated;
update public.online_house_catalog set data=data||'{"x":2,"y":-15,"w":3,"h":3,"doorX":3,"doorY":-13,"plotX":-2,"plotY":-21,"art":0}'::jsonb where id='north-1';
update public.online_house_catalog set data=data||'{"x":-9,"y":-17,"w":5,"h":5,"doorX":-7,"doorY":-13,"plotX":-12,"plotY":-21,"art":4}'::jsonb where id='north-5';
update public.online_house_catalog set data=data||'{"x":-20,"y":-19,"w":7,"h":7,"doorX":-17,"doorY":-13,"plotX":-22,"plotY":-21,"art":8}'::jsonb where id='north-9';
update public.online_house_catalog set data=data||'{"x":20,"y":-15,"w":3,"h":3,"doorX":21,"doorY":-13,"plotX":16,"plotY":-21,"art":1}'::jsonb where id='east-1';
update public.online_house_catalog set data=data||'{"x":29,"y":-17,"w":5,"h":5,"doorX":31,"doorY":-13,"plotX":26,"plotY":-21,"art":5}'::jsonb where id='east-5';
update public.online_house_catalog set data=data||'{"x":38,"y":-19,"w":7,"h":7,"doorX":41,"doorY":-13,"plotX":36,"plotY":-21,"art":9}'::jsonb where id='east-9';
update public.online_house_catalog set data=data||'{"x":20,"y":30,"w":3,"h":3,"doorX":21,"doorY":32,"plotX":16,"plotY":24,"art":3}'::jsonb where id='south-1';
update public.online_house_catalog set data=data||'{"x":29,"y":28,"w":5,"h":5,"doorX":31,"doorY":32,"plotX":26,"plotY":24,"art":7}'::jsonb where id='south-5';
update public.online_house_catalog set data=data||'{"x":38,"y":26,"w":7,"h":7,"doorX":41,"doorY":32,"plotX":36,"plotY":24,"art":11}'::jsonb where id='south-9';
update public.online_house_catalog set data=data||'{"x":2,"y":30,"w":3,"h":3,"doorX":3,"doorY":32,"plotX":-2,"plotY":24,"art":2}'::jsonb where id='west-1';
update public.online_house_catalog set data=data||'{"x":-9,"y":28,"w":5,"h":5,"doorX":-7,"doorY":32,"plotX":-12,"plotY":24,"art":6}'::jsonb where id='west-5';
update public.online_house_catalog set data=data||'{"x":-20,"y":26,"w":7,"h":7,"doorX":-17,"doorY":32,"plotX":-22,"plotY":24,"art":10}'::jsonb where id='west-9';
do $patch$ declare definition text;begin
select pg_get_functiondef(oid)into strict definition from pg_proc where pronamespace='public'::regnamespace and proname='online_attack_tiles';
if position('nx=12 and ny=5' in definition)=0 then raise exception 'Missing expected layout guard in online_attack_tiles';end if;
definition:=replace(definition,'nx=12 and ny=5','nx=22 and ny=13');
execute definition;end $patch$;
do $patch$ declare definition text;begin
select pg_get_functiondef(oid)into strict definition from pg_proc where pronamespace='public'::regnamespace and proname='online_world_core';
if position('tile_x=12 and tile_y=5' in definition)=0 then raise exception 'Missing expected layout guard in online_world_core';end if;
definition:=replace(definition,'tile_x=12 and tile_y=5','tile_x=22 and tile_y=13');
if position('dx:=12-r.x;dy:=5-r.y' in definition)=0 then raise exception 'Missing expected layout guard in online_world_core';end if;
definition:=replace(definition,'dx:=12-r.x;dy:=5-r.y','dx:=22-r.x;dy:=13-r.y');
execute definition;end $patch$;
do $patch$ declare definition text;begin
select pg_get_functiondef(oid)into strict definition from pg_proc where pronamespace='public'::regnamespace and proname='online_world_equipment';
if position('abs(r.x-18)+abs(r.y-9)' in definition)=0 then raise exception 'Missing expected layout guard in online_world_equipment';end if;
definition:=replace(definition,'abs(r.x-18)+abs(r.y-9)','abs(r.x-18)+abs(r.y-4)');
if position('abs(r.x-7)+abs(r.y-9)' in definition)=0 then raise exception 'Missing expected layout guard in online_world_equipment';end if;
definition:=replace(definition,'abs(r.x-7)+abs(r.y-9)','abs(r.x-2)+abs(r.y-13)');
execute definition;end $patch$;
do $patch$ declare definition text;begin
select pg_get_functiondef(oid)into strict definition from pg_proc where pronamespace='public'::regnamespace and proname='online_world_pre_gardens';
if position('abs(p.x-16)+abs(p.y-2)' in definition)=0 then raise exception 'Missing expected layout guard in online_world_pre_gardens';end if;
definition:=replace(definition,'abs(p.x-16)+abs(p.y-2)','abs(p.x-7)+abs(p.y-3)');
execute definition;end $patch$;
do $patch$ declare definition text;begin
select pg_get_functiondef(oid)into strict definition from pg_proc where pronamespace='public'::regnamespace and proname='online_world_pre_guild_flags';
if position('abs(p.x-16)+abs(p.y-2)' in definition)=0 then raise exception 'Missing expected layout guard in online_world_pre_guild_flags';end if;
definition:=replace(definition,'abs(p.x-16)+abs(p.y-2)','abs(p.x-7)+abs(p.y-3)');
execute definition;end $patch$;
do $patch$ declare definition text;begin
select pg_get_functiondef(oid)into strict definition from pg_proc where pronamespace='public'::regnamespace and proname='online_world_pre_resale';
if position('abs(pres.x-8)+abs(pres.y-17)' in definition)=0 then raise exception 'Missing expected layout guard in online_world_pre_resale';end if;
definition:=replace(definition,'abs(pres.x-8)+abs(pres.y-17)','abs(pres.x-7)+abs(pres.y-18)');
execute definition;end $patch$;
do $patch$ declare definition text;begin
select pg_get_functiondef(oid)into strict definition from pg_proc where pronamespace='public'::regnamespace and proname='online_world_warehouse';
if position('when ''merchant'' then 9 end' in definition)=0 then raise exception 'Missing expected layout guard in online_world_warehouse';end if;
definition:=replace(definition,'when ''merchant'' then 9 end','when ''merchant'' then 4 end');
if position('abs(r.x-20)+abs(r.y-5)>2 or r.y<5' in definition)=0 then raise exception 'Missing expected layout guard in online_world_warehouse';end if;
definition:=replace(definition,'abs(r.x-20)+abs(r.y-5)>2 or r.y<5','abs(r.x-22)+abs(r.y-3)>2 or r.y<3');
if position('generate_series(6,17)' in definition)=0 then raise exception 'Missing expected layout guard in online_world_warehouse';end if;
definition:=replace(definition,'generate_series(6,17)','generate_series(4,17)');
if position('abs(x-20)+abs(y-6)' in definition)=0 then raise exception 'Missing expected layout guard in online_world_warehouse';end if;
definition:=replace(definition,'abs(x-20)+abs(y-6)','abs(x-22)+abs(y-4)');
execute definition;end $patch$;
-- Exit at the relocated home, retaining room positions and permissions.
update public.online_house_visits v set return_x=(c.data->>'doorX')::int,return_y=(c.data->>'doorY')::int+1 from public.online_house_catalog c where c.id=v.house_id;
-- Relocate only occupants/loot newly inside walls or outside the new bounds.
do $$declare p record;nx int;ny int;begin
 for p in select user_id,x,y from public.online_presence where location='town'and public.online_town_blocked(x,y)loop
  select tile_x,tile_y into nx,ny from public.online_free_town_tile(p.x,p.y,p.user_id);
  if nx is null then raise exception 'No free town tile for relocation';end if;
  update public.online_presence set x=nx,y=ny,moved_at='epoch'where user_id=p.user_id;
 end loop;
 for p in select id,dropped_by,x,y from public.online_ground_items where public.online_town_blocked(x,y)loop
  select tile_x,tile_y into nx,ny from public.online_free_town_tile(p.x,p.y,p.dropped_by);
  if nx is null then raise exception 'No free town tile for dropped item';end if;
  update public.online_ground_items set x=nx,y=ny where id=p.id;
 end loop;
end$$;
notify pgrst,'reload schema';
commit;
