begin;
alter table public.online_ground_items add column gold_amount integer check(gold_amount between 1 and 100000000);
create table public.online_friendships(
 id uuid primary key default gen_random_uuid(),requester uuid not null references auth.users(id) on delete cascade,recipient uuid not null references auth.users(id) on delete cascade,status text not null default 'pending' check(status in('pending','accepted')),created_at timestamptz not null default now(),check(requester<>recipient));
create unique index online_friendship_pair on public.online_friendships(least(requester,recipient),greatest(requester,recipient));
alter table public.online_friendships enable row level security;
revoke all on public.online_friendships from public,anon,authenticated;
alter function public.online_world(text,jsonb) rename to online_world_equipment;
revoke all on function public.online_world_equipment(text,jsonb) from public,anon,authenticated;
-- New acquisitions (shop and gacha) use the same one-percent variant chance. Transfers preserve the original.
do $$declare source text;begin
 select pg_get_functiondef('public.online_world_equipment(text,jsonb)'::regprocedure) into source;
 source:=replace(source,'action=''gacha'' and cat.category=''weapon'' and random()<.01','cat.category=''weapon'' and random()<.01');
 execute source;
end$$;
create function public.online_world(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();c public.online_characters;r public.online_presence;d public.online_ground_items;f public.online_friendships;other uuid;amount integer;i integer;j integer;refs jsonb;left_ref jsonb;right_ref jsonb;result jsonb;target_name text;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'メールアカウントでログインしてください。';end if;
 perform pg_advisory_xact_lock(71390119);perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if action in('swap_quick_slots','drop_gold','pickup_item') or action like 'friend_%' then
  result:=public.online_world_equipment('poll','{}');
  select * into r from public.online_presence where user_id=uid;
  select * into c from public.online_characters where id=r.character_id and user_id=uid;
  if c.id is null then raise exception '町に入場してください。';end if;
  if action='swap_quick_slots' then
   i:=(payload->>'from')::integer;j:=(payload->>'to')::integer;
   if i is null or j is null or i not between 0 and 19 or j not between 0 and 19 then raise exception 'ショートカットを確認してください。';end if;
   refs:=c.quick_slots;left_ref:=refs->i;right_ref:=refs->j;
   update public.online_characters set quick_slots=jsonb_set(jsonb_set(refs,array[i::text],right_ref),array[j::text],left_ref) where id=c.id;
  elsif action='drop_gold' then
   amount:=(payload->>'amount')::integer;
   if amount is null or amount<1 or amount>100000000 or amount>c.gold then raise exception '落とす金額を確認してください。';end if;
   if (select count(*) from public.online_ground_items where dropped_by=uid)>=50 then raise exception '落としたアイテムを先に拾ってください。';end if;
   if exists(select 1 from public.online_ground_items where dropped_by=uid and created_at>clock_timestamp()-interval '250 milliseconds') then raise exception '少し待ってください。';end if;
   update public.online_characters set gold=gold-amount where id=c.id;
   insert into public.online_ground_items(kind,category,x,y,dropped_by,gold_amount) values('gold','item',r.x,r.y,uid,amount);
  elsif action='pickup_item' then
   select * into d from public.online_ground_items where id=(payload->>'drop_id')::uuid for update;
   if d.kind='gold' then
    if abs(d.x-r.x)+abs(d.y-r.y)>1 then raise exception 'お金の近くまで移動してください。';end if;
    if d.gold_amount is null or c.gold::bigint+d.gold_amount>2147483647 then raise exception '所持金の上限です。';end if;
    update public.online_characters set gold=gold+d.gold_amount where id=c.id;
    delete from public.online_ground_items where id=d.id;
   else result:=public.online_world_equipment(action,payload);end if;
  elsif action='friend_request' then
   target_name:=btrim(payload->>'name');
   select user_id into other from public.online_characters where name=target_name limit 1;
   if other is null then raise exception 'そのキャラクターは見つかりません。';end if;
   if other=uid then raise exception '自分には申請できません。';end if;
   if (select count(*) from public.online_friendships where requester=uid or recipient=uid)>=100 then raise exception 'フレンド・申請の上限は100件です。';end if;
   if (select count(*) from public.online_friendships where requester=other or recipient=other)>=100 then raise exception '相手のフレンド枠がいっぱいです。';end if;
   if exists(select 1 from public.online_friendships where (requester=uid and recipient=other) or (requester=other and recipient=uid)) then raise exception '登録または申請済みです。';end if;
   insert into public.online_friendships(requester,recipient) values(uid,other);
  elsif action in('friend_accept','friend_remove') then
   select * into f from public.online_friendships where id=(payload->>'id')::uuid for update;
   if f.id is null or uid not in(f.requester,f.recipient) then raise exception '申請が見つかりません。';end if;
   if action='friend_accept' then
    if f.recipient<>uid or f.status<>'pending' then raise exception 'この申請は承認できません。';end if;
    update public.online_friendships set status='accepted' where id=f.id;
   else delete from public.online_friendships where id=f.id;end if;
  else raise exception 'フレンド操作を確認してください。';end if;
  result:=public.online_world_equipment('poll','{}');
 else result:=public.online_world_equipment(action,payload);end if;
 -- Only the caller's relationships are serialized; never expose login/email identifiers.
 result:=result||jsonb_build_object('friends',coalesce((select jsonb_agg(jsonb_build_object('id',rel.id,'name',coalesce(pc.name,first_char.name,'冒険者'),'status',rel.status,'incoming',rel.recipient=uid,'online',pres.user_id is not null) order by rel.status,rel.created_at)
 from public.online_friendships rel
 left join public.online_presence pres on pres.user_id=case when rel.requester=uid then rel.recipient else rel.requester end and pres.seen_at>now()-interval '20 seconds'
 left join public.online_characters pc on pc.id=pres.character_id
 left join lateral(select name from public.online_characters where user_id=case when rel.requester=uid then rel.recipient else rel.requester end order by slot limit 1) first_char on true
 where rel.requester=uid or rel.recipient=uid),'[]'));
 result:=jsonb_set(result,'{drops}',coalesce((select jsonb_agg(e||case when g.gold_amount is not null then jsonb_build_object('amount',g.gold_amount) else '{}'::jsonb end) from jsonb_array_elements(result->'drops') e left join public.online_ground_items g on g.id=(e->>'id')::uuid),'[]'));
 return result;
end$$;
revoke all on function public.online_world(text,jsonb) from public,anon;
grant execute on function public.online_world(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
