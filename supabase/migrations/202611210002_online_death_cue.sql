-- A per-character revision lets healed respawn packets signal death exactly once.
do $$declare source text;needle text;begin
 select pg_get_functiondef('public.online_adventure_tick(uuid)'::regprocedure) into source;
 if position('death_cue_v1' in source)=0 then
  needle:='update online_adventure_members set x=coalesce(nx,(cfg->''spawn''->>''x'')::int)';
  if position(needle in source)=0 then raise exception 'Expected respawn branch not found';end if;
  source:=replace(source,needle,
   '/* death_cue_v1 */ s:=jsonb_set(s,''{deaths}'',coalesce(s->''deaths'',''{}''::jsonb)||jsonb_build_object(m.character_id::text,coalesce((s#>>array[''deaths'',m.character_id::text])::int,0)+1)); '
   ||needle);
  execute source;
 end if;
end$$;
