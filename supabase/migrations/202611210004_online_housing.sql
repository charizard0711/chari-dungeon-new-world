begin;
create table public.online_house_catalog(id text primary key,data jsonb not null);
-- HOUSE_CATALOG_DATA
insert into public.online_house_catalog(id,data)values
('north-1','{"id":"north-1","name":"北1番地 · 小さなコテージ","district":"north","districtName":"北・蒼樹住宅区","tier":1,"price":500000,"x":0,"y":-29,"w":3,"h":3,"doorX":1,"doorY":-27,"width":10,"height":9}'::jsonb),
('north-2','{"id":"north-2","name":"北2番地 · 木組みの家","district":"north","districtName":"北・蒼樹住宅区","tier":2,"price":750000,"x":11,"y":-30,"w":3,"h":4,"doorX":12,"doorY":-27,"width":11,"height":9}'::jsonb),
('north-3','{"id":"north-3","name":"北3番地 · 石造りの家","district":"north","districtName":"北・蒼樹住宅区","tier":3,"price":1000000,"x":21,"y":-30,"w":4,"h":4,"doorX":23,"doorY":-27,"width":12,"height":10}'::jsonb),
('north-4','{"id":"north-4","name":"北4番地 · 庭付きの家","district":"north","districtName":"北・蒼樹住宅区","tier":4,"price":1500000,"x":-1,"y":-19,"w":5,"h":4,"doorX":1,"doorY":-16,"width":13,"height":11}'::jsonb),
('north-5','{"id":"north-5","name":"北5番地 · 二階建ての家","district":"north","districtName":"北・蒼樹住宅区","tier":5,"price":2500000,"x":10,"y":-20,"w":5,"h":5,"doorX":12,"doorY":-16,"width":14,"height":12}'::jsonb),
('north-6','{"id":"north-6","name":"北6番地 · 広い邸宅","district":"north","districtName":"北・蒼樹住宅区","tier":6,"price":4000000,"x":20,"y":-20,"w":6,"h":5,"doorX":23,"doorY":-16,"width":16,"height":13}'::jsonb),
('north-7','{"id":"north-7","name":"北7番地 · 塔付きの邸宅","district":"north","districtName":"北・蒼樹住宅区","tier":7,"price":6000000,"x":-2,"y":-10,"w":6,"h":6,"doorX":1,"doorY":-5,"width":18,"height":14}'::jsonb),
('north-8','{"id":"north-8","name":"北8番地 · 貴族の屋敷","district":"north","districtName":"北・蒼樹住宅区","tier":8,"price":8000000,"x":9,"y":-10,"w":7,"h":6,"doorX":12,"doorY":-5,"width":20,"height":16}'::jsonb),
('north-9','{"id":"north-9","name":"北9番地 · 王宮の大邸宅","district":"north","districtName":"北・蒼樹住宅区","tier":9,"price":10000000,"x":20,"y":-11,"w":7,"h":7,"doorX":23,"doorY":-5,"width":24,"height":18}'::jsonb),
('east-1','{"id":"east-1","name":"東1番地 · 小さなコテージ","district":"east","districtName":"東・朝陽住宅区","tier":1,"price":500000,"x":30,"y":-2,"w":3,"h":3,"doorX":31,"doorY":0,"width":10,"height":9}'::jsonb),
('east-2','{"id":"east-2","name":"東2番地 · 木組みの家","district":"east","districtName":"東・朝陽住宅区","tier":2,"price":750000,"x":41,"y":-3,"w":3,"h":4,"doorX":42,"doorY":0,"width":11,"height":9}'::jsonb),
('east-3','{"id":"east-3","name":"東3番地 · 石造りの家","district":"east","districtName":"東・朝陽住宅区","tier":3,"price":1000000,"x":51,"y":-3,"w":4,"h":4,"doorX":53,"doorY":0,"width":12,"height":10}'::jsonb),
('east-4','{"id":"east-4","name":"東4番地 · 庭付きの家","district":"east","districtName":"東・朝陽住宅区","tier":4,"price":1500000,"x":29,"y":8,"w":5,"h":4,"doorX":31,"doorY":11,"width":13,"height":11}'::jsonb),
('east-5','{"id":"east-5","name":"東5番地 · 二階建ての家","district":"east","districtName":"東・朝陽住宅区","tier":5,"price":2500000,"x":40,"y":7,"w":5,"h":5,"doorX":42,"doorY":11,"width":14,"height":12}'::jsonb),
('east-6','{"id":"east-6","name":"東6番地 · 広い邸宅","district":"east","districtName":"東・朝陽住宅区","tier":6,"price":4000000,"x":50,"y":7,"w":6,"h":5,"doorX":53,"doorY":11,"width":16,"height":13}'::jsonb),
('east-7','{"id":"east-7","name":"東7番地 · 塔付きの邸宅","district":"east","districtName":"東・朝陽住宅区","tier":7,"price":6000000,"x":28,"y":17,"w":6,"h":6,"doorX":31,"doorY":22,"width":18,"height":14}'::jsonb),
('east-8','{"id":"east-8","name":"東8番地 · 貴族の屋敷","district":"east","districtName":"東・朝陽住宅区","tier":8,"price":8000000,"x":39,"y":17,"w":7,"h":6,"doorX":42,"doorY":22,"width":20,"height":16}'::jsonb),
('east-9','{"id":"east-9","name":"東9番地 · 王宮の大邸宅","district":"east","districtName":"東・朝陽住宅区","tier":9,"price":10000000,"x":50,"y":16,"w":7,"h":7,"doorX":53,"doorY":22,"width":24,"height":18}'::jsonb),
('south-1','{"id":"south-1","name":"南1番地 · 小さなコテージ","district":"south","districtName":"南・花灯住宅区","tier":1,"price":500000,"x":0,"y":25,"w":3,"h":3,"doorX":1,"doorY":27,"width":10,"height":9}'::jsonb),
('south-2','{"id":"south-2","name":"南2番地 · 木組みの家","district":"south","districtName":"南・花灯住宅区","tier":2,"price":750000,"x":11,"y":24,"w":3,"h":4,"doorX":12,"doorY":27,"width":11,"height":9}'::jsonb),
('south-3','{"id":"south-3","name":"南3番地 · 石造りの家","district":"south","districtName":"南・花灯住宅区","tier":3,"price":1000000,"x":21,"y":24,"w":4,"h":4,"doorX":23,"doorY":27,"width":12,"height":10}'::jsonb),
('south-4','{"id":"south-4","name":"南4番地 · 庭付きの家","district":"south","districtName":"南・花灯住宅区","tier":4,"price":1500000,"x":-1,"y":35,"w":5,"h":4,"doorX":1,"doorY":38,"width":13,"height":11}'::jsonb),
('south-5','{"id":"south-5","name":"南5番地 · 二階建ての家","district":"south","districtName":"南・花灯住宅区","tier":5,"price":2500000,"x":10,"y":34,"w":5,"h":5,"doorX":12,"doorY":38,"width":14,"height":12}'::jsonb),
('south-6','{"id":"south-6","name":"南6番地 · 広い邸宅","district":"south","districtName":"南・花灯住宅区","tier":6,"price":4000000,"x":20,"y":34,"w":6,"h":5,"doorX":23,"doorY":38,"width":16,"height":13}'::jsonb),
('south-7','{"id":"south-7","name":"南7番地 · 塔付きの邸宅","district":"south","districtName":"南・花灯住宅区","tier":7,"price":6000000,"x":-2,"y":44,"w":6,"h":6,"doorX":1,"doorY":49,"width":18,"height":14}'::jsonb),
('south-8','{"id":"south-8","name":"南8番地 · 貴族の屋敷","district":"south","districtName":"南・花灯住宅区","tier":8,"price":8000000,"x":9,"y":44,"w":7,"h":6,"doorX":12,"doorY":49,"width":20,"height":16}'::jsonb),
('south-9','{"id":"south-9","name":"南9番地 · 王宮の大邸宅","district":"south","districtName":"南・花灯住宅区","tier":9,"price":10000000,"x":20,"y":43,"w":7,"h":7,"doorX":23,"doorY":49,"width":24,"height":18}'::jsonb),
('west-1','{"id":"west-1","name":"西1番地 · 小さなコテージ","district":"west","districtName":"西・夕月住宅区","tier":1,"price":500000,"x":-30,"y":-2,"w":3,"h":3,"doorX":-29,"doorY":0,"width":10,"height":9}'::jsonb),
('west-2','{"id":"west-2","name":"西2番地 · 木組みの家","district":"west","districtName":"西・夕月住宅区","tier":2,"price":750000,"x":-19,"y":-3,"w":3,"h":4,"doorX":-18,"doorY":0,"width":11,"height":9}'::jsonb),
('west-3','{"id":"west-3","name":"西3番地 · 石造りの家","district":"west","districtName":"西・夕月住宅区","tier":3,"price":1000000,"x":-9,"y":-3,"w":4,"h":4,"doorX":-7,"doorY":0,"width":12,"height":10}'::jsonb),
('west-4','{"id":"west-4","name":"西4番地 · 庭付きの家","district":"west","districtName":"西・夕月住宅区","tier":4,"price":1500000,"x":-31,"y":8,"w":5,"h":4,"doorX":-29,"doorY":11,"width":13,"height":11}'::jsonb),
('west-5','{"id":"west-5","name":"西5番地 · 二階建ての家","district":"west","districtName":"西・夕月住宅区","tier":5,"price":2500000,"x":-20,"y":7,"w":5,"h":5,"doorX":-18,"doorY":11,"width":14,"height":12}'::jsonb),
('west-6','{"id":"west-6","name":"西6番地 · 広い邸宅","district":"west","districtName":"西・夕月住宅区","tier":6,"price":4000000,"x":-10,"y":7,"w":6,"h":5,"doorX":-7,"doorY":11,"width":16,"height":13}'::jsonb),
('west-7','{"id":"west-7","name":"西7番地 · 塔付きの邸宅","district":"west","districtName":"西・夕月住宅区","tier":7,"price":6000000,"x":-32,"y":17,"w":6,"h":6,"doorX":-29,"doorY":22,"width":18,"height":14}'::jsonb),
('west-8','{"id":"west-8","name":"西8番地 · 貴族の屋敷","district":"west","districtName":"西・夕月住宅区","tier":8,"price":8000000,"x":-21,"y":17,"w":7,"h":6,"doorX":-18,"doorY":22,"width":20,"height":16}'::jsonb),
('west-9','{"id":"west-9","name":"西9番地 · 王宮の大邸宅","district":"west","districtName":"西・夕月住宅区","tier":9,"price":10000000,"x":-10,"y":16,"w":7,"h":7,"doorX":-7,"doorY":22,"width":24,"height":18}'::jsonb);
-- END_HOUSE_CATALOG_DATA
create table public.online_house_owners(house_id text primary key references public.online_house_catalog(id),character_id uuid unique not null references public.online_characters(id) on delete cascade,allow_friends boolean not null default false,allow_guild boolean not null default false,bought_at timestamptz not null default now());
create table public.online_house_visits(character_id uuid primary key references public.online_characters(id) on delete cascade,house_id text not null references public.online_house_catalog(id),x int not null,y int not null,return_x int not null,return_y int not null);
create table public.online_house_messages(id bigint generated always as identity primary key,house_id text not null references public.online_house_catalog(id),character_id uuid not null references public.online_characters(id) on delete cascade,name text not null,message text not null check(char_length(message) between 1 and 200),created_at timestamptz not null default now());
alter table public.online_house_catalog enable row level security;alter table public.online_house_owners enable row level security;alter table public.online_house_visits enable row level security;alter table public.online_house_messages enable row level security;
revoke all on public.online_house_catalog,public.online_house_owners,public.online_house_visits,public.online_house_messages from public,anon,authenticated;
alter table public.online_presence drop constraint online_presence_location_check;
alter table public.online_presence add check(location in('town','warehouse','dungeon','house'));
alter table public.online_presence drop constraint online_presence_check;
alter table public.online_presence add check(x between -35 and 59 and y between -35 and 53);
alter table public.online_ground_items drop constraint online_ground_items_x_check;
alter table public.online_ground_items drop constraint online_ground_items_y_check;
alter table public.online_ground_items add check(x between -35 and 59);
alter table public.online_ground_items add check(y between -35 and 53);
create or replace function public.online_free_town_tile(origin_x int,origin_y int,owner_id uuid)returns table(tile_x int,tile_y int)language sql set search_path=public,pg_temp as $$
 select gx.x,gy.y from generate_series(-35,59)gx(x)cross join generate_series(-35,53)gy(y)where not public.online_town_blocked(gx.x,gy.y)and not exists(select 1 from online_presence p where p.user_id<>owner_id and p.location='town'and p.x=gx.x and p.y=gy.y and p.seen_at>clock_timestamp()-interval '20 seconds')order by abs(gx.x-origin_x)+abs(gy.y-origin_y),gy.y,gx.x limit 1;
