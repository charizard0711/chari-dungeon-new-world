-- Separate online identities and progression. No client can assign privileged roles.
create table public.online_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 20),
 super_account boolean not null default false,
 inventory jsonb not null default '[]', storage jsonb not null default '[]',
 encyclopedia jsonb not null default '{}'
);
create table public.online_presence (
 user_id uuid primary key references public.online_profiles(user_id) on delete cascade,
 x integer not null default 5, y integer not null default 7,
 seen_at timestamptz not null default now(),
 check(x between 0 and 10 and y between 0 and 8)
);
create table public.online_messages (
 id bigint generated always as identity primary key,
 user_id uuid not null references public.online_profiles(user_id) on delete cascade,
 name text not null, message text not null check(char_length(message) between 1 and 200),
 created_at timestamptz not null default now()
);
alter table public.online_profiles enable row level security;
alter table public.online_presence enable row level security;
alter table public.online_messages enable row level security;
revoke all on public.online_profiles, public.online_presence, public.online_messages from anon, authenticated;
create or replace function public.online_town(action text, payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); p public.online_profiles; pos public.online_presence; nx int; ny int; msg text;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean, true) then raise exception 'メールアカウントでログインしてください。'; end if;
 -- Lock one account for all mutations, including concurrent requests.
 perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
 select * into p from public.online_profiles where user_id=uid;
 if action='join' then
   if p.user_id is null then
     insert into public.online_profiles(user_id,name) values(uid, left(coalesce(nullif(trim(payload->>'name'),''),'冒険者'),20));
   end if;
   insert into public.online_presence(user_id) values(uid) on conflict(user_id) do update set seen_at=now();
 elsif action='leave' then
   delete from public.online_presence where user_id=uid;
 elsif action in ('poll','move','chat') then
   select * into pos from public.online_presence where user_id=uid;
   if pos.user_id is null then raise exception 'サーバーに入場してください。'; end if;
   if action='move' then
     nx:=(payload->>'x')::int; ny:=(payload->>'y')::int;
     if nx is null or ny is null or nx not between 0 and 10 or ny not between 0 and 8
       or abs(nx-pos.x)+abs(ny-pos.y)<>1
       or (nx between 4 and 6 and ny between 3 and 5) or (nx=8 and ny=3)
       or (nx between 0 and 2 and ny between 0 and 2) or (nx between 8 and 10 and ny between 0 and 1)
       then raise exception 'そこには移動できません。'; end if;
     update public.online_presence set x=nx,y=ny where user_id=uid;
   elsif action='chat' then
     msg:=trim(payload->>'message');
     if msg is null or char_length(msg) not between 1 and 200 then raise exception '1〜200文字で入力してください。'; end if;
     if exists(select 1 from public.online_messages where user_id=uid and created_at>now()-interval '2 seconds') then raise exception '少し待ってから送信してください。'; end if;
     insert into public.online_messages(user_id,name,message) values(uid,p.name,msg);
   end if;
   update public.online_presence set seen_at=now() where user_id=uid;
 else raise exception '未対応の操作です。'; end if;
 select * into p from public.online_profiles where user_id=uid;
 return jsonb_build_object('superAccount',coalesce(p.super_account,false),
 'players',coalesce((select jsonb_agg(t) from (select r.user_id,q.name,r.x,r.y from public.online_presence r join public.online_profiles q using(user_id) where seen_at>now()-interval '20 seconds') t),'[]'),
 'messages',coalesce((select jsonb_agg(t order by id) from (select id,name,message from public.online_messages order by id desc limit 50)t),'[]'));
end $$;
revoke all on function public.online_town(text,jsonb) from public,anon;
grant execute on function public.online_town(text,jsonb) to authenticated;
