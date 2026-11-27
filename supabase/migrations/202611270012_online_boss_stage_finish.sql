-- The two visible arena lanterns occupy their base tiles for both move paths.
do $$
declare
  signature text;
  definition text;
  guard text := 'begin if f=1 and py=4 and px in (44,55) then return true;end if;';
begin
  foreach signature in array array[
    'public.online_adventure_blocked_pre_cinematic(int,int,int,jsonb)',
    'public.online_frame_blocked(int,int,int,jsonb,jsonb)'
  ] loop
    definition:=pg_get_functiondef(signature::regprocedure);
    if strpos(definition,'begin')=0 then raise exception 'Arena collision hook missing: %',signature;end if;
    execute regexp_replace(definition,'\mbegin\M',guard);
  end loop;
end$$;

-- Clear the doorway path and keep the same chest ID for all saved rooms.
update public.online_adventure_config cfg
set data=jsonb_set(data,'{props}',(
 select jsonb_agg(case when p.value->>'id'='maze_chest_35' then p.value||'{"x":53}'::jsonb else p.value end order by p.ordinality)
 from jsonb_array_elements(cfg.data->'props') with ordinality p
))
where id='floor1';

-- Keep the original clear timestamp so every client can time the same ending.
do $$
declare
  definition text:=pg_get_functiondef('public.online_maze_sync_pre_cinematic(uuid)'::regprocedure);
  hook text:='jsonb_build_object(''phase'',''cleared'',''at'',now_ms)';
begin
  if strpos(definition,hook)=0 then raise exception 'Arena clear clock hook missing';end if;
  execute replace(definition,hook,
    'case when phase=''cleared'' then s->''bossEncounter'' else jsonb_build_object(''phase'',''cleared'',''at'',now_ms) end');
end$$;

-- The opening stab uses the same authoritative broken-floor list as the later attacks.
do $$
declare
  definition text:=pg_get_functiondef('public.online_maze_sync_pre_panels(uuid)'::regprocedure);
  hook text:='if boss->>''phase''=''waiting''then';
begin
  if strpos(definition,hook)=0 then raise exception 'Opening floor hook missing';end if;
  execute replace(definition,hook,$body$
  if (boss->>'phase'='opening' and nowms>=(boss->>'at')::bigint+9670
      or boss->>'phase'='battle' and coalesce((boss->>'smashCount')::int,0)=0)
      and not coalesce(s->'brokenFloors','[]') @> '[{"x":50,"y":11}]'::jsonb then
    s:=s||jsonb_build_object('brokenFloors',coalesce(s->'brokenFloors','[]')||'[{"x":50,"y":11}]'::jsonb);
  end if;
  if boss->>'phase'='waiting'then$body$);
end$$;
