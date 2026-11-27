begin;
alter table online_characters drop constraint online_characters_hp_check;
alter table online_characters add check(hp between 0 and 5000);
alter table online_catalog drop constraint online_catalog_category_check;
alter table online_catalog add check(category in('weapon','armor','shield','necklace','boots','gloves','item'));
alter table online_ground_items drop constraint online_ground_items_category_check;
alter table online_ground_items add check(category in('item','weapon','armor','shield','necklace','boots','gloves'));
do $$declare f record;s text;begin for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname like 'online_%' and position('''necklace'',''boots''' in prosrc)>0 loop s:=pg_get_functiondef(f.oid);s:=replace(s,'''necklace'',''boots''','''necklace'',''boots'',''gloves''');execute s;end loop;end$$;
insert into online_catalog(key,category,grade,def_bonus,dur_max,shop_price,gacha_pool)values
('gloves_leather','gloves','D',0,0,80,true),
('gloves_chain','gloves','C',0,0,null,true),
('gloves_plate','gloves','B',0,0,null,true),
('gloves_arcane','gloves','A',0,0,null,true),
('gloves_dragon','gloves','S',0,0,null,true),
('gloves_dawn','gloves','SS',0,0,null,true),
('gloves_aqua','gloves','SSS',0,0,null,true),
('gloves_crimson','gloves','SSS',0,0,null,true),
('gloves_pumpkin_knight','gloves','A',0,0,null,true),
('gloves_pumpkin_witch','gloves','A',0,0,null,true) on conflict(key)do nothing;

create function online_equipment_haste(g text)returns numeric language sql immutable as $$select case g when 'D'then 1.05 when 'C'then 1.08 when 'B'then 1.12 when 'A'then 1.16 when 'S'then 1.20 when 'SS'then 1.25 when 'SSS'then 1.30 else 1 end$$;
create function online_equipment_hp(g jsonb)returns int language sql stable security definer set search_path=public,pg_temp as $$select 100+case when coalesce((g->>'weapon')::boolean,false)and g->>'weapon_key'like'star_%'then 50 else 0 end+case when coalesce((g->>'armor')::boolean,false)then coalesce((select def_bonus*5 from online_catalog where key='armor_'||coalesce(g->>'armor_key','leather')),0)else 0 end$$;
create function online_character_hp_max(cid uuid)returns int language sql stable security definer set search_path=public,pg_temp as $$select online_equipment_hp((select gear from online_characters where id=cid))$$;
create or replace function online_move_step_ms(cid uuid)returns int language sql stable security definer set search_path=public,pg_temp as $$select greatest(110,least(400,round(c.move_step_ms*1.25/online_equipment_haste(case when coalesce((c.gear->>'boots')::boolean,false)then k.grade end))::int))from online_characters c left join online_catalog k on k.key=c.gear->>'boots_key'where c.id=cid$$;
create or replace function online_character_attack_ms(cid uuid)returns int language sql stable security definer set search_path=public,pg_temp as $$select greatest(160,round(online_attack_ms(w.weapon_type)*1.15/online_equipment_haste(case when coalesce((c.gear->>'gloves')::boolean,false)then g.grade end))::int)from online_characters c left join online_catalog w on w.key=case when coalesce((c.gear->>'weapon')::boolean,false)then regexp_replace(coalesce(c.gear->>'weapon_key','w_iron_dagger'),'^star_','')end left join online_catalog g on g.key=c.gear->>'gloves_key'where c.id=cid$$;
create function online_necklace_skill(cid uuid)returns numeric language sql stable security definer set search_path=public,pg_temp as $$select case k.grade when 'D'then 1.03 when 'C'then 1.05 when 'B'then 1.07 when 'A'then 1.10 when 'S'then 1.13 when 'SS'then 1.16 when 'SSS'then 1.20 else 1 end from online_characters c left join online_catalog k on k.key=case when coalesce((c.gear->>'necklace')::boolean,false)then c.gear->>'necklace_key'end where c.id=cid$$;
create or replace function online_adventure_defence_pre_maze(cid uuid)returns int language sql stable security definer set search_path=public,pg_temp as $$select 3+coalesce((select k.def_bonus from online_characters c join online_catalog k on k.key=c.gear->>'shield_key'where c.id=cid and coalesce((c.gear->>'shield')::boolean,false)),0)$$;
-- Replace legacy HP ceilings in healing, equipment validation, springs and movement.
do $$declare f record;s text;begin
for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname like 'online_%'and prosrc like '%150 else 100 end%' loop
s:=pg_get_functiondef(f.oid);
s:=regexp_replace(s,'case when coalesce\(\((c\.)?(new_gear|gear)->>''weapon''[^;\n]{0,180}?then 150 else 100 end','online_equipment_hp(\1\2)','g');
s:=replace(s,'case when exists(select 1 from online_characters where id=cid and coalesce((gear->>''weapon'')::boolean,false)and gear->>''weapon_key''like''star_%'')then 150 else 100 end','online_character_hp_max(cid)');
s:=replace(s,'case when v and n like ''star_%'' then 150 else 100 end','online_equipment_hp(gear||jsonb_build_object(''weapon'',v,''weapon_key'',n))');
s:=replace(s,'case when k like ''star_%'' then 150 else 100 end','online_equipment_hp(gear||jsonb_build_object(''weapon'',true,''weapon_key'',k))');
execute s;end loop;
for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname like 'online_%'and position('damage:=damage+n;hit:=true;' in prosrc)>0 loop
s:=pg_get_functiondef(f.oid);s:=replace(s,'damage:=damage+n;hit:=true;','if action=''skill''then n:=greatest(1,round(n*online_necklace_skill(c.id)));end if;damage:=damage+n;hit:=true;');execute s;
end loop;end$$;
-- Clamp HP when removing clothing without healing on equip.
alter function online_world(text,jsonb)rename to online_world_pre_equipment_roles;
create function online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare r jsonb;cid uuid;v int;begin r:=online_world_pre_equipment_roles(action,payload);cid:=nullif(r#>>'{active,id}','')::uuid;if cid is not null then v:=online_character_hp_max(cid);update online_characters set hp=least(hp,v)where id=cid and hp>v;r:=jsonb_set(r,'{active}',r->'active'||jsonb_build_object('hp',(select hp from online_characters where id=cid),'hpMax',v,'moveStepMs',online_move_step_ms(cid),'attackCooldownMs',online_character_attack_ms(cid)));end if;return r;end$$;
revoke all on function online_equipment_haste(text),online_equipment_hp(jsonb),online_character_hp_max(uuid),online_necklace_skill(uuid),online_world_pre_equipment_roles(text,jsonb)from public,anon,authenticated;
revoke all on function online_world(text,jsonb)from public,anon;grant execute on function online_world(text,jsonb)to authenticated;
notify pgrst,'reload schema';commit;
