begin;
alter table public.online_training_hits add column weapon_key text;
alter table public.online_ground_items drop constraint online_ground_items_category_check;
alter table public.online_ground_items drop constraint online_ground_items_check;
alter table public.online_ground_items add check(category in ('item','weapon','armor','shield'));
alter table public.online_ground_items add check((category='item' and kind='potion') or (category in ('weapon','armor','shield') and char_length(kind) between 1 and 100));
create function public.online_free_town_tile(origin_x integer,origin_y integer,owner_id uuid) returns table(tile_x integer,tile_y integer) language sql set search_path=public,pg_temp as $$
 select gx.x,gy.y from generate_series(1,23) as gx(x) cross join generate_series(1,17) as gy(y) where not public.online_town_blocked(gx.x,gy.y) and not exists(select 1 from public.online_presence presence where presence.user_id<>owner_id and presence.x=gx.x and presence.y=gy.y and presence.seen_at>now()-interval '20 seconds') order by abs(gx.x-origin_x)+abs(gy.y-origin_y),gy.y,gx.x limit 1;
$$;
revoke all on function public.online_free_town_tile(integer,integer,uuid) from public,anon,authenticated;
-- Resolve existing overlaps in the same transaction before new movement becomes available.
do $$declare position record;nx integer;ny integer;begin
 for position in select * from public.online_presence order by seen_at desc,user_id loop
  if exists(select 1 from public.online_presence other where other.user_id<>position.user_id and other.x=position.x and other.y=position.y and other.seen_at>now()-interval '20 seconds') then
   select tile_x,tile_y into nx,ny from public.online_free_town_tile(position.x,position.y,position.user_id);
   if nx is not null then update public.online_presence set x=nx,y=ny where user_id=position.user_id;end if;
  end if;
 end loop;
