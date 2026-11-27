begin;
-- Keep the authoritative repair path, but bypass rebuilding healthy inventories on every heartbeat.
do $$
begin
 execute replace(pg_get_functiondef('public.online_sync_instances(uuid)'::regprocedure),
  'public.online_sync_instances(', 'public.online_rebuild_instances(');
end$$;
create or replace function public.online_sync_instances(cid uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare c online_characters; slots constant text[]:=array['weapon','armor','shield','necklace','boots','gloves'];
begin
 select * into c from online_characters where id=cid;
 if not found then return;end if;
 if jsonb_array_length(c.quick_slots)=20 and not exists(
  select 1 from unnest(slots) as slot(s)
  where jsonb_path_query_array(c.instances->slot.s,'$[*].key') is distinct from coalesce(c.equipment->slot.s,'[]')
  or (coalesce((c.gear->>slot.s)::boolean,false) and not exists(
   select 1 from jsonb_array_elements(c.instances->slot.s) item
   where item->>'id'=c.gear->>(slot.s||'_instance_id')
     and ((item->>'max')::int=0 or (item->>'dur')::int>0)
  ))
 ) and not exists(
  select 1 from unnest(slots) as slot(s)
  cross join lateral jsonb_array_elements(c.instances->slot.s) item
  left join online_catalog cat on cat.key=online_gear_catalog_key(slot.s,item->>'key')
  where item->>'id' is null or (item->>'max')::int is distinct from coalesce(cat.dur_max,0)
     or coalesce((item->>'dur')::int,-1) not between 0 and coalesce(cat.dur_max,0)
 ) and not exists(
  select 1 from unnest(slots) as slot(s) cross join lateral jsonb_array_elements(c.instances->slot.s) item
  group by slot.s,item->>'id' having count(*)>1
 ) and not exists(
  select 1 from jsonb_array_elements(c.quick_slots) ref where ref<>'null' and not coalesce(case
   when ref->>'category'='emote' then (ref->>'key') in('morning','hello','evening','thanks','please','goodjob','sorry','yes','wait','go','nice','bye')
   when ref->>'category'='item' then coalesce((c.inventory->>(ref->>'key'))::int,0)>0
   when (ref->>'category')=any(slots) then exists(
    select 1 from jsonb_array_elements(c.instances->(ref->>'category')) item
    where item->>'id'=ref->>'instanceId' and item->>'key'=ref->>'key')
   else false end,false)
 ) and c.hp<=online_equipment_hp(c.gear) then return;end if;
 perform online_rebuild_instances(cid);
end$$;
revoke all on function public.online_sync_instances(uuid),public.online_rebuild_instances(uuid) from public,anon,authenticated;

do $$
declare definition text; initial_serialization text:='result:=public.online_world_core(''list'',''{}'');';
  final_serialization text:='result:=public.online_world_core(case when c.id is null or action=''leave'' then ''list'' else ''poll'' end,''{}'');';
begin
 definition:=pg_get_functiondef('public.online_world_equipment(text,jsonb)'::regprocedure);
 if strpos(definition,initial_serialization)=0 or strpos(definition,final_serialization)=0 then raise exception 'Town serialization hooks missing';end if;
 definition:=replace(definition,initial_serialization,
  'insert into public.online_profiles(user_id,name) values(uid,''冒険者'') on conflict(user_id) do nothing;');
 definition:=replace(definition,final_serialization,
  'if result is null or action not in(''poll'',''list'',''move'',''wait'',''chat'') then '||final_serialization||'end if;');
 definition:=replace(definition,
  'if c.id is not null then perform public.online_sync_instances(c.id);end if;',
  'if c.id is not null and action not in(''poll'',''list'',''move'',''wait'',''chat'') then perform public.online_sync_instances(c.id);end if;');
 execute definition;

 definition:=pg_get_functiondef('public.online_world_core(text,jsonb)'::regprocedure);
 definition:=replace(definition,
  'skill_steps_remaining=greatest(0,skill_steps_remaining-1),time_stop_turns=greatest(0,time_stop_turns-1) where id=c.id;',
  'skill_steps_remaining=greatest(0,skill_steps_remaining-1),time_stop_turns=greatest(0,time_stop_turns-1) where id=c.id and (skill_steps_remaining>0 or time_stop_turns>0);');
 execute replace(definition,'update public.online_presence set seen_at=now() where user_id=uid;',
  'update public.online_presence set seen_at=now() where user_id=uid and seen_at<now()-interval ''1 second'';');
end$$;
commit;
