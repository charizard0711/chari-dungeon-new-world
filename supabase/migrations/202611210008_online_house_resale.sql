begin;
select pg_advisory_xact_lock(71390119);
alter table public.online_house_owners add column purchase_price integer;
update public.online_house_owners o set purchase_price=(c.data->>'price')::int from public.online_house_catalog c where c.id=o.house_id;
alter table public.online_house_owners alter column purchase_price set not null;
alter table public.online_house_owners add constraint house_purchase_price_positive check(purchase_price>0);
create function public.online_house_record_price()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$begin
 select(data->>'price')::int into new.purchase_price from online_house_catalog where id=new.house_id;
 return new;
end$$;
revoke all on function public.online_house_record_price()from public,anon,authenticated;
create trigger online_house_record_price before insert on public.online_house_owners for each row execute function public.online_house_record_price();
create table public.online_house_sales(id bigint generated always as identity primary key,house_id text not null,character_id uuid not null,purchase_price int not null,refund int not null,previous_ownership jsonb not null,sold_at timestamptz not null default now());
alter table public.online_house_sales enable row level security;
revoke all on public.online_house_sales from public,anon,authenticated;
-- Retain historical chat, but never expose the previous owner's messages after resale.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.online_world_pre_gardens(text,jsonb)'::regprocedure);
 if position('where house_id=v.house_id order by id desc limit 100'in definition)=0 then raise exception 'Housing chat query changed; review before migration';end if;
 definition:=replace(definition,'where house_id=v.house_id order by id desc limit 100','where house_id=v.house_id and created_at>=o.bought_at order by id desc limit 100');
 execute definition;
end$$;
alter function public.online_world(text,jsonb)rename to online_world_pre_resale;
revoke all on function public.online_world_pre_resale(text,jsonb)from public,anon,authenticated;
create function public.online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();p public.online_presence;c public.online_characters;o public.online_house_owners;v record;nx int;ny int;refund int;result jsonb;
begin
 if action='house_sell'then
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)then raise exception 'ログインしてください。';end if;
  perform pg_advisory_xact_lock(71390119);perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select * into p from online_presence where user_id=uid for update;
  select * into c from online_characters where id=p.character_id and user_id=uid for update;
  if c.id is null or p.location is distinct from 'town'or abs(p.x-16)+abs(p.y-2)>3 then raise exception '住宅案内所で売却してください。';end if;
  select * into o from online_house_owners where house_id=payload->>'house_id'and character_id=c.id for update;
  if o.house_id is null then raise exception 'このキャラクターが所有する家だけ売却できます。';end if;
  refund:=floor(o.purchase_price::numeric*7/10)::int;
  if c.gold::bigint+refund>2147483647 then raise exception '所持金の上限を超えるため売却できません。';end if;
  -- Move every visitor outside before releasing the house for its next owner.
  for v in select vis.*,ch.user_id from online_house_visits vis join online_characters ch on ch.id=vis.character_id where vis.house_id=o.house_id order by vis.character_id loop
   select tile_x,tile_y into nx,ny from public.online_free_town_tile(v.return_x,v.return_y,v.user_id);
   if nx is null then raise exception '出口が混み合っています。少し待ってください。';end if;
   update online_presence set location='town',x=nx,y=ny,dir='down',moved_at='epoch',seen_at=clock_timestamp()where character_id=v.character_id and location='house';
   delete from online_house_visits where character_id=v.character_id;
  end loop;
  insert into online_house_sales(house_id,character_id,purchase_price,refund,previous_ownership)values(o.house_id,c.id,o.purchase_price,refund,to_jsonb(o));
  delete from online_house_owners where house_id=o.house_id and character_id=c.id;
  update online_characters set gold=gold+refund where id=c.id;
  result:=public.online_world_pre_resale('poll','{}');
 else result:=public.online_world_pre_resale(action,payload);end if;
 result:=jsonb_set(result,'{houses}',coalesce((select jsonb_agg(h||case when(h->>'mine')::boolean then jsonb_build_object('resalePrice',floor(ow.purchase_price::numeric*7/10)::int)else '{}'::jsonb end)from jsonb_array_elements(result->'houses')h left join online_house_owners ow on ow.house_id=h->>'id'),'[]'));
 return result;
end$$;
revoke all on function public.online_world(text,jsonb)from public,anon;
grant execute on function public.online_world(text,jsonb)to authenticated;
notify pgrst,'reload schema';
commit;