end $$;
create or replace function public.online_world(action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();p public.online_profiles;c public.online_characters;r public.online_presence;nx int;ny int;s int;n text;g text;msg text;k text;v boolean;d public.online_ground_items;cat public.online_catalog;max_hp integer;idx integer;combat public.online_catalog;training_damage integer;reach integer;distance integer;dx integer;dy integer;equipment_slot text;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'メールアカウントでログインしてください。';end if;
 perform pg_advisory_xact_lock(71390119);
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
   select tile_x,tile_y into nx,ny from public.online_free_town_tile(12,14,uid);
   if nx is null then raise exception '町が満員です。';end if;
   insert into public.online_presence(user_id,character_id,x,y) values(uid,c.id,nx,ny) on conflict(user_id) do update set character_id=c.id,x=excluded.x,y=excluded.y,dir='down',seen_at=now(),moved_at='epoch';
 elsif action='leave' then delete from public.online_presence where user_id=uid;
 elsif action in ('move','poll','chat','equip','use_item','drop_item','pickup_item','redeem_code','claim_item','drop_weapon','train','drop_equipment') then
   select * into r from public.online_presence where user_id=uid;
   select * into c from public.online_characters where id=r.character_id and user_id=uid;
   if c.id is null then raise exception 'キャラクターを選び、町に入場してください。';end if;
   if exists(select 1 from public.online_presence other where other.user_id<>uid and other.x=r.x and other.y=r.y and other.seen_at>now()-interval '20 seconds') then
     select tile_x,tile_y into nx,ny from public.online_free_town_tile(r.x,r.y,uid);
     if nx is null then raise exception '町が満員です。';end if;
     update public.online_presence set x=nx,y=ny where user_id=uid;r.x:=nx;r.y:=ny;
   end if;
   max_hp:=case when coalesce((c.gear->>'weapon')::boolean,false) and coalesce(c.gear->>'weapon_key','') like 'star_%' then 150 else 100 end;
   if action='move' then
     nx:=(payload->>'x')::int;ny:=(payload->>'y')::int;
     if nx is null or ny is null or abs(nx-r.x)+abs(ny-r.y)<>1 or public.online_town_blocked(nx,ny) or exists(select 1 from public.online_presence other where other.user_id<>uid and other.x=nx and other.y=ny and other.seen_at>now()-interval '20 seconds') then raise exception 'そこには移動できません。';end if;
     if r.moved_at>clock_timestamp()-interval '110 milliseconds' then raise exception '移動が速すぎます。';end if;
     update public.online_presence set x=nx,y=ny,dir=case when nx>r.x then 'right' when nx<r.x then 'left' when ny>r.y then 'down' else 'up' end,moved_at=clock_timestamp() where user_id=uid;
   elsif action='chat' then
     msg:=trim(payload->>'message');if msg is null or char_length(msg) not between 1 and 200 then raise exception '1〜200文字で入力してください。';end if;
     if exists(select 1 from public.online_messages where user_id=uid and created_at>now()-interval '2 seconds') then raise exception '少し待ってから送信してください。';end if;
     insert into public.online_messages(user_id,name,message,character_id) values(uid,c.name,msg,c.id);
   elsif action='train' then
     dx:=12-r.x;dy:=5-r.y;distance:=abs(dx)+abs(dy);
     select * into combat from public.online_catalog where key=regexp_replace(coalesce(c.gear->>'weapon_key','w_iron_dagger'),'^star_','') and category='weapon' and coalesce((c.gear->>'weapon')::boolean,false);
     reach:=coalesce(combat.attack_range,1);
     if distance<1 or distance>reach or (dx<>0 and dy<>0) then raise exception '練習樽の正面近くまで移動してください。';end if;
     for s in 1..distance-1 loop if public.online_town_blocked(r.x+sign(dx)::integer*s,r.y+sign(dy)::integer*s) then raise exception '間に障害物があります。';end if;end loop;
     if exists(select 1 from public.online_training_hits where user_id=uid and created_at>clock_timestamp()-interval '320 milliseconds') then raise exception '攻撃の間隔を少し空けてください。';end if;
     training_damage:=5+coalesce(combat.attack_min,0)+floor(random()*(9+coalesce(combat.attack_max,0)-coalesce(combat.attack_min,0)))::integer;
     n:=case when dx>0 then 'right' when dx<0 then 'left' when dy>0 then 'down' else 'up' end;
     insert into public.online_training_hits(user_id,character_id,damage,dir,weapon_key) values(uid,c.id,training_damage,n,case when (c.gear->>'weapon')::boolean then coalesce(c.gear->>'weapon_key','w_iron_dagger') else null end);
     update public.online_presence set dir=n where user_id=uid;
     delete from public.online_training_hits where id<(select coalesce(max(id),0)-100 from public.online_training_hits);
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
   elsif action in ('drop_weapon','drop_equipment') then
     equipment_slot:=case when action='drop_weapon' then 'weapon' else payload->>'slot' end;
     k:=payload->>'key';idx:=(payload->>'index')::integer;
     if equipment_slot is null or equipment_slot not in ('weapon','armor','shield') or k is null or idx is null or idx<0 or idx>=jsonb_array_length(c.equipment->equipment_slot) or (c.equipment->equipment_slot->>idx) is distinct from k then raise exception 'その装備は持っていません。持ち物を開き直してください。';end if;
     if (select count(*) from public.online_ground_items where dropped_by=uid)>=50 then raise exception '落とした装備を先に拾ってください。';end if;
     if exists(select 1 from public.online_ground_items where dropped_by=uid and created_at>clock_timestamp()-interval '250 milliseconds') then raise exception '少し待ってから落としてください。';end if;
     update public.online_characters set equipment=jsonb_set(equipment,array[equipment_slot],(equipment->equipment_slot)-idx),
       gear=case when coalesce(gear->>(equipment_slot||'_key'),case equipment_slot when 'weapon' then 'w_iron_dagger' when 'armor' then 'leather' end)=k then gear||jsonb_build_object(equipment_slot,false) else gear end,
       hp=case when equipment_slot='weapon' and coalesce(gear->>'weapon_key','w_iron_dagger')=k then least(hp,100) else hp end where id=c.id;
     insert into public.online_ground_items(kind,category,x,y,dropped_by) values(case when equipment_slot='armor' then 'armor_'||k else k end,equipment_slot,r.x,r.y,uid);
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
     if d.category in ('weapon','armor','shield') then
       if jsonb_array_length(c.equipment->d.category)>=200 then raise exception '武器の所持上限です。';end if;
       update public.online_characters set equipment=jsonb_set(equipment,array[d.category],(equipment->d.category)||jsonb_build_array(case when d.category='armor' then substr(d.kind,7) else d.kind end)) where id=c.id;
     else
       if coalesce((c.inventory->>d.kind)::int,0)>=9999 then raise exception 'これ以上持てません。';end if;
       update public.online_characters set inventory=jsonb_set(inventory,array[d.kind],to_jsonb(coalesce((inventory->>d.kind)::int,0)+1)) where id=c.id;
     end if;
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
 'players',coalesce((select jsonb_agg(t) from (select q.id character_id,q.name,q.gender,case when (q.gear->>'armor')::boolean then coalesce(q.gear->>'armor_key','leather') else 'leather' end armor,case when (q.gear->>'weapon')::boolean then coalesce(q.gear->>'weapon_key','w_iron_dagger') else null end weapon,case when coalesce((q.gear->>'shield')::boolean,false) then q.gear->>'shield_key' else null end shield,pres.x,pres.y,pres.dir from public.online_presence pres join public.online_characters q on q.id=pres.character_id where pres.seen_at>now()-interval '20 seconds')t),'[]'),
 'messages',coalesce((select jsonb_agg(t order by id) from(select id,name,message,character_id from public.online_messages order by id desc limit 50)t),'[]'),'drops',coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind,'category',category,'x',x,'y',y) order by created_at,id) from public.online_ground_items),'[]'),'trainingHits',coalesce((select jsonb_agg(t order by id) from(select id,character_id,damage,dir,weapon_key from public.online_training_hits order by id desc limit 40)t),'[]'),'superAccount',p.super_account);
end $$;
commit;