$$;
create or replace function public.online_town_blocked(x int,y int) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
 declare px int:=x;py int:=y;begin return not((px between 1 and 23 and py between 1 and 17)or(px between 9 and 15 and py between -2 and 20)or(py between 7 and 11 and px between -2 and 26)or(px between -4 and 28 and (py between -34 and -2 or py between 20 and 52))or(py between -7 and 25 and(px between -34 and -2 or px between 26 and 58)))
 or(px between 3 and 7 and py between 2 and 5)or(px between 18 and 22 and py between 2 and 5)or(px between 11 and 13 and py between 8 and 10)or(px=16 and py=11)or(px=12 and py=5)or(py=12 and(px between 6 and 8 or px between 17 and 19))or(px=7 and py=9)or(px=18 and py=9)
 or exists(select 1 from(values(3,9),(21,9),(4,15),(20,15),(3,16),(21,16),(1,3),(23,3),(1,14),(23,14),(8,2),(9,6),(15,6),(9,12),(15,12))t(x,y)where t.x=px and t.y=py)
 or(px between 15 and 17 and py between 1 and 2)
 or exists(select 1 from online_house_catalog where px between(data->>'x')::int and(data->>'x')::int+(data->>'w')::int-1 and py between(data->>'y')::int and(data->>'y')::int+(data->>'h')::int-1);end
