-- Include the two cosmetic keys only for players already in the world response.
alter function public.online_world(text,jsonb) rename to online_world_pre_worn_gear;

create function public.online_world(action text,payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 result jsonb;
 actors jsonb;
begin
 result:=online_world_pre_worn_gear(action,payload);
 if jsonb_typeof(result->'players')='array' then
  select coalesce(jsonb_agg(actor.value||jsonb_build_object(
   'gloves',case when c.gear->>'gloves'='true' then c.gear->>'gloves_key' end,
   'boots',case when c.gear->>'boots'='true' then c.gear->>'boots_key' end
  ) order by actor.ordinality),'[]'::jsonb) into actors
  from jsonb_array_elements(result->'players') with ordinality actor
  left join online_characters c on c.id=(actor.value->>'character_id')::uuid;
  result:=jsonb_set(result,'{players}',actors);
 end if;
 return result;
end$$;

revoke all on function public.online_world_pre_worn_gear(text,jsonb) from public,anon,authenticated;
revoke all on function public.online_world(text,jsonb) from public,anon;
grant execute on function public.online_world(text,jsonb) to authenticated;
notify pgrst,'reload schema';

-- Give Vesper more time between standard attacks while retaining other enemy profiles.
do $$
declare
 definition text;
 old_assignment text:='attack_ms:=(rates->>''attackMs'')::int;';
begin
 definition:=pg_get_functiondef('public.online_adventure_tick(uuid)'::regprocedure);
 if strpos(definition,old_assignment)=0 then raise exception 'Attack cadence hook missing';end if;
 execute replace(definition,old_assignment,
  'attack_ms:=case when e->>''id''=''vesper'' then 1450 else (rates->>''attackMs'')::int end;');
end$$;
