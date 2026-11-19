-- Read-only deployment check. Every row must be true before enabling rankings.
-- Run with the Supabase SQL editor or a management connection, never the browser.
with expected_tables(name) as (
  values ('ranking_profiles'), ('ranking_runs'), ('ranking_entries')
), expected_functions(signature) as (
  values
    ('public.ranking_reserve_name(uuid,text,text)'),
    ('public.ranking_start_run(uuid,uuid,uuid,text,text,text,text)'),
    ('public.ranking_submit(uuid,uuid,text,jsonb,jsonb)'),
    ('public.ranking_claim()'),
    ('public.ranking_complete(uuid,integer,jsonb,text)'),
    ('public.ranking_board(text,text,uuid)')
), checks as (
  select 'table:' || t.name as check_name,
    coalesce(c.relkind = 'r' and c.relrowsecurity
      and not has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      and not has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      and has_table_privilege('service_role', c.oid, 'SELECT')
      and has_table_privilege('service_role', c.oid, 'INSERT')
      and has_table_privilege('service_role', c.oid, 'UPDATE'), false) as ok
  from expected_tables t
  left join pg_class c on c.oid = to_regclass('public.' || t.name)
  union all
  select 'function:' || f.signature,
    coalesce(not p.prosecdef
      and 'search_path=""' = any(p.proconfig)
      and not has_function_privilege('anon', p.oid, 'EXECUTE')
      and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
      and has_function_privilege('service_role', p.oid, 'EXECUTE'), false)
  from expected_functions f
  left join pg_proc p on p.oid = to_regprocedure(f.signature)
)
select check_name, ok from checks order by check_name;