$$;
revoke all on function public.online_town_blocked(int,int) from public,anon,authenticated;
create function public.online_house_allowed(ch uuid,hid text) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from online_house_owners o join online_characters owner on owner.id=o.character_id join online_characters visitor on visitor.id=ch where o.house_id=hid and(o.character_id=ch or(o.allow_friends and exists(select 1 from online_friendships f where f.status='accepted' and((f.requester=owner.user_id and f.recipient=visitor.user_id)or(f.recipient=owner.user_id and f.requester=visitor.user_id))))or(o.allow_guild and exists(select 1 from online_guild_members a join online_guild_members b on a.guild_id=b.guild_id where a.character_id=ch and b.character_id=o.character_id))));
$$;
create function public.online_house_blocked(px int,py int,d jsonb) returns boolean language sql immutable set search_path=public,pg_temp as $$
 select px<1 or py<1 or px>=(d->>'width')::int-1 or py>=(d->>'height')::int-1
 or(px between 2 and case when(d->>'tier')::int>=5 then 4 else 3 end and py between 2 and 4)
 or(px between(d->>'width')::int-4 and(d->>'width')::int-3 and py=4)or(px=(d->>'width')::int-4 and py=5)
 or(px between 1 and 3 and py=1)or(px=(d->>'width')::int-3 and py=2)or(px=1 and py=(d->>'height')::int-3)
 or((d->>'tier')::int>=6 and px between 2 and 4 and py=(d->>'height')::int-4)
 or((d->>'tier')::int=9 and px between(d->>'width')::int-5 and(d->>'width')::int-3 and py between(d->>'height')::int-5 and(d->>'height')::int-4);
