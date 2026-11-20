-- Completed adventures cannot retain a red warning after their caster has died.
do $$
declare source text;old_guard text:=$old$if room.status<>'active' or now_ms-coalesce((room.snapshot->>'simAtMs')::bigint,0)<200 then return;end if;$old$;
begin
 select pg_get_functiondef('public.online_adventure_tick(uuid)'::regprocedure) into source;
 if position('completed_cast_cleanup_v1' in source)>0 then return;end if;
 if position(old_guard in source)=0 then raise exception 'Expected realtime encounter guard was not found';end if;
 source:=replace(source,old_guard,$new$
 /* completed_cast_cleanup_v1 */
 if room.status<>'active' then
  if jsonb_array_length(coalesce(room.snapshot->'telegraphs','[]'))>0 then
   update public.online_adventure_rooms set snapshot=jsonb_set(snapshot,'{telegraphs}','[]'),pending_step_at=null where id=rid;
  end if;
  return;
 end if;
 if now_ms-coalesce((room.snapshot->>'simAtMs')::bigint,0)<200 then return;end if;
 $new$);
 execute source;
end $$;
