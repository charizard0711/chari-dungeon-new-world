begin;
alter table public.online_catalog drop constraint online_catalog_category_check;
alter table public.online_catalog add check(category in('weapon','armor','shield','necklace','item')),
 add column grade text not null default 'D',add column dur_max integer not null default 0,
 add column weapon_type text,add column shop_price integer,add column gacha_pool boolean not null default false,add column skill jsonb;
alter table public.online_characters add column gold integer not null default 300 check(gold>=0),
 add column instances jsonb not null default '{}',add column quick_slots jsonb not null default '[{"category":"item","key":"potion"},null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]';
alter table public.online_ground_items drop constraint online_ground_items_category_check;
alter table public.online_ground_items drop constraint online_ground_items_check;
alter table public.online_ground_items add check(category in('item','weapon','armor','shield','necklace')),add check(char_length(kind) between 1 and 100 and kind!~'[[:cntrl:]]'),add column equipment_state jsonb;

create or replace function public.online_town_blocked(x integer,y integer) returns boolean language sql immutable set search_path=public,pg_temp as $$
 select x<1 or y<1 or x>23 or y>17 or (x between 3 and 7 and y between 2 and 5) or (x between 18 and 22 and y between 2 and 5)
 or (x between 11 and 13 and y between 8 and 10) or (x=16 and y=11) or (x=12 and y=5)
 or (y=12 and (x between 6 and 8 or x between 17 and 19)) or (x,y) in((3,9),(21,9),(4,15),(20,15),(3,16),(21,16),(1,3),(23,3),(1,14),(23,14),(8,2),(16,2),(9,6),(15,6),(9,12),(15,12),(7,9),(18,9));
$$;