$$;
revoke all on function public.online_house_allowed(uuid,text),public.online_house_blocked(int,int,jsonb) from public,anon,authenticated;
alter function public.online_world(text,jsonb) rename to online_world_pre_housing;
revoke all on function public.online_world_pre_housing(text,jsonb) from public,anon,authenticated;
create function public.online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare uid uuid:=auth.uid();p public.online_presence;c public.online_characters;v public.online_house_visits;d jsonb;o public.online_house_owners;result jsonb;nx int;ny int;hid text;msg text;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)then raise exception 'ログインしてください。';end if;
 /* poll_contention_v1 */ if action not in ('poll','list') then perform pg_advisory_xact_lock(71390119); end if;perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into p from online_presence where user_id=uid;select * into c from online_characters where id=p.character_id and user_id=uid;select * into v from online_house_visits where character_id=c.id;
 if v.character_id is not null and not public.online_house_allowed(c.id,v.house_id)then action:='house_exit';end if;
 if action in('leave','join')then delete from online_house_visits where character_id=c.id;end if;
 if action='house_buy'then
  if c.id is null or p.location<>'town' or abs(p.x-16)+abs(p.y-2)>3 then raise exception '住宅案内所で購入してください。';end if;
  hid:=payload->>'house_id';select data into d from online_house_catalog where id=hid for update;if d is null then raise exception '住宅を選んでください。';end if;
  if exists(select 1 from online_house_owners where house_id=hid)then raise exception 'この家は購入済みです。';end if;
  if exists(select 1 from online_house_owners where character_id=c.id)then raise exception '住宅は1キャラクターにつき1軒です。';end if;
  if c.gold<(d->>'price')::int then raise exception '所持金が足りません。';end if;
  insert into online_house_owners(house_id,character_id)values(hid,c.id);update online_characters set gold=gold-(d->>'price')::int where id=c.id;
 elsif action='house_enter'then
  hid:=payload->>'house_id';select data into d from online_house_catalog where id=hid;
  if d is null or c.id is null or p.location<>'town' or abs(p.x-(d->>'doorX')::int)+abs(p.y-(d->>'doorY')::int)>2 then raise exception '家の扉に近づいてください。';end if;
  if not public.online_house_allowed(c.id,hid)then raise exception '持ち主がフレンド・ギルドの入室を許可している必要があります。';end if;
  select x,y into nx,ny from generate_series(1,(d->>'width')::int-2)gx(x)cross join generate_series(1,(d->>'height')::int-2)gy(y)where not public.online_house_blocked(x,y,d)and not exists(select 1 from online_house_visits a join online_presence pr on pr.character_id=a.character_id where a.house_id=hid and pr.location='house' and pr.seen_at>clock_timestamp()-interval '20 seconds' and a.x=gx.x and a.y=gy.y)order by abs(x-(d->>'width')::int/2)+abs(y-((d->>'height')::int-3)),y desc,x limit 1;
  if nx is null then raise exception '室内が満員です。';end if;
  insert into online_house_visits values(c.id,hid,nx,ny,p.x,p.y)on conflict(character_id)do update set house_id=excluded.house_id,x=excluded.x,y=excluded.y,return_x=excluded.return_x,return_y=excluded.return_y;
  update online_presence set location='house',seen_at=clock_timestamp()where user_id=uid;
 elsif action='house_exit'then
  if v.character_id is null then raise exception '家に入っていません。';end if;
  select x,y into nx,ny from generate_series(v.return_x-5,v.return_x+5)gx(x)cross join generate_series(v.return_y-5,v.return_y+5)gy(y)where not public.online_town_blocked(x,y)and not exists(select 1 from online_presence a where a.user_id<>uid and a.location='town'and a.seen_at>clock_timestamp()-interval '20 seconds'and a.x=gx.x and a.y=gy.y)order by abs(x-v.return_x)+abs(y-v.return_y),y,x limit 1;
  if nx is null then raise exception '出口が混み合っています。';end if;
  update online_presence set location='town',x=nx,y=ny,dir='down',moved_at='epoch',seen_at=clock_timestamp()where user_id=uid;delete from online_house_visits where character_id=c.id;
 elsif action='house_settings'then
  select data into d from online_house_catalog where id=v.house_id;
  if p.location<>'house'or v.character_id is null or abs(v.x-((d->>'width')::int-3))+abs(v.y-2)>2 then raise exception '室内の水晶に近づいてください。';end if;
  update online_house_owners set allow_friends=coalesce((payload->>'allow_friends')::boolean,false),allow_guild=coalesce((payload->>'allow_guild')::boolean,false)where house_id=v.house_id and character_id=c.id;
  if not found then raise exception '持ち主だけが設定できます。';end if;
 elsif p.location='house'and action='move'then
  select data into d from online_house_catalog where id=v.house_id;nx:=(payload->>'x')::int;ny:=(payload->>'y')::int;
  if nx is null or ny is null or abs(nx-v.x)+abs(ny-v.y)<>1 or public.online_house_blocked(nx,ny,d)then raise exception 'そこには移動できません。';end if;
  if p.moved_at>clock_timestamp()-interval '110 milliseconds'then raise exception '少し待ってください。';end if;
  if exists(select 1 from online_house_visits a join online_presence pr on pr.character_id=a.character_id where a.house_id=v.house_id and a.character_id<>c.id and pr.location='house'and pr.seen_at>clock_timestamp()-interval '20 seconds'and a.x=nx and a.y=ny)then raise exception 'そのマスには人がいます。';end if;
  update online_house_visits set x=nx,y=ny where character_id=c.id;update online_presence set dir=case when nx>v.x then 'right'when nx<v.x then 'left'when ny>v.y then 'down'else 'up'end,moved_at=clock_timestamp(),seen_at=clock_timestamp()where user_id=uid;
 elsif p.location='house'and action='chat'then
  msg:=btrim(payload->>'message');if msg is null or char_length(msg)not between 1 and 200 then raise exception '1〜200文字で入力してください。';end if;
  if exists(select 1 from online_house_messages where character_id=c.id and created_at>clock_timestamp()-interval '1 second')then raise exception '少し待ってください。';end if;
  insert into online_house_messages(house_id,character_id,name,message)values(v.house_id,c.id,c.name,msg);
 elsif p.location='house'and action not in('poll','list','leave','join','equip','use_item','set_quick_slot','swap_quick_slots','redeem_code','claim_item')and action not like 'guild_%'and action not like 'friend_%'then raise exception 'その操作は町で行ってください。';
 else result:=public.online_world_pre_housing(action,payload);end if;
 if result is null then result:=public.online_world_pre_housing('poll','{}');end if;
 select * into p from online_presence where user_id=uid;select * into c from online_characters where id=p.character_id and user_id=uid;select * into v from online_house_visits where character_id=c.id;
 result:=result||jsonb_build_object('houses',coalesce((select jsonb_agg(jsonb_build_object('id',cat.id,'ownerId',ow.character_id,'ownerName',ch.name,'mine',ow.character_id=c.id))from online_house_catalog cat left join online_house_owners ow on ow.house_id=cat.id left join online_characters ch on ch.id=ow.character_id),'[]'));
 if p.location='house'and v.character_id is not null then
  update online_presence set seen_at=clock_timestamp()where user_id=uid;select data into d from online_house_catalog where id=v.house_id;select * into o from online_house_owners where house_id=v.house_id;
  result:=result||jsonb_build_object('house',d||jsonb_build_object('ownerId',o.character_id,'ownerName',(select name from online_characters where id=o.character_id),'mine',o.character_id=c.id,'allowFriends',o.allow_friends,'allowGuild',o.allow_guild,'x',v.x,'y',v.y));
  result:=jsonb_set(result,'{players}',coalesce((select jsonb_agg(jsonb_build_object('character_id',ch.id,'name',ch.name,'gender',ch.gender,'armor',case when(ch.gear->>'armor')::boolean then ch.gear->>'armor_key'else 'leather'end,'weapon',case when(ch.gear->>'weapon')::boolean then ch.gear->>'weapon_key'end,'shield',case when(ch.gear->>'shield')::boolean then ch.gear->>'shield_key'end,'x',vis.x,'y',vis.y,'dir',pr.dir))from online_house_visits vis join online_characters ch on ch.id=vis.character_id join online_presence pr on pr.character_id=ch.id where vis.house_id=v.house_id and pr.location='house'and pr.seen_at>clock_timestamp()-interval '20 seconds'),'[]'));
  result:=jsonb_set(result,'{messages}',coalesce((select jsonb_agg(t order by id)from(select id,name,message,character_id from online_house_messages where house_id=v.house_id order by id desc limit 100)t),'[]'));result:=jsonb_set(result,'{drops}','[]');result:=jsonb_set(result,'{trainingHits}','[]');
 else result:=result||'{"house":null}'::jsonb;end if;
 return result;
end$$;
revoke all on function public.online_world(text,jsonb)from public,anon;grant execute on function public.online_world(text,jsonb)to authenticated;
notify pgrst,'reload schema';
commit;
