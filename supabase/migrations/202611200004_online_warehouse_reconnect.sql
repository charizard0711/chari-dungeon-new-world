begin;
do $patch$
declare source text;updated text;
begin
 select pg_get_functiondef('public.online_world(text,jsonb)'::regprocedure) into source;
 updated:=replace(source,'''poll'',''list'',''leave'',''warehouse_exit''','''poll'',''list'',''join'',''create_character'',''leave'',''warehouse_exit''');
 if updated=source then raise exception 'Warehouse reconnect guard was not found';end if;
 execute updated;
end $patch$;
notify pgrst,'reload schema';
commit;
