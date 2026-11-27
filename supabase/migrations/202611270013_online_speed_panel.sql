create function public.online_speed_panel_land(s jsonb,cid uuid,stamp bigint)returns jsonb
language sql immutable set search_path=public,pg_temp as $$
 select case when s#>array['speedPanelUntil',cid::text] is not null then s
 else s||jsonb_build_object('speedPanelUntil',coalesce(s->'speedPanelUntil','{}')||jsonb_build_object(cid::text,stamp+10000)) end
$$;
create function public.online_speed_panel_step(base int,s jsonb,cid uuid,stamp bigint)returns int
language sql immutable set search_path=public,pg_temp as $$
 select case when coalesce((s#>>array['speedPanelUntil',cid::text])::bigint,0)>stamp then round(base/1.3)::int else base end
$$;
revoke all on function public.online_speed_panel_land(jsonb,uuid,bigint),public.online_speed_panel_step(int,jsonb,uuid,bigint) from public,anon,authenticated;

do $$
declare
 definition text;
 speed_panel text:='[{"id":"speed_entry","kind":"speed_up","x":49,"y":76}]';
 hook text;
begin
 definition:=pg_get_functiondef('public.online_panel_sync(uuid)'::regprocedure);
 hook:='panels:=s->''effectPanels'';';
 if strpos(definition,hook)=0 then raise exception 'Speed panel registration hook missing';end if;
 execute replace(definition,hook,hook||format(
  'if not panels @> ''[{"id":"speed_entry"}]''::jsonb then panels:=panels||%L::jsonb;end if;',speed_panel));

 definition:=pg_get_functiondef('public.online_world_pre_shared_turns(text,jsonb)'::regprocedure);
 hook:='if kind=''heal''then';
 if strpos(definition,hook)=0 then raise exception 'Speed panel single-step hook missing';end if;
 execute replace(definition,hook,'if kind=''speed_up''then s:=online_speed_panel_land(s,cid,online_adventure_now_ms());elsif kind=''heal''then');

 definition:=pg_get_functiondef('public.online_world_adventures(text,jsonb)'::regprocedure);
 hook:='online_move_step_ms((select character_id from online_presence where user_id=auth.uid()))/1000.0';
 if strpos(definition,hook)=0 then raise exception 'Speed panel single-step timing hook missing';end if;
 execute replace(definition,hook,'online_speed_panel_step(online_move_step_ms(c.id),s,c.id,online_adventure_now_ms())/1000.0');

 definition:=pg_get_functiondef('public.online_dungeon_walk(jsonb)'::regprocedure);
 if strpos(definition,'ms:=online_move_step_ms(c.id);')=0 or strpos(definition,'if kind=''heal''then')=0 then
  raise exception 'Speed panel batched movement hooks missing';
 end if;
 definition:=replace(definition,'ms:=online_move_step_ms(c.id);','ms:=online_speed_panel_step(online_move_step_ms(c.id),s,c.id,nowms);');
 execute replace(definition,'if kind=''heal''then','if kind=''speed_up''then s:=online_speed_panel_land(s,c.id,nowms);elsif kind=''heal''then');
end$$;
