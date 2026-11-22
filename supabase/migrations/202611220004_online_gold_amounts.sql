begin;
do $$declare p record;src text;changed int:=0;begin
for p in select oid from pg_proc where pronamespace='public'::regnamespace and proname like 'online_world%' loop
select pg_get_functiondef(p.oid)into src;
if position('amount>1000000 then'in src)>0 and position('catalog_unlocked'in src)>0 then
src:=replace(src,'amount>1000000 then','amount>10000000 then');src:=replace(src,'^[0-9]{1,7}$','^[0-9]{1,8}$');src:=replace(src,'1〜1,000,000 G','1〜10,000,000 G');execute src;changed:=changed+1;
end if;end loop;
if changed<>1 then raise exception 'Expected one gold cheat function, found %',changed;end if;
end$$;
notify pgrst,'reload schema';commit;
