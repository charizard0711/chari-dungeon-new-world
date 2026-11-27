-- Transient spider traps are unique per cell, with a bounded recent history.
create or replace function online_compact_webs(items jsonb) returns jsonb
language sql immutable set search_path=public,pg_temp as $$
select coalesce(jsonb_agg(v order by n),'[]'::jsonb) from (
 select v,n from (
  select distinct on (v->>'x',v->>'y') v,n
  from jsonb_array_elements(case when jsonb_typeof(items)='array' then items else '[]'::jsonb end) with ordinality a(v,n)
  where jsonb_typeof(v->'x')='number' and jsonb_typeof(v->'y')='number'
  order by v->>'x',v->>'y',n desc
 ) unique_cells order by n desc limit 256
) recent_cells $$;
create or replace function online_add_web(items jsonb, x int, y int) returns jsonb
language sql immutable set search_path=public,pg_temp as $$
select online_compact_webs(coalesce(items,'[]'::jsonb)||jsonb_build_array(jsonb_build_object('x',x,'y',y))) $$;
-- Patch the active trait implementation; preserve movement/combat/other gimmicks.
do $$declare f record;s text;needle text;n int:=0;begin
needle:='coalesce(s->''webs'',''[]'')||jsonb_build_array(jsonb_build_object(''x'',nx-dx,''y'',ny-dy))';
for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname in ('online_turn_enemy_pre_cinematic','online_enemy_step_state') loop
s:=pg_get_functiondef(f.oid);
if position(needle in s)>0 then s:=replace(s,needle,'online_add_web(s->''webs'',nx-dx,ny-dy)');execute s;
elsif position('online_add_web(' in s)=0 then raise exception 'Spider trail hook not found';end if;
n:=n+1;end loop;
if n<>2 then raise exception 'Both active and legacy spider paths are required';end if;
end$$;
-- Repair existing room trap lists without changing characters, progress or loot.
update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{webs}',online_compact_webs(snapshot->'webs'))
where snapshot ? 'webs' and snapshot->'webs' is distinct from online_compact_webs(snapshot->'webs');
revoke all on function online_compact_webs(jsonb),online_add_web(jsonb,int,int) from public,anon,authenticated;
notify pgrst,'reload schema';
