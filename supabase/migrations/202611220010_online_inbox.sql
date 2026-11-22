begin;
create table public.online_announcements(id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 100),body text not null check(length(body) between 1 and 4000),published boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.online_announcement_reads(user_id uuid references auth.users(id) on delete cascade,announcement_id uuid references public.online_announcements(id) on delete cascade,read_at timestamptz not null default now(),primary key(user_id,announcement_id));
create table public.online_mail(id uuid primary key default gen_random_uuid(),sender uuid references auth.users(id) on delete set null,recipient uuid not null references auth.users(id) on delete cascade,sender_name text not null,title text not null check(length(title) between 1 and 100),body text not null check(length(body) between 1 and 4000),created_at timestamptz not null default now(),read_at timestamptz);
create index online_mail_recipient on public.online_mail(recipient,created_at desc);
alter table public.online_announcements enable row level security;
alter table public.online_announcement_reads enable row level security;
alter table public.online_mail enable row level security;
revoke all on public.online_announcements,public.online_announcement_reads,public.online_mail from public,anon,authenticated;
create function public.online_inbox(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();admin boolean;target uuid;mid uuid;subject text:=btrim(payload->>'title');message text:=btrim(payload->>'body');result jsonb;offst integer:=greatest(0,least(100000,coalesce((payload->>'offset')::integer,0)));
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'ログインしてください。';end if;
 select coalesce(super_account,false) into admin from public.online_profiles where user_id=uid;
 if action like 'admin_%' and not coalesce(admin,false) then raise exception '管理権限が必要です。';end if;
 if action in ('send','admin_send','admin_save') then
  if subject is null or length(subject) not between 1 and 100 or message is null or length(message) not between 1 and 4000 then raise exception '件名は100文字、本文は4000文字まで入力してください。';end if;
 end if;
 if action='send' or action='admin_send' then
  perform pg_advisory_xact_lock(hashtextextended('mail:'||uid::text,0));
  if action='send' then
   select case when requester=uid then recipient else requester end into target from online_friendships where id=(payload->>'friend_id')::uuid and status='accepted' and uid in(requester,recipient);
   if target is null then raise exception '承認済みのフレンドにだけ送信できます。';end if;
  else target:=(payload->>'recipient')::uuid;end if;
  if target is null or not exists(select 1 from auth.users where id=target) then raise exception '宛先が見つかりません。';end if;
  if exists(select 1 from online_mail where sender=uid and created_at>now()-interval '3 seconds') or (select count(*) from online_mail where sender=uid and created_at>now()-interval '1 hour')>=60 then raise exception '少し待ってから送信してください。';end if;
  insert into online_mail(sender,recipient,sender_name,title,body) values(uid,target,case when action='admin_send' then 'Chari Dungeon: ZERO 運営' else coalesce((select name from online_characters where user_id=uid order by slot limit 1),'冒険者') end,subject,message) returning id into mid;
  return jsonb_build_object('id',mid);
 elsif action='read_mail' then
  update online_mail set read_at=coalesce(read_at,now()) where id=(payload->>'id')::uuid and recipient=uid;
 elsif action='read_notice' then
  insert into online_announcement_reads(user_id,announcement_id) select uid,id from online_announcements where id=(payload->>'id')::uuid and published on conflict do nothing;
 elsif action='admin_save' then
  if nullif(payload->>'id','') is null then
   insert into online_announcements(title,body,published) values(subject,message,coalesce((payload->>'published')::boolean,false)) returning id into mid;
  else
   update online_announcements set title=subject,body=message,published=coalesce((payload->>'published')::boolean,false),updated_at=now() where id=(payload->>'id')::uuid returning id into mid;
   if mid is null then raise exception 'お知らせが見つかりません。';end if;
  end if;
  return jsonb_build_object('id',mid);
 elsif action='admin_users' then
  return jsonb_build_object('total',(select count(*) from auth.users where not coalesce(is_anonymous,false)),'users',coalesce((select jsonb_agg(u) from (select a.id,a.email,a.created_at,a.last_sign_in_at,a.email_confirmed_at,p.name,coalesce(p.super_account,false) as super_account,coalesce((select jsonb_agg(jsonb_build_object('name',c.name,'level',1,'gold',c.gold)) from online_characters c where c.user_id=a.id),'[]') as characters from auth.users a left join online_profiles p on p.user_id=a.id where not coalesce(a.is_anonymous,false) and (coalesce(a.email,'') ilike '%'||left(coalesce(payload->>'search',''),100)||'%' or exists(select 1 from online_characters c where c.user_id=a.id and c.name ilike '%'||left(coalesce(payload->>'search',''),100)||'%')) order by a.created_at desc limit 50 offset offst) u),'[]'));
 elsif action='admin_notices' then
  return jsonb_build_object('notices',coalesce((select jsonb_agg(n) from (select * from online_announcements order by created_at desc limit 100 offset offst) n),'[]'));
 elsif action not in('list','counts') then raise exception '不明な操作です。';end if;
 result:=jsonb_build_object('admin',coalesce(admin,false),'mailCount',(select count(*) from online_mail where recipient=uid and read_at is null),'noticeCount',(select count(*) from online_announcements n where published and not exists(select 1 from online_announcement_reads r where r.user_id=uid and r.announcement_id=n.id)));
 if action<>'counts' then
  result:=result||jsonb_build_object('mail',coalesce((select jsonb_agg(m) from (select id,sender_name,title,body,created_at,read_at from online_mail where recipient=uid order by created_at desc limit 50 offset offst) m),'[]'),'notices',coalesce((select jsonb_agg(n) from (select a.*,exists(select 1 from online_announcement_reads r where r.user_id=uid and r.announcement_id=a.id) as is_read from online_announcements a where published order by created_at desc limit 50 offset offst) n),'[]'));
 end if;
 return result;
end$$;
revoke all on function public.online_inbox(text,jsonb) from public,anon;
grant execute on function public.online_inbox(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
