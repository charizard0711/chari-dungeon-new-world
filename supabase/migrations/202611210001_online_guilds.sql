begin;
create table public.online_guilds(
 id uuid primary key default gen_random_uuid(),name text not null check(char_length(name) between 2 and 20 and name !~ '[[:cntrl:]]'),
 description text not null default '' check(char_length(description)<=160 and regexp_replace(description,E'[\n\r\t]','','g') !~ '[[:cntrl:]]'),
 owner_character_id uuid not null references public.online_characters(id) on delete cascade,created_at timestamptz not null default now());
create unique index online_guild_name on public.online_guilds(lower(name));
create table public.online_guild_members(
 character_id uuid primary key references public.online_characters(id) on delete cascade,
 guild_id uuid not null references public.online_guilds(id) on delete cascade,joined_at timestamptz not null default now());
create index online_guild_member_guild on public.online_guild_members(guild_id);
create table public.online_guild_requests(
 id uuid primary key default gen_random_uuid(),guild_id uuid not null references public.online_guilds(id) on delete cascade,
 character_id uuid not null references public.online_characters(id) on delete cascade,
 kind text not null check(kind in('invite','join')),created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '7 days',unique(guild_id,character_id));
create index online_guild_request_character on public.online_guild_requests(character_id);
alter table public.online_guilds enable row level security;
alter table public.online_guild_members enable row level security;
alter table public.online_guild_requests enable row level security;
revoke all on public.online_guilds,public.online_guild_members,public.online_guild_requests from public,anon,authenticated;

create function public.online_guild_state(cid uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare own public.online_guilds;g jsonb;requests jsonb;
begin
 select gg.* into own from public.online_guilds gg join public.online_guild_members gm on gm.guild_id=gg.id where gm.character_id=cid;
 if own.id is not null then
  select jsonb_build_object('id',own.id,'name',own.name,'description',own.description,'leaderId',own.owner_character_id,'isLeader',own.owner_character_id=cid,'limit',30,
   'members',coalesce(jsonb_agg(jsonb_build_object('id',ch.id,'name',ch.name,'gender',ch.gender,'leader',ch.id=own.owner_character_id,
    'online',exists(select 1 from public.online_presence pr where pr.character_id=ch.id and pr.seen_at>clock_timestamp()-interval '3 seconds')) order by (ch.id=own.owner_character_id) desc,gm.joined_at),'[]')) into g
   from public.online_guild_members gm join public.online_characters ch on ch.id=gm.character_id where gm.guild_id=own.id;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',req.id,'guildId',gg.id,'guildName',gg.name,'characterId',ch.id,'name',ch.name,'kind',req.kind,
  'incoming',case when req.kind='invite' then req.character_id=cid else gg.owner_character_id=cid end) order by req.created_at),'[]') into requests
  from public.online_guild_requests req join public.online_guilds gg on gg.id=req.guild_id join public.online_characters ch on ch.id=req.character_id
  where req.expires_at>clock_timestamp() and (req.character_id=cid or gg.owner_character_id=cid);
 return jsonb_build_object('guild',g,'guildRequests',requests);
end $$;
revoke all on function public.online_guild_state(uuid) from public,anon,authenticated;

