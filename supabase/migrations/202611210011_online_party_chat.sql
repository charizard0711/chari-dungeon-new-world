begin;
create table public.online_parties(id uuid primary key default gen_random_uuid(),leader_id uuid not null references online_characters(id) on delete cascade);
create table public.online_party_members(character_id uuid primary key references online_characters(id) on delete cascade,party_id uuid not null references online_parties(id) on delete cascade,joined_at timestamptz not null default clock_timestamp());
create index on public.online_party_members(party_id);
create table public.online_party_invites(id uuid primary key default gen_random_uuid(),party_id uuid not null references online_parties(id) on delete cascade,character_id uuid not null references online_characters(id) on delete cascade,expires_at timestamptz not null default now()+interval '1 day',unique(party_id,character_id));
create table public.online_channel_messages(id bigint generated always as identity primary key,channel text not null check(channel in('guild','party')),group_id uuid not null,character_id uuid not null references online_characters(id) on delete cascade,name text not null,message text not null check(char_length(message) between 1 and 200),created_at timestamptz not null default clock_timestamp());
create index on public.online_channel_messages(channel,group_id,id desc);
alter table public.online_parties enable row level security;
alter table public.online_party_members enable row level security;
alter table public.online_party_invites enable row level security;
alter table public.online_channel_messages enable row level security;
revoke all on public.online_parties,public.online_party_members,public.online_party_invites,public.online_channel_messages from public,anon,authenticated;
alter function public.online_world(text,jsonb) rename to online_world_pre_parties;
revoke all on function public.online_world_pre_parties(text,jsonb) from public,anon,authenticated;
create function public.online_world(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();cid uuid;pid uuid;gid uuid;target uuid;leader uuid;inv online_party_invites;result jsonb;msg text;channel text;groupid uuid;own_party jsonb;invitations jsonb;channel_messages jsonb;joined timestamptz;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'ログインしてください。';end if;
 if action like 'party_%' or action='channel_chat' then
  perform pg_advisory_xact_lock(71390119);
  select pr.character_id into cid from online_presence pr join online_characters ch on ch.id=pr.character_id and ch.user_id=uid where pr.user_id=uid;
  if cid is null then raise exception 'キャラクターで入場してください。';end if;
  select pm.party_id into pid from online_party_members pm where pm.character_id=cid;
  select pp.leader_id into leader from online_parties pp where pp.id=pid;
  if action='party_create' then
   if pid is not null then raise exception 'すでにパーティに参加しています。';end if;
   insert into online_parties(leader_id) values(cid) returning id into pid;
   insert into online_party_members(character_id,party_id) values(cid,pid);
  elsif action='party_invite' then
   if pid is null or leader<>cid then raise exception 'リーダーのみ招待できます。';end if;
   target:=(payload->>'character_id')::uuid;
   if not exists(select 1 from online_characters where id=target and user_id<>uid) then raise exception '相手を選んでください。';end if;
   if exists(select 1 from online_party_members where character_id=target) then raise exception '相手はすでにパーティに参加しています。';end if;
   if (select count(*) from online_party_members where party_id=pid)>=4 then raise exception 'パーティは4人までです。';end if;
   insert into online_party_invites(party_id,character_id) values(pid,target) on conflict(party_id,character_id) do update set expires_at=now()+interval '1 day';
  elsif action in('party_accept','party_decline') then
   select * into inv from online_party_invites where id=(payload->>'id')::uuid and expires_at>now() for update;
   if inv.id is null or (inv.character_id<>cid and inv.party_id is distinct from pid) then raise exception '招待が見つかりません。';end if;
   if action='party_accept' then
    if inv.character_id<>cid or pid is not null then raise exception 'この招待は承認できません。';end if;
    if (select count(*) from online_party_members where party_id=inv.party_id)>=4 then raise exception 'パーティが満員です。';end if;
    insert into online_party_members(character_id,party_id)values(cid,inv.party_id);
    delete from online_party_invites where character_id=cid;
   else
    if inv.character_id<>cid and leader<>cid then raise exception '招待はリーダーのみ取消できます。';end if;
    delete from online_party_invites where id=inv.id;
   end if;
  elsif action='party_leave' then
   delete from online_party_members where character_id=cid;
   if leader=cid then
    select character_id into target from online_party_members where party_id=pid order by joined_at limit 1;
    if target is null then delete from online_parties where id=pid;else update online_parties set leader_id=target where id=pid;end if;
   end if;
  elsif action='party_kick' then
   if pid is null or leader<>cid then raise exception 'リーダーのみ除名できます。';end if;
   target:=(payload->>'character_id')::uuid;
   if target=cid then raise exception '自分は脱退してください。';end if;
   delete from online_party_members where party_id=pid and character_id=target;
  elsif action='channel_chat' then
   channel:=payload->>'channel';msg:=btrim(payload->>'message');
   if msg is null or char_length(msg) not between 1 and 200 or msg~'[[:cntrl:]]' then raise exception '1〜200文字で入力してください。';end if;
   if channel='party' then groupid:=pid;
   elsif channel='guild' then select gm.guild_id into groupid from online_guild_members gm where gm.character_id=cid;
   else raise exception 'チャットの送信先が正しくありません。';end if;
   if groupid is null then raise exception 'このチャンネルには参加していません。';end if;
   if exists(select 1 from online_channel_messages m where m.character_id=cid and m.created_at>clock_timestamp()-interval '500 milliseconds') then raise exception '少し待って送信してください。';end if;
   insert into online_channel_messages(channel,group_id,character_id,name,message) select channel,groupid,cid,ch.name,msg from online_characters ch where ch.id=cid;
  else raise exception 'パーティ操作が正しくありません。';end if;
  result:=online_world_pre_parties('poll','{}');
 else result:=online_world_pre_parties(action,payload);end if;
 cid:=nullif(result->'active'->>'id','')::uuid;
 select pm.party_id into pid from online_party_members pm where pm.character_id=cid;
 select gm.guild_id into gid from online_guild_members gm where gm.character_id=cid;
 select jsonb_build_object('id',pp.id,'leaderId',pp.leader_id,'isLeader',pp.leader_id=cid,'limit',4,'members',(select jsonb_agg(jsonb_build_object('id',ch.id,'name',ch.name,'leader',ch.id=pp.leader_id,'online',exists(select 1 from online_presence pr where pr.character_id=ch.id and pr.seen_at>clock_timestamp()-interval '15 seconds'))order by pm.joined_at)from online_party_members pm join online_characters ch on ch.id=pm.character_id where pm.party_id=pp.id)) into own_party from online_parties pp where pp.id=pid;
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'name',ch.name,'incoming',i.character_id=cid,'leaderName',lc.name)order by i.expires_at),'[]')into invitations from online_party_invites i join online_parties pp on pp.id=i.party_id join online_characters ch on ch.id=i.character_id join online_characters lc on lc.id=pp.leader_id where i.expires_at>now() and(i.character_id=cid or pp.leader_id=cid);
 select coalesce(jsonb_agg(to_jsonb(recent)order by recent.id),'[]')into channel_messages from(select m.id,m.channel,m.group_id,m.name,m.message,m.character_id from online_channel_messages m where (m.channel='party' and m.group_id=pid and m.created_at>=(select joined_at from online_party_members where character_id=cid))or(m.channel='guild' and m.group_id=gid and m.created_at>=(select joined_at from online_guild_members where character_id=cid))order by m.id desc limit 200)recent;
 return result||jsonb_build_object('party',own_party,'partyInvites',invitations,'channelMessages',channel_messages);
end$$;
revoke all on function public.online_world(text,jsonb)from public,anon;
grant execute on function public.online_world(text,jsonb)to authenticated;
notify pgrst,'reload schema';
commit;
