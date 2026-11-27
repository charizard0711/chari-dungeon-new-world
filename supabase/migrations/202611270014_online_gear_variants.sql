-- Equipment slots keep their existing keys; individual variants add a star_ prefix.
create function public.online_gear_catalog_key(slot text,k text)returns text
language sql immutable set search_path=public,pg_temp as $$
 select (case when slot='armor' then 'armor_' else '' end)||regexp_replace(k,'^star_','')
$$;
create function public.online_gear_drop_key(slot text,k text)returns text
language sql immutable set search_path=public,pg_temp as $$
 select (case when left(k,5)='star_' then 'star_' else '' end)||online_gear_catalog_key(slot,k)
$$;
revoke all on function public.online_gear_catalog_key(text,text),public.online_gear_drop_key(text,text) from public,anon,authenticated;

create or replace function public.online_equipment_hp(g jsonb)returns int
language sql stable security definer set search_path=public,pg_temp as $$
 select 100+
   (select count(*)::int*50 from unnest(array['weapon','armor','shield','gloves','boots','necklace']) slot
    where coalesce((g->>slot)::boolean,false) and left(g->>(slot||'_key'),5)='star_')+
   case when coalesce((g->>'armor')::boolean,false) then coalesce(
     (select def_bonus*5 from online_catalog where key=online_gear_catalog_key('armor',coalesce(g->>'armor_key','leather'))),0)
   else 0 end
$$;

do $$
declare
 definition text;
 signature text;
begin
 definition:=pg_get_functiondef('public.online_give_equipment(uuid,text,boolean)'::regprocedure);
 if strpos(definition,'when cat.category=''weapon'' and starred')=0 then raise exception 'Variant grant hook missing';end if;
 execute replace(definition,
  'k:=case when cat.category=''armor'' then substr(cat.key,7) when cat.category=''weapon'' and starred then ''star_''||cat.key else cat.key end;',
  'k:=(case when starred then ''star_'' else '''' end)||(case when cat.category=''armor'' then substr(cat.key,7) else cat.key end);');

 foreach signature in array array['online_sync_instances(uuid)','online_world_equipment(text,jsonb)'] loop
  definition:=pg_get_functiondef(('public.'||signature)::regprocedure);
  definition:=replace(definition,'case when s=''armor'' then ''armor_''||k else regexp_replace(k,''^star_'','''') end','online_gear_catalog_key(s,k)');
  definition:=replace(definition,'case when coalesce((new_gear->>''weapon'')::boolean,false) and new_gear->>''weapon_key'' like ''star_%'' then least(hp,150) else least(hp,100) end','least(hp,online_equipment_hp(new_gear))');
  definition:=replace(definition,'action=''gacha'' and cat.category=''weapon'' and random()<.01','(action=''gacha'' or cat.category<>''weapon'') and cat.category<>''item'' and random()<.01');
  definition:=replace(definition,'cat.category=''weapon'' and random()<.01','cat.category<>''item'' and random()<.01');
  definition:=replace(definition,'case when s=''armor'' then ''armor_''||k else k end','online_gear_drop_key(s,k)');
  definition:=replace(definition,'case when s=''weapon'' then least(hp,100) else hp end','least(hp,online_equipment_hp(gear||jsonb_build_object(s,false)))');
  definition:=replace(definition,'case when s=''weapon'' then online_equipment_hp(gear||jsonb_build_object(''weapon'',true,''weapon_key'',k)) else online_equipment_hp(gear) end','online_equipment_hp(gear||jsonb_build_object(s,true,s||''_key'',k))');
  definition:=replace(definition,'case when n=0 then least(hp,100) else hp end','case when n=0 then least(hp,online_equipment_hp(gear||''{"weapon":false}''::jsonb)) else hp end');
  execute definition;
 end loop;
 foreach signature in array array['online_world_adventures(text,jsonb)','online_world_core(text,jsonb)'] loop
  definition:=pg_get_functiondef(('public.'||signature)::regprocedure);
  definition:=replace(definition,'case when equipment_slot=''armor'' then ''armor_''||keytext else keytext end','online_gear_drop_key(equipment_slot,keytext)');
  execute replace(definition,'case when equipment_slot=''armor'' then ''armor_''||k else k end','online_gear_drop_key(equipment_slot,k)');
 end loop;
 foreach signature in array array['online_move_step_ms(uuid)','online_character_attack_ms(uuid)','online_necklace_skill(uuid)','online_adventure_defence_pre_maze(uuid)'] loop
  definition:=pg_get_functiondef(('public.'||signature)::regprocedure);
  execute regexp_replace(definition,$pattern$c.gear->>'(boots|gloves|necklace|shield)_key'$pattern$,$repl$regexp_replace(c.gear->>'\1_key','^star_','')$repl$,'g');
 end loop;
 -- Older warehouses omit the boots/gloves arrays until their first deposit.
 definition:=pg_get_functiondef('public.online_world_warehouse(text,jsonb)'::regprocedure);
 definition:=replace(definition,'(store->''equipment''->s)||jsonb_build_array(k)','coalesce(store->''equipment''->s,''[]''::jsonb)||jsonb_build_array(k)');
 execute replace(definition,'(store->''instances''->s)||jsonb_build_array(meta)','coalesce(store->''instances''->s,''[]''::jsonb)||jsonb_build_array(meta)');
 definition:=pg_get_functiondef('public.online_world(text,jsonb)'::regprocedure);
 execute replace(definition,'''boots'',case', '''necklace'',case when c.gear->>''necklace''=''true'' then c.gear->>''necklace_key'' end,''boots'',case');
end$$;
