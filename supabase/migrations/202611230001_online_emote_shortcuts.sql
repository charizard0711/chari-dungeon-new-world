-- Add fixed emotes to existing character-owned shortcut slots without changing permissions.
begin;
do $migration$
declare fn text;patched text;
begin
 select pg_get_functiondef('public.online_sync_instances(uuid)'::regprocedure) into fn;
 if position('ref->>''category''=''emote''' in fn)=0 then
  patched:=replace(fn,'if ref->>''category''=''item'' then valid:=',
   'if ref->>''category''=''emote'' then valid:=(ref->>''key'') in(''morning'',''hello'',''evening'',''thanks'',''please'',''goodjob'',''sorry'',''yes'',''wait'',''go'',''nice'',''bye''); elsif ref->>''category''=''item'' then valid:=');
  if patched=fn then raise exception 'Cannot locate shortcut normalization';end if;execute patched;
 end if;
 select pg_get_functiondef('public.online_world_equipment(text,jsonb)'::regprocedure) into fn;
 if position('ref->>''category''=''emote''' in fn)=0 then
  patched:=replace(fn,'if ref->>''category''=''item'' then if coalesce',
   'if ref->>''category''=''emote'' then if coalesce(ref->>''key'','''') not in(''morning'',''hello'',''evening'',''thanks'',''please'',''goodjob'',''sorry'',''yes'',''wait'',''go'',''nice'',''bye'') then raise exception ''エモートを確認してください。'';end if;ref:=jsonb_build_object(''category'',''emote'',''key'',ref->>''key''); elsif ref->>''category''=''item'' then if coalesce');
  if patched=fn then raise exception 'Cannot locate shortcut validation';end if;execute patched;
 end if;
end $migration$;
commit;