create function public.online_sync_instances(cid uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.online_characters;s text;keys jsonb;old jsonb;items jsonb;result jsonb:='{}';item jsonb;k text;cat public.online_catalog;i integer;used text[];idx integer;dur integer;quick jsonb:='[]';ref jsonb;valid boolean;new_gear jsonb;
begin
 select * into c from public.online_characters where id=cid;
 foreach s in array array['weapon','armor','shield','necklace'] loop
  keys:=coalesce(c.equipment->s,'[]');old:=coalesce(c.instances->s,'[]');items:='[]';used:=array[]::text[];
  for k in select jsonb_array_elements_text(keys) loop
   item:=null;
   select value into item from jsonb_array_elements(old) where value->>'key'=k and not(value->>'id'=any(used)) limit 1;
   select * into cat from public.online_catalog where key=case when s='armor' then 'armor_'||k else regexp_replace(k,'^star_','') end;
   dur:=greatest(0,least(coalesce(cat.dur_max,0),coalesce((item->>'dur')::integer,cat.dur_max,0)));
   item:=jsonb_build_object('id',coalesce(item->>'id',gen_random_uuid()::text),'key',k,'dur',dur,'max',coalesce(cat.dur_max,0));
   used:=array_append(used,item->>'id');items:=items||jsonb_build_array(item);
  end loop;
  result:=result||jsonb_build_object(s,items);
 end loop;
 new_gear:=c.gear;
 foreach s in array array['weapon','armor','shield','necklace'] loop
  if coalesce((new_gear->>s)::boolean,false) then
   item:=null;select value into item from jsonb_array_elements(result->s) where value->>'id'=new_gear->>(s||'_instance_id') or (new_gear->>(s||'_instance_id') is null and value->>'key'=coalesce(new_gear->>(s||'_key'),case s when 'weapon' then 'w_iron_dagger' when 'armor' then 'leather' end)) limit 1;
   if item is null or ((item->>'max')::integer>0 and (item->>'dur')::integer<=0) then new_gear:=new_gear||jsonb_build_object(s,false);else new_gear:=new_gear||jsonb_build_object(s||'_instance_id',item->>'id');end if;
  end if;
 end loop;
 for idx in 0..19 loop
  ref:=c.quick_slots->idx;valid:=false;
  if ref->>'category'='item' then valid:=coalesce((c.inventory->>(ref->>'key'))::integer,0)>0;
  elsif ref->>'category' in('weapon','armor','shield','necklace') then
   select exists(select 1 from jsonb_array_elements(result->(ref->>'category')) e where e->>'id'=ref->>'instanceId' and e->>'key'=ref->>'key') into valid;
  end if;
  quick:=quick||jsonb_build_array(case when valid then ref else 'null'::jsonb end);
 end loop;
 if result is distinct from c.instances or quick is distinct from c.quick_slots or new_gear is distinct from c.gear or c.hp>(case when coalesce((new_gear->>'weapon')::boolean,false) and new_gear->>'weapon_key' like 'star_%' then 150 else 100 end) then update public.online_characters set instances=result,quick_slots=quick,gear=new_gear,hp=case when coalesce((new_gear->>'weapon')::boolean,false) and new_gear->>'weapon_key' like 'star_%' then least(hp,150) else least(hp,100) end where id=cid;end if;
end $$;
revoke all on function public.online_sync_instances(uuid) from public,anon,authenticated;

create function public.online_give_equipment(cid uuid,item_key text,starred boolean default false) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare cat public.online_catalog;k text;
begin
 select * into cat from public.online_catalog where key=item_key;
 if cat.key is null then raise exception '登録されていないアイテムです。';end if;
 if cat.category='item' then
  if (select coalesce((inventory->>cat.key)::integer,0) from public.online_characters where id=cid)>=9999 then raise exception '所持上限です。';end if;
  update public.online_characters set inventory=jsonb_set(inventory,array[cat.key],to_jsonb(coalesce((inventory->>cat.key)::integer,0)+1)) where id=cid;
 else
  if (select coalesce(jsonb_array_length(equipment->cat.category),0) from public.online_characters where id=cid)>=200 then raise exception '装備の所持上限です。';end if;
  k:=case when cat.category='armor' then substr(cat.key,7) when cat.category='weapon' and starred then 'star_'||cat.key else cat.key end;
  update public.online_characters set equipment=jsonb_set(equipment,array[cat.category],coalesce(equipment->cat.category,'[]')||jsonb_build_array(k)) where id=cid;
 end if;
 perform public.online_sync_instances(cid);
end $$;
revoke all on function public.online_give_equipment(uuid,text,boolean) from public,anon,authenticated;

alter function public.online_world(text,jsonb) rename to online_world_core;
revoke all on function public.online_world_core(text,jsonb) from public,anon,authenticated;
do $patch$
declare old_def text;new_def text;
begin
 select pg_get_functiondef('public.online_world_core(text,jsonb)'::regprocedure) into old_def;
 new_def:=regexp_replace(old_def,'skill:=[[:space:]]*''[^'']+''::jsonb->combat.key;','skill:=(select t.skill from public.online_catalog t where t.key=combat.key);');
 if old_def=new_def then raise exception 'Canonical weapon skill mapping was not found';end if;
 execute new_def;
end $patch$;
create function public.online_character_extras(cid uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('gold',gold,'instances',instances,'quickSlots',quick_slots) from public.online_characters where id=cid and user_id=auth.uid();
$$;
revoke all on function public.online_character_extras(uuid) from public,anon,authenticated;

create function public.online_world(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();c public.online_characters;r public.online_presence;p public.online_profiles;cat public.online_catalog;s text;k text;i integer;j integer;n integer;price integer;ref jsonb;item jsonb;drop_row public.online_ground_items;result jsonb;row jsonb;characters jsonb;reward text;rolled_grade text;roll float;instance_id text;character_id uuid;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'メールアカウントでログインしてください。';end if;
 perform pg_advisory_xact_lock(71390119);perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 result:=public.online_world_core('list','{}');
 select * into p from public.online_profiles where user_id=uid;
 for character_id in select id from public.online_characters where user_id=uid loop perform public.online_sync_instances(character_id);end loop;
 select * into r from public.online_presence where user_id=uid;
 select * into c from public.online_characters where id=r.character_id and user_id=uid;
 if action not in('list','create_character','join','leave') and c.id is null then raise exception '町に入場してください。';end if;

 if action in('buy','repair_equipment','sell_equipment') and abs(r.x-18)+abs(r.y-9)>2 then raise exception '商人の近くで話しかけてください。';end if;
 if action='gacha' and abs(r.x-7)+abs(r.y-9)>2 then raise exception 'ガチャ機の近くで操作してください。';end if;
 if action in('gacha','buy') then
  if action='gacha' then
   price:=100;roll:=random()*100;rolled_grade:=case when roll<35 then 'D' when roll<60 then 'C' when roll<78 then 'B' when roll<90 then 'A' when roll<96 then 'S' when roll<99 then 'SS' else 'SSS' end;
   select * into cat from public.online_catalog where category<>'item' and gacha_pool and online_catalog.grade=rolled_grade order by random() limit 1;
  else select * into cat from public.online_catalog where key=payload->>'key';price:=cat.shop_price;end if;
  if cat.key is null or price is null then raise exception 'この商品は購入できません。';end if;
  if c.gold<price then raise exception '所持金が足りません（必要 %G）。',price;end if;
  update public.online_characters set gold=gold-price where id=c.id;
  perform public.online_give_equipment(c.id,cat.key,action='gacha' and cat.category='weapon' and random()<.01);reward:=cat.key;
 elsif action='claim_item' then
  if not p.super_account or not c.catalog_unlocked then raise exception 'スーパーアカウント専用です。';end if;
  perform public.online_give_equipment(c.id,payload->>'key',coalesce((payload->>'starred')::boolean,false));
 elsif action in('equip','repair_equipment','sell_equipment','drop_equipment','drop_weapon') then
  s:=case when action='drop_weapon' then 'weapon' else payload->>'slot' end;
  if s is null or s not in('weapon','armor','shield','necklace') then raise exception '装備を確認してください。';end if;
  i:=coalesce((payload->>'index')::integer,0);
  if payload ? 'instanceId' then select ordinality::integer-1 into i from jsonb_array_elements(c.instances->s) with ordinality where value->>'id'=payload->>'instanceId';
  elsif not(payload ? 'index') and payload ? 'key' then select ordinality::integer-1 into i from jsonb_array_elements(c.instances->s) with ordinality where value->>'key'=payload->>'key' limit 1;end if;
  if i is null or i<0 then raise exception '装備を確認してください。';end if;
  item:=c.instances->s->i;k:=item->>'key';
  if action='equip' and coalesce((payload->>'equipped')::boolean,true)=false then
   update public.online_characters set gear=gear||jsonb_build_object(s,false,s||'_instance_id',null),hp=case when s='weapon' then least(hp,100) else hp end where id=c.id;
  else
   if item is null or k is null or (payload ? 'key' and k is distinct from payload->>'key') then raise exception 'その装備は持っていません。';end if;
   if action='equip' then
    if (item->>'max')::integer>0 and (item->>'dur')::integer<=0 then raise exception '耐久が切れています。商人で修理してください。';end if;
    if s='shield' and coalesce((c.gear->>'weapon')::boolean,false) and exists(select 1 from public.online_catalog where key=regexp_replace(c.gear->>'weapon_key','^star_','') and weapon_type in('bow','greatsword','dual_sword','twin_daggers')) then raise exception '両手武器の装備中は盾を装備できません。';end if;
    update public.online_characters set gear=gear||jsonb_build_object(s,true,s||'_key',k,s||'_instance_id',item->>'id'),hp=least(hp,case when s='weapon' then case when k like 'star_%' then 150 else 100 end else case when coalesce((gear->>'weapon')::boolean,false) and gear->>'weapon_key' like 'star_%' then 150 else 100 end end) where id=c.id;
    if s='weapon' and exists(select 1 from public.online_catalog where key=regexp_replace(k,'^star_','') and weapon_type in('bow','greatsword','dual_sword','twin_daggers')) then update public.online_characters set gear=gear||'{"shield":false}'::jsonb where id=c.id;end if;
   elsif action='repair_equipment' then
    n:=(item->>'max')::integer-(item->>'dur')::integer;if n<=0 then raise exception '修理は必要ありません。';end if;
    price:=greatest(1,ceil(n/10.0)::integer);if c.gold<price then raise exception '修理代が足りません（%G）。',price;end if;
    update public.online_characters set gold=gold-price,instances=jsonb_set(instances,array[s,i::text,'dur'],item->'max') where id=c.id;
   else
    if action<>'sell_equipment' then
     if (select count(*) from public.online_ground_items where dropped_by=uid)>=50 then raise exception '落としたアイテムを先に拾ってください。';end if;
     if exists(select 1 from public.online_ground_items where dropped_by=uid and created_at>clock_timestamp()-interval '250 milliseconds') then raise exception '少し待ってください。';end if;
     insert into public.online_ground_items(kind,category,x,y,dropped_by,equipment_state) values(case when s='armor' then 'armor_'||k else k end,s,r.x,r.y,uid,item);
    else
     select * into cat from public.online_catalog where key=case when s='armor' then 'armor_'||k else regexp_replace(k,'^star_','') end;
     price:=case cat.grade when 'D' then 10 when 'C' then 25 when 'B' then 50 when 'A' then 100 when 'S' then 200 when 'SS' then 400 else 800 end;
     update public.online_characters set gold=gold+price where id=c.id;
    end if;
    update public.online_characters set equipment=jsonb_set(equipment,array[s],(equipment->s)-i),instances=jsonb_set(instances,array[s],(instances->s)-i),gear=case when gear->>(s||'_instance_id')=item->>'id' or (not(gear ? (s||'_instance_id')) and gear->>(s||'_key')=k) then gear||jsonb_build_object(s,false,s||'_instance_id',null) else gear end where id=c.id;
   end if;
  end if;
 elsif action='drop_item' then
  k:=payload->>'kind';if coalesce((c.inventory->>k)::integer,0)<1 then raise exception 'そのアイテムは持っていません。';end if;
  if (select count(*) from public.online_ground_items where dropped_by=uid)>=50 then raise exception '落としたアイテムを先に拾ってください。';end if;
  if exists(select 1 from public.online_ground_items where dropped_by=uid and created_at>clock_timestamp()-interval '250 milliseconds') then raise exception '少し待ってください。';end if;
  update public.online_characters set inventory=jsonb_set(inventory,array[k],to_jsonb((inventory->>k)::integer-1)) where id=c.id;
  insert into public.online_ground_items(kind,category,x,y,dropped_by) values(k,'item',r.x,r.y,uid);
 elsif action='pickup_item' then
  select * into drop_row from public.online_ground_items where id=(payload->>'drop_id')::uuid for update;
  if drop_row.id is null or abs(drop_row.x-r.x)+abs(drop_row.y-r.y)>1 then raise exception 'アイテムの近くまで移動してください。';end if;
  perform public.online_give_equipment(c.id,regexp_replace(drop_row.kind,'^star_',''),drop_row.kind like 'star_%');
  if drop_row.category<>'item' and drop_row.equipment_state is not null then
   select * into c from public.online_characters where id=c.id;s:=drop_row.category;i:=jsonb_array_length(c.instances->s)-1;
   update public.online_characters set instances=jsonb_set(instances,array[s,i::text],drop_row.equipment_state) where id=c.id;
  end if;
  delete from public.online_ground_items where id=drop_row.id;
 elsif action='set_quick_slot' then
  i:=(payload->>'index')::integer;ref:=payload->'ref';if i is null or i<0 or i>19 then raise exception 'ショートカットを確認してください。';end if;
  if ref is not null and ref<>'null'::jsonb then
   if ref->>'category'='item' then if coalesce((c.inventory->>(ref->>'key'))::integer,0)<1 then raise exception '所持していないアイテムです。';end if;
   elsif ref->>'category' in('weapon','armor','shield','necklace') then if not exists(select 1 from jsonb_array_elements(c.instances->(ref->>'category')) e where e->>'id'=ref->>'instanceId' and e->>'key'=ref->>'key') then raise exception '所持していない装備です。';end if;
   else raise exception 'ショートカットを確認してください。';end if;
  end if;
  update public.online_characters set quick_slots=jsonb_set(quick_slots,array[i::text],coalesce(ref,'null')) where id=c.id;
 elsif action='use_item' and payload->>'kind' in('repair','skill_drink') then
  k:=payload->>'kind';if coalesce((c.inventory->>k)::integer,0)<1 then raise exception 'そのアイテムは持っていません。';end if;
  if k='skill_drink' then if c.skill_steps_remaining=0 then raise exception 'スキルは使用可能です。';end if;update public.online_characters set skill_steps_remaining=0 where id=c.id;
  else
   s:=coalesce(payload->>'slot','weapon');i:=coalesce((payload->>'index')::integer,0);if s not in('weapon','shield') then raise exception '武器か盾を選択してください。';end if;if payload ? 'instanceId' then select ordinality::integer-1 into i from jsonb_array_elements(c.instances->s) with ordinality where value->>'id'=payload->>'instanceId';end if;if i is null or i<0 then raise exception '修復する装備を選択してください。';end if;item:=c.instances->s->i;
   if item is null or (item->>'dur')::integer>=(item->>'max')::integer then raise exception '修復する装備を選択してください。';end if;
   update public.online_characters set instances=jsonb_set(instances,array[s,i::text,'dur'],to_jsonb(least((item->>'max')::integer,(item->>'dur')::integer+50))) where id=c.id;
  end if;
  update public.online_characters set inventory=jsonb_set(inventory,array[k],to_jsonb((inventory->>k)::integer-1)) where id=c.id;
 else
  if action in('attack','skill','train') and coalesce((c.gear->>'weapon')::boolean,false) then
   select value into item from jsonb_array_elements(c.instances->'weapon') where value->>'id'=c.gear->>'weapon_instance_id' or (not(c.gear ? 'weapon_instance_id') and value->>'key'=coalesce(c.gear->>'weapon_key','w_iron_dagger')) limit 1;
   if item is not null and (item->>'dur')::integer<=0 then raise exception '耐久が切れています。修理してください。';end if;
  end if;
  result:=public.online_world_core(action,payload);
  if action in('attack','skill','train') and item is not null then
   select ordinality::integer-1 into i from jsonb_array_elements(c.instances->'weapon') with ordinality where value->>'id'=item->>'id';
   n:=greatest(0,(item->>'dur')::integer-1);
   update public.online_characters set instances=jsonb_set(instances,array['weapon',i::text,'dur'],to_jsonb(n)),gear=case when n=0 then gear||'{"weapon":false}'::jsonb else gear end,hp=case when n=0 then least(hp,100) else hp end where id=c.id;
  end if;
 end if;
 if c.id is not null then perform public.online_sync_instances(c.id);end if;
 -- Read through the existing authenticated serializer; keep all original fields.
 result:=public.online_world_core(case when c.id is null or action='leave' then 'list' else 'poll' end,'{}');characters:='[]';
 for row in select jsonb_array_elements(result->'characters') loop characters:=characters||jsonb_build_array(row||public.online_character_extras((row->>'id')::uuid));end loop;
 result:=result||jsonb_build_object('characters',characters);
 if result->'active'<>'null'::jsonb then result:=jsonb_set(result,'{active}',(result->'active')||public.online_character_extras((result->'active'->>'id')::uuid));end if;
 result:=result||jsonb_build_object('shopCatalog',coalesce((select jsonb_agg(jsonb_build_object('key',key,'price',shop_price) order by category,key) from public.online_catalog where shop_price is not null),'[]'));
 if reward is not null then result:=result||jsonb_build_object('reward',reward);end if;
 return result;
end $$;
revoke all on function public.online_world(text,jsonb) from public,anon;
grant execute on function public.online_world(text,jsonb) to authenticated;
notify pgrst,'reload schema';
-- BEGIN GENERATED CATALOG
-- Generated from the shared game definitions by scripts/build-town-catalog.ts
insert into public.online_catalog(key,category,grade,dur_max,attack_min,attack_max,attack_range,weapon_type,shop_price,gacha_pool,skill) values
('w_katana_iron','weapon','D',180,7,15,1,'katana',40,true,'{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"}'),
('w_katana_mist','weapon','C',195,9,18,1,'katana',100,true,'{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"}'),
('w_katana_moon','weapon','B',210,11,22,1,'katana',null,true,'{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"}'),
('w_katana_sun','weapon','A',225,13,26,1,'katana',null,true,'{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"}'),
('w_katana_dragon','weapon','S',240,15,30,1,'katana',null,true,'{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"}'),
('w_katana_sky','weapon','SS',255,17,33,1,'katana',null,true,'{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"}'),
('w_katana_divine','weapon','SSS',285,19,36,1,'katana',null,false,'{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"}'),
('w_katana_fire','weapon','C',195,9,18,1,'katana',null,true,'{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"}'),
('w_katana_water','weapon','C',195,9,18,1,'katana',null,true,'{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"}'),
('w_katana_thunder','weapon','B',210,11,22,1,'katana',null,true,'{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"}'),
('w_katana_ice','weapon','B',210,11,22,1,'katana',null,true,'{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"}'),
('w_secret_ember','weapon','S',190,12,22,1,'longsword',null,false,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_secret_tide','weapon','S',170,10,20,3,'bow',null,false,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_secret_storm','weapon','S',180,12,24,1,'lance',null,false,'{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"}'),
('w_secret_frost','weapon','S',160,10,18,1,'dagger',null,false,'{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"}'),
('w_secret_solar','weapon','S',170,11,21,2,'handgun',null,false,'{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"}'),
('w_hero_sword','weapon','SSS',300,16,30,1,'greatsword',null,false,'{"type":"greatsword","name":"旋風斬り","description":"周囲8マスを斬り、敵を1マス押し戻す。命中したモンスター1体につきHP10回復","color":16740978,"chargeSteps":100,"range":1,"multiplier":1.45,"sound":"skillGreatsword"}'),
('w_dagger_fire','weapon','D',120,6,14,1,'dagger',null,true,'{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"}'),
('w_dagger_water','weapon','D',120,6,14,1,'dagger',null,true,'{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"}'),
('w_dagger_thunder','weapon','D',114,7,15,1,'dagger',null,true,'{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"}'),
('w_dagger_ice','weapon','D',126,6,14,1,'dagger',null,true,'{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"}'),
('w_longsword_fire','weapon','C',180,9,19,1,'longsword',null,true,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_longsword_water','weapon','C',192,9,18,1,'longsword',null,true,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_longsword_thunder','weapon','B',168,11,22,1,'longsword',null,true,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_longsword_ice','weapon','B',186,10,21,1,'longsword',null,true,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_bow_fire','weapon','A',126,11,23,3,'bow',null,true,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_bow_water','weapon','A',138,10,22,3,'bow',null,true,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_bow_thunder','weapon','A',120,12,24,3,'bow',null,true,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_bow_ice','weapon','A',132,11,23,3,'bow',null,true,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_dual_sword_fire','weapon','S',144,8,16,1,'dual_sword',null,true,'{"type":"dual_sword","name":"十字絶閃","description":"前方5マスを貫通する斬撃を3連発・各発は通常攻撃の1.5倍","color":16753135,"chargeSteps":100,"range":5,"multiplier":1.5,"sound":"skillDual"}'),
('w_dual_sword_water','weapon','S',156,8,15,1,'dual_sword',null,true,'{"type":"dual_sword","name":"十字絶閃","description":"前方5マスを貫通する斬撃を3連発・各発は通常攻撃の1.5倍","color":16753135,"chargeSteps":100,"range":5,"multiplier":1.5,"sound":"skillDual"}'),
('w_dual_sword_thunder','weapon','S',138,9,17,1,'dual_sword',null,true,'{"type":"dual_sword","name":"十字絶閃","description":"前方5マスを貫通する斬撃を3連発・各発は通常攻撃の1.5倍","color":16753135,"chargeSteps":100,"range":5,"multiplier":1.5,"sound":"skillDual"}'),
('w_dual_sword_ice','weapon','S',150,8,16,1,'dual_sword',null,true,'{"type":"dual_sword","name":"十字絶閃","description":"前方5マスを貫通する斬撃を3連発・各発は通常攻撃の1.5倍","color":16753135,"chargeSteps":100,"range":5,"multiplier":1.5,"sound":"skillDual"}'),
('w_handgun_fire','weapon','C',108,9,19,2,'handgun',null,true,'{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"}'),
('w_handgun_water','weapon','C',114,8,19,2,'handgun',null,true,'{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"}'),
('w_handgun_thunder','weapon','B',102,11,22,2,'handgun',null,true,'{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"}'),
('w_handgun_ice','weapon','B',111,10,21,2,'handgun',null,true,'{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"}'),
('w_iron_dagger','weapon','D',150,5,12,1,'dagger',40,true,'{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"}'),
('w_shadow_stiletto','weapon','C',132,7,15,1,'dagger',100,true,'{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"}'),
('w_sawtooth_dirk','weapon','B',138,9,18,1,'dagger',null,true,'{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"}'),
('w_moon_fang','weapon','A',144,11,22,1,'dagger',null,true,'{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"}'),
('w_assassin_requiem','weapon','S',156,13,25,1,'dagger',null,true,'{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"}'),
('w_soldier_blade','weapon','D',180,6,14,1,'longsword',40,true,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_knight_sword','weapon','C',210,8,17,1,'longsword',100,true,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_rune_saber','weapon','B',198,10,21,1,'longsword',null,true,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_paladin_edge','weapon','A',216,12,25,1,'longsword',null,true,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_black_oath','weapon','S',228,15,29,1,'longsword',null,true,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_iron_pike','weapon','D',160,6,15,1,'lance',40,true,'{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"}'),
('w_royal_spear','weapon','C',174,8,18,1,'lance',100,true,'{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"}'),
('w_bone_lance','weapon','B',174,10,20,1,'lance',null,true,'{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"}'),
('w_drill_lance','weapon','A',186,12,26,1,'lance',null,true,'{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"}'),
('w_dragon_lance','weapon','S',204,15,30,1,'lance',null,true,'{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"}'),
('w_hunter_bow','weapon','D',126,5,13,3,'bow',40,true,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_composite_bow','weapon','C',138,8,17,3,'bow',100,true,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_blackwood_bow','weapon','B',144,10,21,3,'bow',null,true,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_royal_bow','weapon','A',150,11,24,3,'bow',null,true,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_siege_arbalest','weapon','S',168,14,29,3,'bow',null,true,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_blackpowder_handgun','weapon','D',126,7,16,2,'handgun',40,true,'{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"}'),
('w_rusted_greatsword','weapon','D',195,7,16,1,'greatsword',40,true,'{"type":"greatsword","name":"旋風斬り","description":"周囲8マスを斬り、敵を1マス押し戻す。命中したモンスター1体につきHP10回復","color":16740978,"chargeSteps":100,"range":1,"multiplier":1.45,"sound":"skillGreatsword"}'),
('w_executioner_blade','weapon','C',210,10,21,1,'greatsword',100,true,'{"type":"greatsword","name":"旋風斬り","description":"周囲8マスを斬り、敵を1マス押し戻す。命中したモンスター1体につきHP10回復","color":16740978,"chargeSteps":100,"range":1,"multiplier":1.45,"sound":"skillGreatsword"}'),
('w_titan_cleaver','weapon','B',225,12,25,1,'greatsword',null,true,'{"type":"greatsword","name":"旋風斬り","description":"周囲8マスを斬り、敵を1マス押し戻す。命中したモンスター1体につきHP10回復","color":16740978,"chargeSteps":100,"range":1,"multiplier":1.45,"sound":"skillGreatsword"}'),
('w_holy_greatsword','weapon','A',240,14,28,1,'greatsword',null,true,'{"type":"greatsword","name":"旋風斬り","description":"周囲8マスを斬り、敵を1マス押し戻す。命中したモンスター1体につきHP10回復","color":16740978,"chargeSteps":100,"range":1,"multiplier":1.45,"sound":"skillGreatsword"}'),
('w_grand_breaker','weapon','S',225,14,29,1,'greatsword',null,true,'{"type":"greatsword","name":"旋風斬り","description":"周囲8マスを斬り、敵を1マス押し戻す。命中したモンスター1体につきHP10回復","color":16740978,"chargeSteps":100,"range":1,"multiplier":1.45,"sound":"skillGreatsword"}'),
('w_hw_candy','weapon','C',220,8,17,1,'longsword',null,false,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_hw_lantern','weapon','B',210,10,21,1,'lance',null,false,'{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"}'),
('w_hw_bat','weapon','A',200,12,24,3,'bow',null,false,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_hw_coffin','weapon','A',240,14,28,1,'greatsword',null,false,'{"type":"greatsword","name":"旋風斬り","description":"周囲8マスを斬り、敵を1マス押し戻す。命中したモンスター1体につきHP10回復","color":16740978,"chargeSteps":100,"range":1,"multiplier":1.45,"sound":"skillGreatsword"}'),
('w_hw_harvest','weapon','S',260,16,30,1,'longsword',null,false,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_hw_emedral','weapon','SSS',300,16,30,3,'bow',null,false,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_light_katana_c','weapon','C',195,9,18,1,'katana',null,true,'{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"}'),
('w_dark_katana_c','weapon','C',195,9,18,1,'katana',null,true,'{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"}'),
('w_light_katana_b','weapon','B',210,11,22,1,'katana',null,true,'{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"}'),
('w_dark_katana_b','weapon','B',210,11,22,1,'katana',null,true,'{"type":"katana","name":"風牙","description":"前方3マスに竜巻を送り、敵を空いているマスへ1マス押し戻す。成功した敵1体につき次のチャージを5歩短縮","color":10284784,"chargeSteps":100,"range":3,"multiplier":1.35,"sound":"skillLance"}'),
('w_light_longsword_s','weapon','S',190,12,22,1,'longsword',null,true,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_dark_longsword_s','weapon','S',190,12,22,1,'longsword',null,true,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_light_bow_s','weapon','S',170,10,20,3,'bow',null,true,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_dark_bow_s','weapon','S',170,10,20,3,'bow',null,true,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_light_lance_s','weapon','S',180,12,24,1,'lance',null,true,'{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"}'),
('w_dark_lance_s','weapon','S',180,12,24,1,'lance',null,true,'{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"}'),
('w_light_dagger_s','weapon','S',160,10,18,1,'dagger',null,true,'{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"}'),
('w_dark_dagger_s','weapon','S',160,10,18,1,'dagger',null,true,'{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"}'),
('w_light_handgun_s','weapon','S',170,11,21,2,'handgun',null,true,'{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"}'),
('w_dark_handgun_s','weapon','S',170,11,21,2,'handgun',null,true,'{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"}'),
('w_light_dagger_d','weapon','D',120,6,14,1,'dagger',null,true,'{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"}'),
('w_dark_dagger_d','weapon','D',120,6,14,1,'dagger',null,true,'{"type":"dagger","name":"零刻領域","description":"5ターン時間停止。終了時に正面を攻撃。背後なら先に敵最大HPの5%固定ダメージ、その後に通常攻撃2倍","color":12094719,"chargeSteps":100,"range":3,"multiplier":0,"sound":"clockTick"}'),
('w_light_longsword_c','weapon','C',180,9,19,1,'longsword',null,true,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_dark_longsword_c','weapon','C',180,9,19,1,'longsword',null,true,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_light_longsword_b','weapon','B',168,11,22,1,'longsword',null,true,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_dark_longsword_b','weapon','B',168,11,22,1,'longsword',null,true,'{"type":"longsword","name":"扇斬り","description":"正面・斜め前の3マスを斬り、HPを70回復","color":7317759,"chargeSteps":100,"range":1,"multiplier":1.3,"sound":"skillLongsword"}'),
('w_light_bow_a','weapon','A',126,11,23,3,'bow',null,true,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_dark_bow_a','weapon','A',126,11,23,3,'bow',null,true,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_light_dual_sword_s','weapon','S',144,8,16,1,'dual_sword',null,true,'{"type":"dual_sword","name":"十字絶閃","description":"前方5マスを貫通する斬撃を3連発・各発は通常攻撃の1.5倍","color":16753135,"chargeSteps":100,"range":5,"multiplier":1.5,"sound":"skillDual"}'),
('w_dark_dual_sword_s','weapon','S',144,8,16,1,'dual_sword',null,true,'{"type":"dual_sword","name":"十字絶閃","description":"前方5マスを貫通する斬撃を3連発・各発は通常攻撃の1.5倍","color":16753135,"chargeSteps":100,"range":5,"multiplier":1.5,"sound":"skillDual"}'),
('w_light_handgun_c','weapon','C',108,9,19,2,'handgun',null,true,'{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"}'),
('w_dark_handgun_c','weapon','C',108,9,19,2,'handgun',null,true,'{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"}'),
('w_light_handgun_b','weapon','B',102,11,22,2,'handgun',null,true,'{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"}'),
('w_dark_handgun_b','weapon','B',102,11,22,2,'handgun',null,true,'{"type":"handgun","name":"五連射","description":"前方3マス以内の敵1体へ5発・生存時に防御10%低下を3ターン","color":16755808,"chargeSteps":100,"range":3,"multiplier":0.65,"sound":"skillHandgun"}'),
('w_light_lance_b','weapon','B',210,10,21,1,'lance',null,true,'{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"}'),
('w_dark_lance_b','weapon','B',210,10,21,1,'lance',null,true,'{"type":"lance","name":"貫通突き","description":"東西南北各2マスを攻撃・攻撃力20%低下を3ターン","color":15779678,"chargeSteps":100,"range":2,"multiplier":1.35,"sound":"skillLance"}'),
('w_light_greatsword_a','weapon','A',240,14,28,1,'greatsword',null,true,'{"type":"greatsword","name":"旋風斬り","description":"周囲8マスを斬り、敵を1マス押し戻す。命中したモンスター1体につきHP10回復","color":16740978,"chargeSteps":100,"range":1,"multiplier":1.45,"sound":"skillGreatsword"}'),
('w_dark_greatsword_a','weapon','A',240,14,28,1,'greatsword',null,true,'{"type":"greatsword","name":"旋風斬り","description":"周囲8マスを斬り、敵を1マス押し戻す。命中したモンスター1体につきHP10回復","color":16740978,"chargeSteps":100,"range":1,"multiplier":1.45,"sound":"skillGreatsword"}'),
('w_light_bow_sss','weapon','SSS',300,16,30,3,'bow',null,true,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('w_dark_bow_sss','weapon','SSS',300,16,30,3,'bow',null,true,'{"type":"bow","name":"穿ち矢","description":"前方7マス以内の敵1体を攻撃し、2ターンスタン","color":7657610,"chargeSteps":100,"range":7,"multiplier":1.8,"sound":"skillBow"}'),
('s_iron_round','shield','D',65,null,null,null,null,40,true,null),
('s_mirror_silver','shield','C',55,null,null,null,null,null,true,null),
('s_thorn_guard','shield','B',70,null,null,null,null,null,true,null),
('s_chrono_guard','shield','A',75,null,null,null,null,null,true,null),
('s_seraph_guard','shield','S',90,null,null,null,null,null,true,null),
('s_flame_aegis','shield','C',60,null,null,null,null,null,true,null),
('s_tidal_aegis','shield','C',64,null,null,null,null,null,true,null),
('s_storm_aegis','shield','B',62,null,null,null,null,null,true,null),
('s_frost_aegis','shield','B',70,null,null,null,null,null,true,null),
('s_oak_guard','shield','D',85,null,null,null,null,40,true,null),
('s_scout_guard','shield','D',55,null,null,null,null,40,true,null),
('s_steel_bastion','shield','C',95,null,null,null,null,null,true,null),
('s_pilgrim_guard','shield','C',70,null,null,null,null,null,true,null),
('s_duelist_guard','shield','B',85,null,null,null,null,null,true,null),
('s_watchman_guard','shield','B',100,null,null,null,null,null,true,null),
('s_sun_guard','shield','A',110,null,null,null,null,null,true,null),
('s_moon_guard','shield','A',100,null,null,null,null,null,true,null),
('s_requiem_guard','shield','S',125,null,null,null,null,null,true,null),
('s_prism_guard','shield','S',130,null,null,null,null,null,true,null),
('s_ember_guard','shield','A',110,null,null,null,null,null,true,null),
('s_pearl_guard','shield','A',115,null,null,null,null,null,true,null),
('s_thunder_crown','shield','S',125,null,null,null,null,null,true,null),
('s_glacier_guard','shield','S',145,null,null,null,null,null,true,null),
('s_arcadia_guard','shield','SSS',300,null,null,null,null,null,false,null),
('s_hw_pumpkin','shield','C',180,null,null,null,null,null,false,null),
('s_hw_grave','shield','B',200,null,null,null,null,null,false,null),
('s_hw_moon','shield','A',210,null,null,null,null,null,false,null),
('s_hw_coffin','shield','A',230,null,null,null,null,null,false,null),
('s_hw_harvest','shield','S',260,null,null,null,null,null,false,null),
('s_hw_emerald','shield','SSS',300,null,null,null,null,null,false,null),
('s_light_c','shield','C',60,null,null,null,null,null,true,null),
('s_dark_c','shield','C',60,null,null,null,null,null,true,null),
('s_light_b','shield','B',62,null,null,null,null,null,true,null),
('s_dark_b','shield','B',62,null,null,null,null,null,true,null),
('s_light_a','shield','A',110,null,null,null,null,null,true,null),
('s_dark_a','shield','A',110,null,null,null,null,null,true,null),
('s_light_s','shield','S',125,null,null,null,null,null,true,null),
('s_dark_s','shield','S',125,null,null,null,null,null,true,null),
('s_light_sss','shield','SSS',300,null,null,null,null,null,true,null),
('s_dark_sss','shield','SSS',300,null,null,null,null,null,true,null),
('armor_dawn','armor','SS',0,null,null,null,null,null,true,null),
('armor_crimson','armor','SSS',0,null,null,null,null,null,true,null),
('armor_aqua','armor','SSS',0,null,null,null,null,null,true,null),
('armor_leather','armor','D',0,null,null,null,null,40,true,null),
('armor_chain','armor','C',0,null,null,null,null,null,true,null),
('armor_plate','armor','B',0,null,null,null,null,null,true,null),
('armor_arcane','armor','A',0,null,null,null,null,null,true,null),
('armor_pumpkin_male','armor','A',0,null,null,null,null,null,true,null),
('armor_pumpkin_female','armor','A',0,null,null,null,null,null,true,null),
('armor_dragon','armor','S',0,null,null,null,null,null,true,null),
('n_amber','necklace','D',0,null,null,null,null,80,true,null),
('n_jade','necklace','C',0,null,null,null,null,null,true,null),
('n_sapphire','necklace','B',0,null,null,null,null,null,true,null),
('n_amethyst','necklace','A',0,null,null,null,null,null,true,null),
('n_ruby','necklace','S',0,null,null,null,null,null,true,null),
('n_opal','necklace','SS',0,null,null,null,null,null,true,null),
('n_celestial','necklace','SSS',0,null,null,null,null,null,true,null),
('skill_drink','item','D',0,null,null,null,null,50,false,null),
('potion','item','D',0,null,null,null,null,10,false,null),
('torch','item','D',0,null,null,null,null,null,false,null),
('mystery_bread','item','D',0,null,null,null,null,null,false,null),
('dynamite','item','D',0,null,null,null,null,null,false,null),
('warp','item','D',0,null,null,null,null,null,false,null),
('revive','item','D',0,null,null,null,null,null,false,null),
('candykey','item','D',0,null,null,null,null,null,false,null),
('floorkey','item','D',0,null,null,null,null,null,false,null),
('seal','item','D',0,null,null,null,null,null,false,null),
('stone','item','D',0,null,null,null,null,null,false,null),
('shieldstone','item','D',0,null,null,null,null,null,false,null),
('slime_scroll','item','D',0,null,null,null,null,null,false,null),
('boss5_scroll','item','D',0,null,null,null,null,null,false,null),
('invis','item','D',0,null,null,null,null,null,false,null),
('repair','item','D',0,null,null,null,null,30,false,null)
on conflict(key) do update set category=excluded.category,grade=excluded.grade,dur_max=excluded.dur_max,attack_min=excluded.attack_min,attack_max=excluded.attack_max,attack_range=excluded.attack_range,weapon_type=excluded.weapon_type,shop_price=excluded.shop_price,gacha_pool=excluded.gacha_pool,skill=excluded.skill;
-- END GENERATED CATALOG
commit;
