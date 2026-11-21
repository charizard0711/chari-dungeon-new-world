begin;
create table public.online_market_listings(
 id uuid primary key default gen_random_uuid(),seller_id uuid not null references online_characters(id),
 seller_user_id uuid not null references auth.users(id),category text not null check(category in('weapon','armor','shield','necklace','item')),
 item_key text not null,item_state jsonb,price int not null check(price between 1 and 10000000),
 status text not null default 'active' check(status in('active','sold','cancelled')),buyer_id uuid references online_characters(id),
 created_at timestamptz not null default clock_timestamp());
create index on public.online_market_listings(status,created_at desc);
create index on public.online_market_listings(seller_user_id,status);
create table public.online_commerce_receipts(user_id uuid references auth.users(id),request_id uuid,action text not null,result jsonb not null,created_at timestamptz not null default clock_timestamp(),primary key(user_id,request_id));
alter table public.online_market_listings enable row level security;
alter table public.online_commerce_receipts enable row level security;
revoke all on public.online_market_listings,public.online_commerce_receipts from public,anon,authenticated;

create function public.online_town_commerce(action text,payload jsonb default '{}')returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();c online_characters;p online_presence;l online_market_listings;item jsonb;cat text;k text;idx int;price int;n int;prize int;roll int;rid uuid;result jsonb;previous online_commerce_receipts;page int;receiver uuid;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'ログインしてください。';end if;
 if action not in('market_list','market_sell','market_buy','market_cancel','lottery_info','lottery_draw') then raise exception '操作を確認してください。';end if;
 -- Same lock order as all inventory/movement actions: payment and escrow move atomically.
 perform pg_advisory_xact_lock(71390119);perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if action not in('market_list','lottery_info') then
  rid:=(payload->>'requestId')::uuid;if rid is null then raise exception '操作IDが必要です。';end if;
  select * into previous from online_commerce_receipts where user_id=uid and request_id=rid;
  if found then if previous.action<>action then raise exception '操作IDが一致しません。';end if;return previous.result;end if;
 end if;
 select * into p from online_presence where user_id=uid;
 select * into c from online_characters where id=p.character_id and user_id=uid for update;
 if c.id is null or p.location<>'town' then raise exception '町で利用してください。';end if;
 if action like 'market_%' and abs(p.x-22)+abs(p.y-7)>2 then raise exception '売買モニターの近くで操作してください。';end if;
 if action like 'lottery_%' and abs(p.x-17)+abs(p.y-18)>2 then raise exception '星くじ売り場の近くで操作してください。';end if;
 perform online_sync_instances(c.id);select * into c from online_characters where id=c.id;
 if action='market_sell' then
  if (select count(*) from online_market_listings where seller_user_id=uid and status='active')>=3 then raise exception '出品は1アカウント3品までです。';end if;
  price:=(payload->>'price')::int;cat:=payload->>'category';
  if price is null or price<1 or price>10000000 then raise exception '価格は1〜10,000,000Gです。';end if;
  if cat='item' then
   k:=payload->>'key';if not exists(select 1 from online_catalog where key=k and category='item') or coalesce((c.inventory->>k)::int,0)<1 then raise exception '所持していないアイテムです。';end if;
   update online_characters set inventory=jsonb_set(inventory,array[k],to_jsonb((inventory->>k)::int-1))where id=c.id;
  elsif cat in('weapon','armor','shield','necklace') then
   select ordinality::int-1,value into idx,item from jsonb_array_elements(c.instances->cat)with ordinality where value->>'id'=payload->>'instanceId';
   if item is null then raise exception '所持していない装備です。';end if;
   if coalesce((c.gear->>cat)::boolean,false) and c.gear->>(cat||'_instance_id')=item->>'id' then raise exception '装備を外してから出品してください。';end if;
   k:=item->>'key';update online_characters set equipment=jsonb_set(equipment,array[cat],(equipment->cat)-idx),instances=jsonb_set(instances,array[cat],(instances->cat)-idx)where id=c.id;
  else raise exception '出品するアイテムを選んでください。';end if;
  insert into online_market_listings(seller_id,seller_user_id,category,item_key,item_state,price)values(c.id,uid,cat,k,item,price)returning * into l;
  perform online_sync_instances(c.id);result:=jsonb_build_object('message','出品しました。','listingId',l.id);
 elsif action in('market_buy','market_cancel') then
  select * into l from online_market_listings where id=(payload->>'listingId')::uuid for update;
  if l.id is null or l.status<>'active' then raise exception 'この出品は終了しています。';end if;
  if action='market_buy' then
   if l.seller_user_id=uid then raise exception '自分の出品は購入できません。';end if;
   if c.gold<l.price then raise exception '所持金が足りません。';end if;
   if (select gold::bigint+l.price from online_characters where id=l.seller_id)>2000000000 then raise exception '出品者の所持金が上限のため購入できません。';end if;
   receiver:=c.id;
  else
   if l.seller_id<>c.id or l.seller_user_id<>uid then raise exception '出品したキャラクターで取り消してください。';end if;
   receiver:=c.id;
  end if;
  if l.category='item' then
   if coalesce((c.inventory->>l.item_key)::int,0)>=9999 then raise exception '所持上限です。';end if;
   update online_characters set inventory=jsonb_set(inventory,array[l.item_key],to_jsonb(coalesce((inventory->>l.item_key)::int,0)+1))where id=receiver;
  else
   if coalesce(jsonb_array_length(c.instances->l.category),0)>=200 then raise exception '装備の所持上限です。';end if;
   update online_characters set equipment=jsonb_set(equipment,array[l.category],coalesce(equipment->l.category,'[]')||jsonb_build_array(l.item_key)),instances=jsonb_set(instances,array[l.category],coalesce(instances->l.category,'[]')||jsonb_build_array(l.item_state))where id=receiver;
  end if;
  if action='market_buy' then
   update online_characters set gold=gold-l.price where id=c.id;update online_characters set gold=gold+l.price where id=l.seller_id;
   update online_market_listings set status='sold',buyer_id=c.id where id=l.id;result:=jsonb_build_object('message','購入しました。');
  else update online_market_listings set status='cancelled'where id=l.id;result:=jsonb_build_object('message','取り消しました。アイテムを返却しました。');end if;
  perform online_sync_instances(c.id);
 elsif action='lottery_draw' then
  if c.gold<1000 then raise exception '1,000Gが必要です。';end if;
  if c.gold>1999000000 then raise exception '所持金が上限に近いため購入できません。';end if;
  if exists(select 1 from online_commerce_receipts receipt where receipt.user_id=uid and receipt.action='lottery_draw'and created_at>clock_timestamp()-interval '2 seconds') then raise exception '抽選中です。少し待ってください。';end if;
  roll:=floor(random()*10000)::int;
  prize:=case when roll<1 then 1000000 when roll<10 then 100000 when roll<100 then 10000 when roll<1000 then 2000 when roll<3000 then 1000 else 0 end;
  update online_characters set gold=gold-1000+prize where id=c.id;
  result:=jsonb_build_object('prize',prize,'message',case when prize=0 then '今回は残念。はずれです。'else format('%sG 当選！',prize)end);
 end if;
 if rid is not null then insert into online_commerce_receipts(user_id,request_id,action,result)values(uid,rid,action,result);return result;end if;
 if action='market_list' then
  page:=greatest(0,least(10000,coalesce((payload->>'page')::int,0)));
  return jsonb_build_object('listings',coalesce((select jsonb_agg(to_jsonb(q))from(select ml.id,ml.seller_id,ml.category,ml.item_key,ml.item_state,ml.price,ml.created_at,sc.name seller_name,ml.seller_user_id=uid mine from online_market_listings ml join online_characters sc on sc.id=ml.seller_id where ml.status='active'order by ml.created_at desc,ml.id limit 30 offset page*30)q),'[]'),
   'mine',coalesce((select jsonb_agg(to_jsonb(q))from(select ml.id,ml.seller_id,ml.category,ml.item_key,ml.item_state,ml.price,true mine from online_market_listings ml where ml.seller_user_id=uid and status='active')q),'[]'),
   'total',(select count(*)from online_market_listings where status='active'),'gold',c.gold);
 end if;
 return jsonb_build_object('gold',c.gold,'history',coalesce((select jsonb_agg(q.result)from(select receipt.result from online_commerce_receipts receipt where receipt.user_id=uid and receipt.action='lottery_draw'order by created_at desc limit 10)q),'[]'));
end$$;
revoke all on function public.online_town_commerce(text,jsonb) from public,anon;
grant execute on function public.online_town_commerce(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
