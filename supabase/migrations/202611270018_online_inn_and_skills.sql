begin;
alter table public.online_presence drop constraint online_presence_location_check;
alter table public.online_presence add constraint online_presence_location_check
 check(location in('town','warehouse','dungeon','house','inn'));

create table public.online_inn_messages(
 id bigint generated always as identity primary key,
 character_id uuid references public.online_characters(id) on delete cascade,
 name text not null,message text not null,created_at timestamptz not null default clock_timestamp()
);
create index online_inn_messages_sender on public.online_inn_messages(character_id,created_at desc);
alter table public.online_inn_messages enable row level security;
revoke all on public.online_inn_messages from public,anon,authenticated;

create function public.online_inn_blocked(x int,y int) returns boolean language sql immutable
set search_path=public,pg_temp as $$
 select case when x=7 and y=9 then false
   when x not between 1 and 13 or y not between 2 and 8 then true
   when y<=3 and x between 3 and 11 then true
   when y between 4 and 7 and (x<=3 or x>=11) then true
   else x=13 and y=3 end
$$;

alter table public.online_characters
 add column adventure_xp integer not null default 0,
 add column character_skills jsonb not null default '[null,null]',
 add column character_skill_ready jsonb not null default '{}';

create table public.online_adventure_xp_awards(
 room_id uuid references public.online_adventure_rooms(id) on delete cascade,
 enemy_id text not null,primary key(room_id,enemy_id)
);
alter table public.online_adventure_xp_awards enable row level security;
revoke all on public.online_adventure_xp_awards from public,anon,authenticated;

create function public.online_award_adventure_xp() returns trigger language plpgsql
set search_path=public,pg_temp as $$
declare enemy jsonb; old_enemies jsonb:=old.snapshot->'enemies'; new_enemies jsonb:=new.snapshot->'enemies'; boss boolean; earned int;
begin
 if new_enemies is null then return new;end if;
 for enemy in
  select current.value from jsonb_array_elements(new_enemies) current
  join jsonb_array_elements(old_enemies) previous on current.value->>'id'=previous.value->>'id'
  where (current.value->>'hp')::int<=0 and (previous.value->>'hp')::int>0
 loop
  boss:=online_in_boss_room((enemy->>'x')::int,(enemy->>'y')::int);
  if boss and not coalesce((new.snapshot->>'stairs')::boolean,false) and new.snapshot#>>'{bossEncounter,phase}' is distinct from 'cleared' then continue;end if;
  insert into online_adventure_xp_awards values(new.id,enemy->>'id') on conflict do nothing;
  if not found then continue;end if;
  earned:=case when boss then 40 else 8 end;
  update online_characters c set adventure_xp=c.adventure_xp+earned
  from online_adventure_members a join online_presence p on p.character_id=a.character_id
  where c.id=a.character_id and c.hp>0 and a.room_id=new.id and a.floor=1 and a.finished_at is null
    and p.location='dungeon' and p.seen_at>clock_timestamp()-interval '20 seconds'
    and online_in_boss_room(a.x,a.y)=boss
    and (boss or abs(a.x-(enemy->>'x')::int)+abs(a.y-(enemy->>'y')::int)<=9);
 end loop;
 return new;
end$$;
create trigger online_adventure_award_xp after update of snapshot on public.online_adventure_rooms
 for each row when(old.snapshot->'enemies' is distinct from new.snapshot->'enemies')
 execute function public.online_award_adventure_xp();

-- Town coordinate conflict resolution must never displace a tavern visitor.
do $$
declare definition text:=pg_get_functiondef('public.online_world_core(text,jsonb)'::regprocedure);
 hook text:='if exists(select 1 from public.online_presence other where other.location=''town'' and other.user_id<>uid and other.x=r.x';
begin
 if strpos(definition,hook)=0 then raise exception 'Town coordinate hook missing';end if;
 execute replace(definition,hook,'if r.location=''town'' and exists(select 1 from public.online_presence other where other.location=''town'' and other.user_id<>uid and other.x=r.x');
end$$;

alter function public.online_world(text,jsonb) rename to online_world_pre_inn_skills;

