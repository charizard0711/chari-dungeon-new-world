begin;
alter table public.online_characters add column warehouse jsonb not null default '{"equipment":{"weapon":[],"armor":[],"shield":[],"necklace":[]},"instances":{"weapon":[],"armor":[],"shield":[],"necklace":[]},"inventory":{},"gold":0}';
alter table public.online_presence add column location text not null default 'town' check(location in('town','warehouse'));
create table public.online_npc_state(id text primary key check(id in('guide','merchant')),dir text not null check(dir in('up','down','left','right')),talked_at timestamptz not null default 'epoch');
insert into public.online_npc_state(id,dir) values('guide','down'),('merchant','down');
alter table public.online_npc_state enable row level security;revoke all on public.online_npc_state from public,anon,authenticated;
-- Indoor players neither occupy an outdoor tile nor block arrivals/movement.
do $$declare source text;begin
 select pg_get_functiondef('public.online_world_core(text,jsonb)'::regprocedure) into source;
 source:=replace(source,'other.user_id<>uid','other.location=''town'' and other.user_id<>uid');execute source;
end$$;
alter function public.online_world(text,jsonb) rename to online_world_social;
revoke all on function public.online_world_social(text,jsonb) from public,anon,authenticated;
create function public.online_world(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();c public.online_characters;r public.online_presence;result jsonb;store jsonb;s text;k text;idx integer;n integer;items jsonb;meta jsonb;nx integer;ny integer;total integer;deposit boolean;px integer;py integer;facing text;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'メールアカウントでログインしてください。';end if;
 perform pg_advisory_xact_lock(71390119);perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into r from public.online_presence where user_id=uid;
 select * into c from public.online_characters where id=r.character_id and user_id=uid;
 if r.location='warehouse' and action not in('poll','list','leave','warehouse_exit','warehouse_deposit','warehouse_withdraw') then raise exception '倉庫を出てから操作してください。';end if;
 if action='npc_talk' then
  px:=case payload->>'id' when 'guide' then 16 when 'merchant' then 18 end;py:=case payload->>'id' when 'guide' then 11 when 'merchant' then 9 end;
  if c.id is null or px is null or abs(r.x-px)+abs(r.y-py)>2 then raise exception 'NPCの近くで話しかけてください。';end if;
  facing:=case when abs(r.x-px)>abs(r.y-py) then case when r.x<px then 'left' else 'right' end else case when r.y<py then 'up' else 'down' end end;
  update public.online_npc_state set dir=facing,talked_at=now() where id=payload->>'id';result:=public.online_world_social('poll','{}');
 elsif action like 'warehouse_%' then
  if c.id is null then raise exception '町に入場してください。';end if;
  if action='warehouse_enter' then
   if abs(r.x-20)+abs(r.y-5)>2 or r.y<5 then raise exception '倉庫の入口に近づいてください。';end if;
   update public.online_presence set location='warehouse',seen_at=now() where user_id=uid;
  elsif action='warehouse_exit' then
   if r.location<>'warehouse' then raise exception '倉庫に入っていません。';end if;
   select x,y into nx,ny from generate_series(1,23) gx(x) cross join generate_series(6,17) gy(y) where not public.online_town_blocked(x,y) and not exists(select 1 from public.online_presence p where p.user_id<>uid and p.location='town' and p.seen_at>now()-interval '20 seconds' and p.x=gx.x and p.y=gy.y) order by abs(x-20)+abs(y-6),y,x limit 1;
   if nx is null then raise exception '入口が混み合っています。少し待ってください。';end if;
   update public.online_presence set location='town',x=nx,y=ny,dir='down',moved_at='epoch',seen_at=now() where user_id=uid;
  elsif action in('warehouse_deposit','warehouse_withdraw') then
   if r.location<>'warehouse' then raise exception '倉庫に入ってください。';end if;
   deposit:=action='warehouse_deposit';store:=c.warehouse;s:=payload->>'category';k:=payload->>'key';
   if s='gold' then
    n:=(payload->>'amount')::integer;if n is null or n<1 then raise exception '金額を確認してください。';end if;
    if deposit then if n>c.gold or coalesce((store->>'gold')::bigint,0)+n>2147483647 then raise exception '金額・所持上限を確認してください。';end if;update public.online_characters set gold=gold-n,warehouse=jsonb_set(store,'{gold}',to_jsonb(coalesce((store->>'gold')::integer,0)+n)) where id=c.id;
    else if n>coalesce((store->>'gold')::integer,0) or c.gold::bigint+n>2147483647 then raise exception '金額・所持上限を確認してください。';end if;update public.online_characters set gold=gold+n,warehouse=jsonb_set(store,'{gold}',to_jsonb((store->>'gold')::integer-n)) where id=c.id;end if;
   elsif s='item' then
    n:=coalesce((payload->>'amount')::integer,1);if n<1 or n>9999 or not exists(select 1 from public.online_catalog where key=k and category='item') then raise exception '道具を確認してください。';end if;
    if deposit then
     if coalesce((c.inventory->>k)::integer,0)<n or coalesce((store->'inventory'->>k)::integer,0)+n>9999 then raise exception '個数・所持上限を確認してください。';end if;
     update public.online_characters set inventory=jsonb_set(inventory,array[k],to_jsonb((inventory->>k)::integer-n)),warehouse=jsonb_set(store,array['inventory',k],to_jsonb(coalesce((store->'inventory'->>k)::integer,0)+n)) where id=c.id;
    else
     if coalesce((store->'inventory'->>k)::integer,0)<n or coalesce((c.inventory->>k)::integer,0)+n>9999 then raise exception '個数・所持上限を確認してください。';end if;
     update public.online_characters set inventory=jsonb_set(inventory,array[k],to_jsonb(coalesce((inventory->>k)::integer,0)+n)),warehouse=jsonb_set(store,array['inventory',k],to_jsonb((store->'inventory'->>k)::integer-n)) where id=c.id;
    end if;
   elsif s in('weapon','armor','shield','necklace') then
    if deposit then items:=c.instances->s;else items:=store->'instances'->s;end if;
    select ordinality::integer-1,value into idx,meta from jsonb_array_elements(items) with ordinality where value->>'id'=payload->>'instanceId';
    if idx is null or meta is null or meta->>'key' is distinct from k then raise exception 'その装備は持っていません。';end if;
    if deposit then
     select coalesce(sum(jsonb_array_length(value)),0) into total from jsonb_each(store->'equipment');if total>=200 then raise exception '倉庫の装備上限は200個です。';end if;
     store:=jsonb_set(jsonb_set(store,array['equipment',s],(store->'equipment'->s)||jsonb_build_array(k)),array['instances',s],(store->'instances'->s)||jsonb_build_array(meta));
     update public.online_characters set warehouse=store,equipment=jsonb_set(equipment,array[s],(equipment->s)-idx),instances=jsonb_set(instances,array[s],(instances->s)-idx),gear=case when gear->>(s||'_instance_id')=meta->>'id' then gear||jsonb_build_object(s,false,s||'_instance_id',null) else gear end where id=c.id;
    else
     if coalesce(jsonb_array_length(c.equipment->s),0)>=200 then raise exception '所持装備がいっぱいです。';end if;
     store:=jsonb_set(jsonb_set(store,array['equipment',s],(store->'equipment'->s)-idx),array['instances',s],(store->'instances'->s)-idx);
     update public.online_characters set warehouse=store,equipment=jsonb_set(equipment,array[s],coalesce(equipment->s,'[]')||jsonb_build_array(k)),instances=jsonb_set(instances,array[s],coalesce(instances->s,'[]')||jsonb_build_array(meta)) where id=c.id;
    end if;
   else raise exception '預けるアイテムを確認してください。';end if;
   perform public.online_sync_instances(c.id);
  else raise exception '倉庫の操作を確認してください。';end if;
  result:=public.online_world_social('poll','{}');
 else result:=public.online_world_social(action,payload);end if;
 if action='join' then update public.online_presence set location='town' where user_id=uid;end if;
 select * into r from public.online_presence where user_id=uid;
 result:=jsonb_set(result,'{players}',coalesce((select jsonb_agg(e) from jsonb_array_elements(result->'players') e join public.online_presence p on p.character_id=(e->>'character_id')::uuid where p.location='town'),'[]'));
 if result->'active'<>'null'::jsonb then result:=jsonb_set(result,'{active}',(result->'active')||jsonb_build_object('location',coalesce(r.location,'town'),'warehouse',(select warehouse from public.online_characters where id=(result->'active'->>'id')::uuid and user_id=uid)));end if;
 result:=result||jsonb_build_object('npcs',coalesce((select jsonb_agg(jsonb_build_object('id',id,'dir',dir,'until',extract(epoch from talked_at+interval '10 seconds')*1000)) from public.online_npc_state),'[]'));
 return result;
end$$;
revoke all on function public.online_world(text,jsonb) from public,anon;
grant execute on function public.online_world(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
