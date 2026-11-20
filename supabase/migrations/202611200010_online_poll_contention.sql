-- Polling retains user/room row locks. Only mutations join the shared town lock.
-- Patch every older wrapper too, so nested poll calls cannot invert lock order.
do $$
declare fn record; source text; changed int:=0;
begin
 for fn in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname like 'online_world%' and p.prokind='f'
 loop
  source:=pg_get_functiondef(fn.oid);
  if position('perform pg_advisory_xact_lock(71390119);' in source)>0
   and position('poll_contention_v1' in source)=0 then
   source:=replace(source,'perform pg_advisory_xact_lock(71390119);',
    E'/* poll_contention_v1 */ if action not in (''poll'',''list'') then perform pg_advisory_xact_lock(71390119); end if;');
   execute source;changed:=changed+1;
  end if;
 end loop;
 if changed=0 and not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='online_world_v7' and position('poll_contention_v1' in p.prosrc)>0) then
  raise exception 'Expected online-world locking functions were not found';
 end if;
end $$;