create function public.online_world(action text,payload jsonb default '{}') returns jsonb language plpgsql
security definer set search_path=public,pg_temp as $$
declare
 uid uuid:=auth.uid(); p online_presence; c online_characters; m online_adventure_members;
 snapshot jsonb; response jsonb; next_action text:=action; k text; msg text;
 nx int;ny int;idx int;min_level int; cooldown int; amount int; affected int;
 now_ms bigint; house_key text;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'ログインしてください。';end if;
 if action like 'party\_%' escape '\' or action='channel_chat' and payload->>'channel'='party'
   or action='map_pin' and payload->>'scope'='party' then raise exception 'パーティ機能は終了しました。';end if;
 select * into p from online_presence where user_id=uid;
 if action in('inn_enter','inn_exit','set_character_skill','cast_character_skill')
   or p.location='inn' and action in('chat','move','wait') then
  perform online_lock_action(case when action='cast_character_skill' then 'use_item' else action end);
  select * into p from online_presence where user_id=uid;
  select * into c from online_characters where id=p.character_id and user_id=uid;
  if c.id is null then raise exception 'キャラクターを選んでください。';end if;
  next_action:='poll';
  if action='inn_enter' then
   if p.location<>'town' or p.y<4 or abs(p.x-3)+abs(p.y-3)>2 then raise exception '宿の扉まで近づいてください。';end if;
   select x,y into nx,ny from generate_series(5,9) g(x) cross join generate_series(5,8) h(y)
   where not online_inn_blocked(x,y) and not exists(
    select 1 from online_presence other where other.location='inn' and other.x=g.x and other.y=h.y
      and other.seen_at>clock_timestamp()-interval '20 seconds')
   order by abs(x-7)+abs(y-8),y,x limit 1;
   if nx is null then raise exception '酒場が満員です。';end if;
   update online_presence set location='inn',x=nx,y=ny,dir='up',moved_at='epoch',seen_at=clock_timestamp() where user_id=uid;
  elsif action='inn_exit' then
   if p.location<>'inn' or abs(p.x-7)+abs(p.y-9)>1 then raise exception '出口の扉まで近づいてください。';end if;
   select tile_x,tile_y into nx,ny from online_free_town_tile(3,4,uid);
   if nx is null then raise exception '出口が混み合っています。';end if;
   update online_presence set location='town',x=nx,y=ny,dir='down',moved_at='epoch',seen_at=clock_timestamp() where user_id=uid;
  elsif p.location='inn' and action='move' then
   nx:=(payload->>'x')::int;ny:=(payload->>'y')::int;
   if nx is null or ny is null or abs(nx-p.x)+abs(ny-p.y)<>1 or online_inn_blocked(nx,ny) or exists(
    select 1 from online_presence other where other.user_id<>uid and other.location='inn' and other.x=nx and other.y=ny
      and other.seen_at>clock_timestamp()-interval '20 seconds') then raise exception 'そこには移動できません。';end if;
   if p.moved_at>clock_timestamp()-make_interval(secs=>online_move_step_ms(c.id)/1000.0) then raise exception '移動が速すぎます。';end if;
   update online_presence set x=nx,y=ny,dir=case when nx>p.x then 'right' when nx<p.x then 'left' when ny>p.y then 'down' else 'up' end,
    moved_at=clock_timestamp(),seen_at=clock_timestamp() where user_id=uid;
  elsif p.location='inn' and action='chat' then
   msg:=btrim(payload->>'message');
   if msg is null or char_length(msg) not between 1 and 200 then raise exception '200文字まで入力できます。';end if;
   if exists(select 1 from online_inn_messages where character_id=c.id and created_at>clock_timestamp()-interval '2 seconds') then raise exception '少し待ってから送信してください。';end if;
   insert into online_inn_messages(character_id,name,message) values(c.id,c.name,msg);
  elsif action in('set_character_skill','cast_character_skill') then
   k:=payload->>'key';
   min_level:=case k when 'heal' then 2 when 'area_heal' then 5 end;
   if k is not null and min_level is null then raise exception 'スキルを確認してください。';end if;
   if min_level is not null and 1+c.adventure_xp/20<min_level then raise exception 'レベルが足りません。';end if;
   if action='set_character_skill' then
    idx:=(payload->>'slot')::int;
    if idx is null or idx not between 0 and 1 then raise exception 'スキル枠を確認してください。';end if;
    if k is not null and c.character_skills->>(1-idx)=k then
     c.character_skills:=jsonb_set(c.character_skills,array[(1-idx)::text],'null');
    end if;
    update online_characters set character_skills=jsonb_set(c.character_skills,array[idx::text],coalesce(to_jsonb(k),'null')) where id=c.id;
   else
    now_ms:=online_adventure_now_ms();
    if p.location='warehouse' or c.hp<=0 then raise exception '今はスキルを使えません。';end if;
    if k is null or not(c.character_skills?k) then raise exception '先にスキルを装備してください。';end if;
    if coalesce((c.character_skill_ready->>k)::bigint,0)>now_ms then raise exception 'スキルの再使用までお待ちください。';end if;
    if p.location='dungeon' then
     select * into m from online_adventure_members where character_id=c.id and finished_at is null;
     select r.snapshot into snapshot from online_adventure_rooms r where r.id=m.room_id;
     if m.id is null or m.rail_trip is not null or snapshot#>>'{bossEncounter,phase}'='opening'
      or now_ms<coalesce((snapshot#>>'{bossEncounter,smash,at}')::bigint+(snapshot#>>'{bossEncounter,smash,duration}')::int,0)
      then raise exception '今はスキルを使えません。';end if;
    elsif p.location='house' then
     select v.house_id into house_key from online_house_visits v where v.character_id=c.id;
    end if;
    cooldown:=case k when 'heal' then 10000 else 18000 end;
    amount:=round((case k when 'heal' then 35 else 25 end)*online_necklace_skill(c.id));
    update online_characters ally set hp=least(online_character_hp_max(ally.id),ally.hp+amount)
    from online_presence nearby
    where nearby.character_id=ally.id and nearby.location=p.location and ally.hp>0 and ally.hp<online_character_hp_max(ally.id)
    and (ally.id=c.id or k='area_heal' and nearby.seen_at>clock_timestamp()-interval '20 seconds' and case p.location
      when 'dungeon' then exists(select 1 from online_adventure_members a where a.character_id=ally.id
       and a.room_id=m.room_id and a.floor=m.floor and a.finished_at is null and a.rail_trip is null
       and (a.floor<>1 or online_in_boss_room(a.x,a.y)=online_in_boss_room(m.x,m.y)) and abs(a.x-m.x)+abs(a.y-m.y)<=3)
      when 'house' then exists(select 1 from online_house_visits a join online_house_visits b on b.character_id=c.id
       where a.character_id=ally.id and a.house_id=house_key and abs(a.x-b.x)+abs(a.y-b.y)<=3)
      else abs(nearby.x-p.x)+abs(nearby.y-p.y)<=3 end);
    get diagnostics affected=row_count;
    if affected=0 then raise exception '回復が必要な対象がいません。';end if;
    update online_characters set character_skill_ready=jsonb_set(character_skill_ready,array[k],to_jsonb(now_ms+cooldown)) where id=c.id;
   end if;
  end if;
 elsif p.location='inn' and action not in('poll','list','leave','join','equip','use_item','set_quick_slot','swap_quick_slots','claim_item','redeem_code','inspect_player')
  and action not like 'guild\_%' escape '\' and action not like 'friend\_%' escape '\'
  and not(action='channel_chat' and payload->>'channel'='guild') then
  raise exception 'その操作は酒場では使えません。';
 end if;

 response:=online_world_pre_inn_skills(next_action,case when action=next_action then payload else '{}' end);
 if coalesce((response->>'pollDeferred')::boolean,false) then return response;end if;
 select * into c from online_characters where id=(response#>>'{active,id}')::uuid and user_id=uid;
 if c.id is not null then
  response:=jsonb_set(response,'{active}',response->'active'||jsonb_build_object(
   'level',1+c.adventure_xp/20,'exp',c.adventure_xp%20,'skillLoadout',c.character_skills,'skillReadyAt',c.character_skill_ready));
 end if;
 select * into p from online_presence where user_id=uid;
 if p.location='inn' and c.id=p.character_id then
  response:=response||jsonb_build_object('house',
   jsonb_build_object('id','adventurers-inn','name','冒険者の宿','width',15,'height',10,'tier',0,
    'ownerId','','ownerName','冒険者の宿','mine',false,'allowFriends',false,'allowGuild',false,'x',p.x,'y',p.y),
   'active',response->'active'||'{"location":"inn"}'::jsonb,'drops','[]'::jsonb,'trainingHits','[]'::jsonb,
   'players',coalesce((select jsonb_agg(jsonb_build_object(
    'character_id',ally.id,'name',ally.name,'gender',ally.gender,'hair_color',ally.hair_color,
    'armor',case when coalesce((ally.gear->>'armor')::boolean,false) then ally.gear->>'armor_key' else 'leather' end,
    'weapon',case when coalesce((ally.gear->>'weapon')::boolean,false) then ally.gear->>'weapon_key' end,
    'shield',case when coalesce((ally.gear->>'shield')::boolean,false) then ally.gear->>'shield_key' end,
    'boots',case when coalesce((ally.gear->>'boots')::boolean,false) then ally.gear->>'boots_key' end,
    'gloves',case when coalesce((ally.gear->>'gloves')::boolean,false) then ally.gear->>'gloves_key' end,
    'x',pr.x,'y',pr.y,'dir',pr.dir,'moveStepMs',online_move_step_ms(ally.id)) order by ally.id)
    from online_presence pr join online_characters ally on ally.id=pr.character_id
    where pr.location='inn' and (pr.user_id=uid or pr.seen_at>clock_timestamp()-interval '20 seconds')),'[]'::jsonb),
   'messages',coalesce((select jsonb_agg(chat order by chat.id) from
    (select id,character_id,name,message from online_inn_messages order by id desc limit 20) chat),'[]'::jsonb));
 end if;
 return (response-'party'-'partyInvites')||jsonb_build_object(
  'channelMessages',coalesce((select jsonb_agg(value) from jsonb_array_elements(response->'channelMessages') where value->>'channel'='guild'),'[]'::jsonb),
  'mapPins',coalesce((select jsonb_agg(value) from jsonb_array_elements(response->'mapPins') where value->>'scope'='room'),'[]'::jsonb));
end$$;
revoke all on function public.online_inn_blocked(int,int),public.online_award_adventure_xp(),
 public.online_world_pre_inn_skills(text,jsonb),public.online_world(text,jsonb) from public,anon,authenticated;
grant execute on function public.online_world(text,jsonb) to authenticated;
commit;
