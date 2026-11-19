begin;
create table public.online_characters(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.online_profiles(user_id) on delete cascade,
 slot smallint not null check(slot between 1 and 2),name text not null check(char_length(name) between 2 and 12 and name !~ '[[:cntrl:]]'),
 gender text not null check(gender in ('male','female')),hp integer not null default 100 check(hp between 0 and 100),
 inventory jsonb not null default '{"potion":3}',gear jsonb not null default '{"weapon":true,"armor":true}',
 encyclopedia jsonb not null default '[]',unique(user_id,slot)
);
alter table public.online_characters enable row level security;
revoke all on public.online_characters from anon,authenticated;
alter table public.online_presence add column character_id uuid references public.online_characters(id) on delete cascade,
 add column dir text not null default 'down' check(dir in ('up','down','left','right')),
 add column moved_at timestamptz not null default 'epoch';
alter table public.online_presence drop constraint online_presence_check;
alter table public.online_presence add check(x between 0 and 24 and y between 0 and 18);
create function public.online_world(action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();p public.online_profiles;c public.online_characters;r public.online_presence;nx int;ny int;s int;n text;g text;msg text;k text;v boolean;
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
 elsif action in ('move','poll','chat','equip','use_item') then
   select * into r from public.online_presence where user_id=uid;
   select * into c from public.online_characters where id=r.character_id and user_id=uid;
   if c.id is null then raise exception 'キャラクターを選び、町に入場してください。';end if;
   if action='move' then
     nx:=(payload->>'x')::int;ny:=(payload->>'y')::int;
     if nx is null or ny is null or abs(nx-r.x)+abs(ny-r.y)<>1 or nx<1 or ny<1 or nx>23 or ny>17
       or (nx between 3 and 7 and ny between 2 and 5) or (nx between 18 and 22 and ny between 2 and 5)
       or (nx between 11 and 13 and ny between 8 and 10) or (nx=16 and ny=11)
       or (ny=12 and (nx between 6 and 8 or nx between 17 and 19))
       or (nx,ny) in ((3,9),(21,9),(4,15),(20,15),(3,16),(21,16)) then raise exception 'そこには移動できません。';end if;
     if r.moved_at>clock_timestamp()-interval '110 milliseconds' then raise exception '移動が速すぎます。';end if;
     update public.online_presence set x=nx,y=ny,dir=case when nx>r.x then 'right' when nx<r.x then 'left' when ny>r.y then 'down' else 'up' end,moved_at=clock_timestamp() where user_id=uid;
   elsif action='chat' then
     msg:=trim(payload->>'message');if msg is null or char_length(msg) not between 1 and 200 then raise exception '1〜200文字で入力してください。';end if;
     if exists(select 1 from public.online_messages where user_id=uid and created_at>now()-interval '2 seconds') then raise exception '少し待ってから送信してください。';end if;
     insert into public.online_messages(user_id,name,message) values(uid,c.name,msg);
   elsif action='equip' then
     k:=payload->>'slot';v:=(payload->>'equipped')::boolean;
     if k is null or k not in ('weapon','armor') or v is null then raise exception '装備を確認してください。';end if;
     update public.online_characters set gear=jsonb_set(gear,array[k],to_jsonb(v)) where id=c.id;
   elsif action='use_item' then
     k:=payload->>'kind';
     if k is null or k<>'potion' or coalesce((c.inventory->>k)::int,0)<1 then raise exception 'そのアイテムは使えません。';end if;
     if c.hp>=100 then raise exception '体力は満タンです。';end if;
     update public.online_characters set hp=least(100,hp+40),inventory=jsonb_set(inventory,array[k],to_jsonb((inventory->>k)::int-1)) where id=c.id;
   end if;
   update public.online_presence set seen_at=now() where user_id=uid;
 elsif action<>'list' then raise exception '未対応の操作です。';end if;
 select * into r from public.online_presence where user_id=uid;
 select * into c from public.online_characters where id=r.character_id and user_id=uid;
 return jsonb_build_object('characters',coalesce((select jsonb_agg(jsonb_build_object('id',id,'slot',slot,'name',name,'gender',gender,'hp',hp,'inventory',inventory,'gear',gear) order by slot) from public.online_characters where user_id=uid),'[]'),
 'active',case when c.id is null then null else jsonb_build_object('id',c.id,'slot',c.slot,'name',c.name,'gender',c.gender,'hp',c.hp,'inventory',c.inventory,'gear',c.gear) end,
 'players',coalesce((select jsonb_agg(t) from (select q.id character_id,q.name,q.gender,pres.x,pres.y,pres.dir from public.online_presence pres join public.online_characters q on q.id=pres.character_id where pres.seen_at>now()-interval '20 seconds')t),'[]'),
 'messages',coalesce((select jsonb_agg(t order by id) from(select id,name,message from public.online_messages order by id desc limit 50)t),'[]'),'superAccount',p.super_account);
end $$;
revoke all on function public.online_world(text,jsonb) from public,anon;
grant execute on function public.online_world(text,jsonb) to authenticated;
revoke execute on function public.online_town(text,jsonb) from authenticated;
commit;
