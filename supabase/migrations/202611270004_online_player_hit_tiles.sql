-- Persist authoritative hit cells so killing blows and multi-target skills do not
-- attach their effect to the next living enemy or to the attacker's old position.
do $$declare fn regprocedure;s text;n int:=0;begin
 for fn in select oid::regprocedure from pg_proc where proname like 'online_world%'and position('''hit_target'',hit,''origin_x'',member.x'in prosrc)>0 loop
 select pg_get_functiondef(fn)into s;
 s:=replace(s,'''hit_target'',hit,''origin_x'',member.x','''hit_target'',hit,''hit_tiles'',(select coalesce(jsonb_agg(jsonb_build_object(''x'',(old->>''x'')::int,''y'',(old->>''y'')::int)),''[]''::jsonb)from jsonb_array_elements(s->''enemies'')old join jsonb_array_elements(items)fresh on old->>''id''=fresh->>''id''where(old->>''hp'')::int>(fresh->>''hp'')::int),''origin_x'',member.x');
 execute s;n:=n+1;
 end loop;
 if n<>1 then raise exception 'Expected one player hit hook, got %',n;end if;
end$$;
notify pgrst,'reload schema';
