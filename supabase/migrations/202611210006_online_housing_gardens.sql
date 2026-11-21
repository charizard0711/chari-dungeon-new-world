begin;
select pg_advisory_xact_lock(71390119);
-- Never silently remove a purchased home. Resolve occupied retired lots first.
do $$begin
 if exists(select 1 from online_house_owners where split_part(house_id,'-',2) not in('1','5','9')) then
  raise exception 'A retired lot is owned: relocate its owner before applying the 12-house layout';
 end if;
end$$;
-- Retire unused lots reversibly; retain catalog and historical records.
update online_house_catalog set data=data||'{"retired":true}'::jsonb where split_part(id,'-',2) not in('1','5','9');
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.online_town_blocked(integer,integer)'::regprocedure);
 definition:=replace(definition,'from online_house_catalog where px','from online_house_catalog where not coalesce((data->>''retired'')::boolean,false) and px');
 execute definition;
end$$;
alter function public.online_town_blocked(int,int) rename to online_town_blocked_pre_gardens;
create function public.online_town_blocked(x int,y int)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select public.online_town_blocked_pre_gardens(x,y) or exists(
 select 1 from online_house_catalog c
 where not coalesce((c.data->>'retired')::boolean,false) and x between(c.data->>'x')::int-1 and(c.data->>'x')::int+(c.data->>'w')::int
 and y between(c.data->>'y')::int-1 and(c.data->>'doorY')::int+2
 and(x=(c.data->>'x')::int-1 or x=(c.data->>'x')::int+(c.data->>'w')::int or y=(c.data->>'y')::int-1
 or(y=(c.data->>'doorY')::int+2 and x<>(c.data->>'doorX')::int)));
$$;
revoke all on function public.online_town_blocked(int,int),public.online_town_blocked_pre_gardens(int,int) from public,anon,authenticated;
alter function public.online_world(text,jsonb) rename to online_world_pre_gardens;
revoke all on function public.online_world_pre_gardens(text,jsonb) from public,anon,authenticated;
create function public.online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;begin
 if action in('house_buy','house_enter') and exists(select 1 from online_house_catalog where id=payload->>'house_id' and coalesce((data->>'retired')::boolean,false))then raise exception 'この区画は販売していません。';end if;
 result:=public.online_world_pre_gardens(action,payload);
 return jsonb_set(result,'{houses}',coalesce((select jsonb_agg(h)from jsonb_array_elements(result->'houses')h where exists(select 1 from online_house_catalog c where c.id=h->>'id' and not coalesce((c.data->>'retired')::boolean,false))),'[]'));
end$$;
revoke all on function public.online_world(text,jsonb) from public,anon;
grant execute on function public.online_world(text,jsonb) to authenticated;
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

notify pgrst,'reload schema';
commit;
