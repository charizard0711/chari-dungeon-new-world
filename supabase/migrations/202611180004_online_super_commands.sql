begin;
create table public.online_catalog(key text primary key,category text not null check(category in ('weapon','armor','shield','item')));
alter table public.online_catalog enable row level security;
revoke all on public.online_catalog from public,anon,authenticated;
insert into public.online_catalog(key,category) values
('w_katana_iron','weapon'),
('w_katana_mist','weapon'),
('w_katana_moon','weapon'),
('w_katana_sun','weapon'),
('w_katana_dragon','weapon'),
('w_katana_sky','weapon'),
('w_katana_divine','weapon'),
('w_katana_fire','weapon'),
('w_katana_water','weapon'),
('w_katana_thunder','weapon'),
('w_katana_ice','weapon'),
('w_secret_ember','weapon'),
('w_secret_tide','weapon'),
('w_secret_storm','weapon'),
('w_secret_frost','weapon'),
('w_secret_solar','weapon'),
('w_hero_sword','weapon'),
('w_dagger_fire','weapon'),
('w_dagger_water','weapon'),
('w_dagger_thunder','weapon'),
('w_dagger_ice','weapon'),
('w_longsword_fire','weapon'),
('w_longsword_water','weapon'),
('w_longsword_thunder','weapon'),
('w_longsword_ice','weapon'),
('w_bow_fire','weapon'),
('w_bow_water','weapon'),
('w_bow_thunder','weapon'),
('w_bow_ice','weapon'),
('w_dual_sword_fire','weapon'),
('w_dual_sword_water','weapon'),
('w_dual_sword_thunder','weapon'),
('w_dual_sword_ice','weapon'),
('w_handgun_fire','weapon'),
('w_handgun_water','weapon'),
('w_handgun_thunder','weapon'),
('w_handgun_ice','weapon'),
('w_iron_dagger','weapon'),
('w_shadow_stiletto','weapon'),
('w_sawtooth_dirk','weapon'),
('w_moon_fang','weapon'),
('w_assassin_requiem','weapon'),
('w_soldier_blade','weapon'),
('w_knight_sword','weapon'),
('w_rune_saber','weapon'),
('w_paladin_edge','weapon'),
('w_black_oath','weapon'),
('w_iron_pike','weapon'),
('w_royal_spear','weapon'),
('w_bone_lance','weapon'),
('w_drill_lance','weapon'),
('w_dragon_lance','weapon'),
('w_hunter_bow','weapon'),
('w_composite_bow','weapon'),
('w_blackwood_bow','weapon'),
('w_royal_bow','weapon'),
('w_siege_arbalest','weapon'),
('w_blackpowder_handgun','weapon'),
('w_rusted_greatsword','weapon'),
('w_executioner_blade','weapon'),
('w_titan_cleaver','weapon'),
('w_holy_greatsword','weapon'),
('w_grand_breaker','weapon'),
('w_hw_candy','weapon'),
('w_hw_lantern','weapon'),
('w_hw_bat','weapon'),
('w_hw_coffin','weapon'),
('w_hw_harvest','weapon'),
('w_hw_emedral','weapon'),
('s_iron_round','shield'),
('s_mirror_silver','shield'),
('s_thorn_guard','shield'),
('s_chrono_guard','shield'),
('s_seraph_guard','shield'),
('s_flame_aegis','shield'),
('s_tidal_aegis','shield'),
('s_storm_aegis','shield'),
('s_frost_aegis','shield'),
('s_oak_guard','shield'),
('s_scout_guard','shield'),
('s_steel_bastion','shield'),
('s_pilgrim_guard','shield'),
('s_duelist_guard','shield'),
('s_watchman_guard','shield'),
('s_sun_guard','shield'),
('s_moon_guard','shield'),
('s_requiem_guard','shield'),
('s_prism_guard','shield'),
('s_ember_guard','shield'),
('s_pearl_guard','shield'),
('s_thunder_crown','shield'),
('s_glacier_guard','shield'),
('s_arcadia_guard','shield'),
('s_hw_pumpkin','shield'),
('s_hw_grave','shield'),
('s_hw_moon','shield'),
('s_hw_coffin','shield'),
('s_hw_harvest','shield'),
('s_hw_emerald','shield'),
('armor_leather','armor'),
('armor_chain','armor'),
('armor_plate','armor'),
('armor_arcane','armor'),
('armor_dragon','armor'),
('armor_dawn','armor'),
('armor_aqua','armor'),
('armor_crimson','armor'),
('armor_pumpkin_male','armor'),
('armor_pumpkin_female','armor'),
('skill_drink','item'),
('potion','item'),
('torch','item'),
('mystery_bread','item'),
('dynamite','item'),
('warp','item'),
('revive','item'),
('candykey','item'),
('floorkey','item'),
('seal','item'),
('stone','item'),
('shieldstone','item'),
('slime_scroll','item'),
('boss5_scroll','item'),
('invis','item'),
('repair','item');
alter table public.online_characters drop constraint online_characters_hp_check;
alter table public.online_characters add check(hp between 0 and 150);
alter table public.online_characters add column equipment jsonb not null default '{"weapon":["w_iron_dagger"],"armor":["leather"],"shield":[]}',add column catalog_unlocked boolean not null default false;
create or replace function public.online_world(action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();p public.online_profiles;c public.online_characters;r public.online_presence;nx int;ny int;s int;n text;g text;msg text;k text;v boolean;d public.online_ground_items;cat public.online_catalog;max_hp integer;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'メールアカウントでログインしてください。';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 insert into public.online_profiles(user_id,name) values(uid,'冒険者') on conflict(user_id) do nothing;
 select * into p from public.online_profiles where user_id=uid;
 if action='create_character' then
   n:=trim(payload->>'name');g:=payload->>'gender';
   if n is null or char_length(n) not between 2 and 12 or n~'[[:cntrl:]]' or g is null or g not in ('male','female') then raise exception '名前は2〜12文字、男女を選択してください。';end if;
   select x into s from generate_series(1,2)x where not exists(select 1 from public.online_characters where user_id=uid and slot=x) order by x limit 1;
   if s is null then raise exception 'キャラクターは2体まで作成できます。';end if;
   insert into public.online_characters(user_id,slot,name,gender) values(uid,s,n,g);
 elsif action='join' then
   select * into c from public.online_characters where id=(payload->>'character_id')::uuid and user_id=uid;
   if c.id is null then raise exception '自分のキャラクターを選択してください。';end if;
   insert into public.online_presence(user_id,character_id,x,y) values(uid,c.id,12,14) on conflict(user_id) do update set character_id=c.id,x=12,y=14,dir='down',seen_at=now(),moved_at='epoch';
 elsif action='leave' then delete from public.online_presence where user_id=uid;
 elsif action in ('move','poll','chat','equip','use_item','drop_item','pickup_item','redeem_code','claim_item') then
   select * into r from public.online_presence where user_id=uid;
   select * into c from public.online_characters where id=r.character_id and user_id=uid;
   if c.id is null then raise exception 'キャラクターを選び、町に入場してください。';end if;
   max_hp:=case when coalesce((c.gear->>'weapon')::boolean,false) and coalesce(c.gear->>'weapon_key','') like 'star_%' then 150 else 100 end;
   if action='move' then
     nx:=(payload->>'x')::int;ny:=(payload->>'y')::int;
     if nx is null or ny is null or abs(nx-r.x)+abs(ny-r.y)<>1 or public.online_town_blocked(nx,ny) then raise exception 'そこには移動できません。';end if;
     if r.moved_at>clock_timestamp()-interval '110 milliseconds' then raise exception '移動が速すぎます。';end if;
     update public.online_presence set x=nx,y=ny,dir=case when nx>r.x then 'right' when nx<r.x then 'left' when ny>r.y then 'down' else 'up' end,moved_at=clock_timestamp() where user_id=uid;
   elsif action='chat' then
     msg:=trim(payload->>'message');if msg is null or char_length(msg) not between 1 and 200 then raise exception '1〜200文字で入力してください。';end if;
     if exists(select 1 from public.online_messages where user_id=uid and created_at>now()-interval '2 seconds') then raise exception '少し待ってから送信してください。';end if;
     insert into public.online_messages(user_id,name,message) values(uid,c.name,msg);
   elsif action='redeem_code' then
     if not p.super_account then raise exception 'スーパーアカウント専用です。';end if;
     if payload->>'code'='19960711' then
       update public.online_characters set catalog_unlocked=true where id=c.id;
     elsif payload->>'code'='11111111' then
       update public.online_characters set hp=max_hp where id=c.id;
     else raise exception '町で使えるコードではありません。';end if;
   elsif action='claim_item' then
     if not p.super_account or not c.catalog_unlocked then raise exception 'スーパーアカウントでコードを入力してください。';end if;
     select * into cat from public.online_catalog where key=payload->>'key';
     if cat.key is null then raise exception '登録されていないアイテムです。';end if;
     if cat.category='item' then
       if coalesce((c.inventory->>cat.key)::int,0)>=9999 then raise exception 'これ以上持てません。';end if;
       update public.online_characters set inventory=jsonb_set(inventory,array[cat.key],to_jsonb(coalesce((inventory->>cat.key)::int,0)+1)) where id=c.id;
     else
       k:=cat.category;n:=case when k='armor' then substr(cat.key,7) else cat.key end;
       if k='weapon' and coalesce((payload->>'starred')::boolean,false) then n:='star_'||n;end if;
       if (c.equipment->k)?n then raise exception 'その装備はすでに持っています。';end if;
       if jsonb_array_length(c.equipment->k)>=200 then raise exception '装備の所持上限です。';end if;
       update public.online_characters set equipment=jsonb_set(equipment,array[k],(equipment->k)||jsonb_build_array(n)) where id=c.id;
     end if;
   elsif action='equip' then
     k:=payload->>'slot';v:=(payload->>'equipped')::boolean;
     if k is null or k not in ('weapon','armor','shield') or v is null then raise exception '装備を確認してください。';end if;
     n:=coalesce(payload->>'key',c.gear->>(k||'_key'),case k when 'weapon' then 'w_iron_dagger' when 'armor' then 'leather' end);
     if v and (n is null or not (c.equipment->k)?n) then raise exception '持っていない装備は使えません。';end if;
     update public.online_characters set gear=gear||jsonb_build_object(k,v,k||'_key',n),hp=least(hp,case when k='weapon' then case when v and n like 'star_%' then 150 else 100 end else max_hp end) where id=c.id;
   elsif action='drop_item' then
     k:=payload->>'kind';
     if k is null or k<>'potion' or coalesce((c.inventory->>k)::int,0)<1 then raise exception '落とせるアイテムがありません。';end if;
     if (select count(*) from public.online_ground_items where dropped_by=uid)>=50 then raise exception '落としたアイテムを先に拾ってください。';end if;
     if exists(select 1 from public.online_ground_items where dropped_by=uid and created_at>clock_timestamp()-interval '250 milliseconds') then raise exception '少し待ってから落としてください。';end if;
     update public.online_characters set inventory=jsonb_set(inventory,array[k],to_jsonb((inventory->>k)::int-1)) where id=c.id;
     insert into public.online_ground_items(kind,x,y,dropped_by) values(k,r.x,r.y,uid);
   elsif action='pickup_item' then
     select * into d from public.online_ground_items where id=(payload->>'drop_id')::uuid for update;
     if d.id is null then raise exception 'そのアイテムはすでに拾われています。';end if;
     if abs(d.x-r.x)+abs(d.y-r.y)>1 then raise exception 'アイテムの近くまで移動してください。';end if;
     if coalesce((c.inventory->>d.kind)::int,0)>=9999 then raise exception 'これ以上持てません。';end if;
     update public.online_characters set inventory=jsonb_set(inventory,array[d.kind],to_jsonb(coalesce((inventory->>d.kind)::int,0)+1)) where id=c.id;
     delete from public.online_ground_items where id=d.id;
   elsif action='use_item' then
     k:=payload->>'kind';
     if k is null or k<>'potion' or coalesce((c.inventory->>k)::int,0)<1 then raise exception 'そのアイテムは使えません。';end if;
     if c.hp>=max_hp then raise exception '体力は満タンです。';end if;
     update public.online_characters set hp=least(max_hp,hp+40),inventory=jsonb_set(inventory,array[k],to_jsonb((inventory->>k)::int-1)) where id=c.id;
   end if;
   update public.online_presence set seen_at=now() where user_id=uid;
 elsif action<>'list' then raise exception '未対応の操作です。';end if;
 select * into r from public.online_presence where user_id=uid;
 select * into c from public.online_characters where id=r.character_id and user_id=uid;
 return jsonb_build_object('characters',coalesce((select jsonb_agg(jsonb_build_object('id',id,'slot',slot,'name',name,'gender',gender,'hp',hp,'inventory',inventory,'gear',gear,'equipment',equipment,'catalogUnlocked',catalog_unlocked and p.super_account) order by slot) from public.online_characters where user_id=uid),'[]'),
 'active',case when c.id is null then null else jsonb_build_object('id',c.id,'slot',c.slot,'name',c.name,'gender',c.gender,'hp',c.hp,'inventory',c.inventory,'gear',c.gear,'equipment',c.equipment,'catalogUnlocked',c.catalog_unlocked and p.super_account) end,
 'players',coalesce((select jsonb_agg(t) from (select q.id character_id,q.name,q.gender,case when (q.gear->>'armor')::boolean then coalesce(q.gear->>'armor_key','leather') else 'leather' end armor,pres.x,pres.y,pres.dir from public.online_presence pres join public.online_characters q on q.id=pres.character_id where pres.seen_at>now()-interval '20 seconds')t),'[]'),
 'messages',coalesce((select jsonb_agg(t order by id) from(select id,name,message from public.online_messages order by id desc limit 50)t),'[]'),'drops',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'x',x,'y',y) order by created_at,id) from public.online_ground_items),'[]'),'superAccount',p.super_account);
end $$;
commit;