create function public.online_social_inspection(base jsonb,cid uuid,target_id uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare target public.online_characters;myguild uuid;targetguild public.online_guilds;friend jsonb;request jsonb;
begin
 if base is null then return null;end if;
 select * into target from public.online_characters where id=target_id;
 select guild_id into myguild from public.online_guild_members where character_id=cid;
 select gg.* into targetguild from public.online_guilds gg join public.online_guild_members gm on gm.guild_id=gg.id where gm.character_id=target_id;
 select jsonb_build_object('id',f.id,'status',f.status,'incoming',f.recipient=auth.uid()) into friend from public.online_friendships f
  where (f.requester=auth.uid() and f.recipient=target.user_id) or (f.recipient=auth.uid() and f.requester=target.user_id);
 select jsonb_build_object('id',req.id,'kind',req.kind,'incoming',case when req.kind='invite' then req.character_id=cid else gg.owner_character_id=cid end) into request
  from public.online_guild_requests req join public.online_guilds gg on gg.id=req.guild_id where req.expires_at>clock_timestamp()
   and ((req.guild_id=myguild and req.character_id=target_id ) or (req.guild_id=targetguild.id and req.character_id=cid)) limit 1;
 return base||jsonb_build_object('characterId',target.id,'sameAccount',target.user_id=auth.uid(),'friend',friend,
  'guild',case when targetguild.id is not null then jsonb_build_object('id',targetguild.id,'name',targetguild.name) end,'guildRequest',request);
end $$;
revoke all on function public.online_social_inspection(jsonb,uuid,uuid) from public,anon,authenticated;

alter function public.online_world(text,jsonb) rename to online_world_v14;
revoke all on function public.online_world_v14(text,jsonb) from public,anon,authenticated;
create function public.online_world(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();c public.online_characters;other public.online_characters;own public.online_guilds;g public.online_guilds;req public.online_guild_requests;f public.online_friendships;
 result jsonb;base_inspection jsonb;target_id uuid;gid uuid;new_name text;description text;operation text;is_social boolean;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'ログインしてください。';end if;
 is_social:=action like 'guild_%' or action like 'friend_%';
 if is_social then
  -- Same mutation -> room -> user lock ordering as the existing validated world API.
  /* poll_contention_v1 */ if action not in ('poll','list') then perform pg_advisory_xact_lock(71390119); end if;
  select ch.* into c from public.online_characters ch join public.online_presence pr on pr.character_id=ch.id where pr.user_id=uid and ch.user_id=uid;
  if c.id is null then raise exception 'キャラクターで入場してください。';end if;
  if payload ? 'inspect_character_id' then
   target_id:=(payload->>'inspect_character_id')::uuid;
   result:=public.online_world_v14('inspect_player',jsonb_build_object('character_id',target_id));base_inspection:=result->'inspection';
  end if;
  select gg.* into own from public.online_guilds gg join public.online_guild_members gm on gm.guild_id=gg.id where gm.character_id=c.id;
  if action in('friend_request_character','friend_request') then
   if action='friend_request_character' then select * into other from public.online_characters where id=(payload->>'character_id')::uuid;
   else
    if (select count(*) from public.online_characters where name=btrim(payload->>'name'))>1 then raise exception '同名の冒険者が複数います。相手のステータスから申請してください。';end if;
    select * into other from public.online_characters where name=btrim(payload->>'name');
   end if;
   if other.id is null then raise exception '相手が見つかりません。';end if;
   if other.user_id=uid then raise exception '自分のアカウントには申請できません。';end if;
   if exists(select 1 from public.online_friendships rel where (rel.requester=uid and rel.recipient=other.user_id) or (rel.recipient=uid and rel.requester=other.user_id)) then raise exception 'フレンドまたは申請済みです。';end if;
   if (select count(*) from public.online_friendships rel where rel.requester=uid or rel.recipient=uid)>=100 or (select count(*) from public.online_friendships rel where rel.requester=other.user_id or rel.recipient=other.user_id)>=100 then raise exception 'フレンドの上限は100件です。';end if;
   insert into public.online_friendships(requester,recipient) values(uid,other.user_id);
  elsif action in('friend_accept','friend_remove') then
   select * into f from public.online_friendships where id=(payload->>'id')::uuid for update;
   if f.id is null or uid not in(f.requester,f.recipient) then raise exception '申請が見つかりません。';end if;
   if action='friend_accept' then
    if f.recipient<>uid or f.status<>'pending' then raise exception 'この申請は承認できません。';end if;
    update public.online_friendships set status='accepted' where id=f.id;
   else delete from public.online_friendships where id=f.id;end if;
  elsif action='guild_create' then
   if own.id is not null then raise exception 'すでにギルドに所属しています。';end if;
   new_name:=btrim(payload->>'name');description:=btrim(coalesce(payload->>'description',''));
   if new_name is null or char_length(new_name) not between 2 and 20 or new_name ~ '[[:cntrl:]]' or char_length(description)>160 or regexp_replace(description,E'[\n\r\t]','','g') ~ '[[:cntrl:]]' then raise exception 'ギルド名は2〜20文字、紹介は160文字以内で入力してください。';end if;
   if exists(select 1 from public.online_guilds gg where lower(gg.name)=lower(new_name)) then raise exception 'そのギルド名は使われています。';end if;
   insert into public.online_guilds(name,description,owner_character_id) values(new_name,description,c.id) returning * into g;
   insert into public.online_guild_members(character_id,guild_id) values(c.id,g.id);delete from public.online_guild_requests where character_id=c.id;
  elsif action in('guild_invite','guild_request_join') then
   if action='guild_invite' then
    if own.id is null or own.owner_character_id<>c.id then raise exception 'ギルドマスターだけが招待できます。';end if;g:=own;
    select * into other from public.online_characters where id=(payload->>'character_id')::uuid;
    if other.id is null or other.id=c.id then raise exception '招待する冒険者を確認してください。';end if;
    operation:='invite';
   else
    if own.id is not null then raise exception 'すでにギルドに所属しています。';end if;
    if payload ? 'guild_id' then select * into g from public.online_guilds where id=(payload->>'guild_id')::uuid;
    else select * into g from public.online_guilds where lower(name)=lower(btrim(payload->>'name'));end if;
    other:=c;operation:='join';
   end if;
   if g.id is null then raise exception 'ギルドが見つかりません。';end if;
   perform 1 from public.online_guilds where id=g.id for update;
   if exists(select 1 from public.online_guild_members gm where gm.character_id=other.id) then raise exception '相手はすでにギルドに所属しています。';end if;
   if (select count(*) from public.online_guild_members gm where gm.guild_id=g.id)>=30 then raise exception 'ギルドは満員です（30人）。';end if;
   if exists(select 1 from public.online_guild_requests gr where gr.guild_id=g.id and gr.character_id=other.id and gr.expires_at>clock_timestamp()) then raise exception '招待または加入申請済みです。';end if;
   if (select count(*) from public.online_guild_requests gr where gr.character_id=other.id and gr.expires_at>clock_timestamp())>=5 or (select count(*) from public.online_guild_requests gr where gr.guild_id=g.id and gr.expires_at>clock_timestamp())>=100 then raise exception '申請枠がいっぱいです。不要な申請を取り消してください。';end if;
   delete from public.online_guild_requests gr where gr.guild_id=g.id and gr.character_id=other.id;
   insert into public.online_guild_requests(guild_id,character_id,kind) values(g.id,other.id,operation);
  elsif action in('guild_accept','guild_decline') then
   select * into req from public.online_guild_requests where id=(payload->>'id')::uuid for update;
   select * into g from public.online_guilds where id=req.guild_id for update;
   if req.id is null or req.expires_at<=clock_timestamp() then raise exception '有効な申請が見つかりません。';end if;
   if action='guild_accept' then
    if (req.kind='invite' and req.character_id<>c.id) or (req.kind='join' and g.owner_character_id<>c.id) then raise exception 'この申請は承認できません。';end if;
    if exists(select 1 from public.online_guild_members gm where gm.character_id=req.character_id) then raise exception 'すでに別のギルドに所属しています。';end if;
    if (select count(*) from public.online_guild_members gm where gm.guild_id=g.id)>=30 then raise exception 'ギルドは満員です（30人）。';end if;
    insert into public.online_guild_members(character_id,guild_id) values(req.character_id,g.id);delete from public.online_guild_requests where character_id=req.character_id;
   else
    if req.character_id<>c.id and g.owner_character_id<>c.id then raise exception 'この申請は操作できません。';end if;
    delete from public.online_guild_requests where id=req.id;
   end if;
  elsif action in('guild_leave','guild_kick','guild_transfer') then
   if own.id is null then raise exception 'ギルドに所属していません。';end if;
   perform 1 from public.online_guilds where id=own.id for update;
   if action='guild_leave' then
    if own.owner_character_id=c.id then
     if (select count(*) from public.online_guild_members gm where gm.guild_id=own.id)>1 then raise exception 'マスターを引き継いでから脱退してください。';end if;
     delete from public.online_guilds where id=own.id;
    else delete from public.online_guild_members where character_id=c.id;end if;
   else
    if own.owner_character_id<>c.id then raise exception 'ギルドマスターだけが操作できます。';end if;
    target_id:=(payload->>'character_id')::uuid;
    if target_id=c.id or not exists(select 1 from public.online_guild_members gm where gm.guild_id=own.id and gm.character_id=target_id) then raise exception '対象メンバーを確認してください。';end if;
    if action='guild_transfer' then update public.online_guilds set owner_character_id=target_id where id=own.id;
    else delete from public.online_guild_members where character_id=target_id;end if;
   end if;
  else raise exception 'ギルドの操作を確認してください。';end if;
  result:=public.online_world_v14('poll','{}');
 else
  result:=public.online_world_v14(action,payload);
  if action='inspect_player' then base_inspection:=result->'inspection';target_id:=(payload->>'character_id')::uuid;end if;
 end if;
 if c.id is null then select * into c from public.online_characters where id=(result->'active'->>'id')::uuid and user_id=uid;end if;
 result:=result||public.online_guild_state(c.id);
 if base_inspection is not null then result:=result||jsonb_build_object('inspection',public.online_social_inspection(base_inspection,c.id,coalesce((payload->>'inspect_character_id')::uuid,target_id)));end if;
 return result;
end $$;
revoke all on function public.online_world(text,jsonb) from public,anon;
grant execute on function public.online_world(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
