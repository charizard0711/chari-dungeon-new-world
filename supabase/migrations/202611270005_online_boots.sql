begin;
alter table online_catalog drop constraint online_catalog_category_check;
alter table online_catalog add check(category in('weapon','armor','shield','necklace','boots','item'));
alter table online_ground_items drop constraint online_ground_items_category_check;
alter table online_ground_items add check(category in('item','weapon','armor','shield','necklace','boots'));
-- Reuse instance/equip/drop/warehouse/market/shortcut validation for the new slot.
do $$declare fn regprocedure;s text;begin
 for fn in select oid::regprocedure from pg_proc where proname like 'online_%'and(position('''weapon'',''armor'',''shield'',''necklace'''in prosrc)>0 or position('''armor'',''shield'',''necklace'''in prosrc)>0)loop
 select pg_get_functiondef(fn)into s;
 s:=replace(s,'''weapon'',''armor'',''shield'',''necklace''','''weapon'',''armor'',''shield'',''necklace'',''boots''');
 if position('''shield'',''necklace'',''boots'''in s)=0 then s:=replace(s,'''armor'',''shield'',''necklace''','''armor'',''shield'',''necklace'',''boots''');end if;
 execute s;
 end loop;
end$$;
insert into online_catalog(key,category,grade,def_bonus,dur_max,shop_price,gacha_pool)values
('boots_leather','boots','D',1,0,80,true),
('boots_chain','boots','C',2,0,null,true),
('boots_plate','boots','B',3,0,null,true),
('boots_arcane','boots','A',4,0,null,true),
('boots_dragon','boots','S',6,0,null,true),
('boots_dawn','boots','SS',8,0,null,true),
('boots_aqua','boots','SSS',10,0,null,true),
('boots_crimson','boots','SSS',10,0,null,true),
('boots_pumpkin_knight','boots','A',4,0,null,true),
('boots_pumpkin_witch','boots','A',4,0,null,true)
on conflict(key)do nothing;
notify pgrst,'reload schema';
commit;
