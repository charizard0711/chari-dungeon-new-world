begin;
insert into online_adventure_config(id,data)values('effect_panels',$panels$[{"id":"heal_entry","kind":"heal","x":46,"y":77},{"id":"heal_spring","kind":"heal","x":18,"y":66},{"id":"heal_store","kind":"heal","x":71,"y":68},{"id":"heal_hall","kind":"heal","x":44,"y":53},{"id":"heal_barracks","kind":"heal","x":17,"y":40},{"id":"heal_spider","kind":"heal","x":71,"y":43},{"id":"heal_golem","kind":"heal","x":18,"y":17},{"id":"heal_treasury","kind":"heal","x":72,"y":17},{"id":"heal_boss","kind":"heal","x":43,"y":20},{"id":"heal_blessing","kind":"heal","x":4,"y":36},{"id":"heal_coop","kind":"heal","x":100,"y":36},{"id":"paralysis_1","kind":"paralysis","x":36,"y":26},{"id":"paralysis_2","kind":"paralysis","x":65,"y":54}]$panels$::jsonb)on conflict(id)do update set data=excluded.data;
create function public.online_panel_rate(cid uuid,stat text)returns numeric language sql stable security definer set search_path=public,pg_temp as $$
select coalesce((select case when stat='attack'then coalesce((r.snapshot#>>array['panelBuffs',cid::text,'attack_up','rate'])::numeric,1)*coalesce((r.snapshot#>>array['panelBuffs',cid::text,'attack_down','rate'])::numeric,1)else coalesce((r.snapshot#>>array['panelBuffs',cid::text,'defense_up','rate'])::numeric,1)*coalesce((r.snapshot#>>array['panelBuffs',cid::text,'defense_down','rate'])::numeric,1)end from online_adventure_members m join online_presence p on p.character_id=m.character_id join online_adventure_rooms r on r.id=m.room_id where m.character_id=cid and m.finished_at is null and m.floor=1 and p.location='dungeon'and r.status='active'),1)$$;
alter function public.online_adventure_defence(uuid)rename to online_adventure_defence_pre_panels;
create function public.online_adventure_defence(cid uuid)returns int language sql stable security definer set search_path=public,pg_temp as $$select round(online_adventure_defence_pre_panels(cid)*online_panel_rate(cid,'defense'))::int$$;
do $$declare s text;begin
select pg_get_functiondef('online_world_adventures(text,jsonb)'::regprocedure)into s;
if position('n:=round(n*public.online_maze_buff(c.id))::int;'in s)=0 then raise exception 'Panel damage hook missing';end if;
s:=replace(s,'n:=round(n*public.online_maze_buff(c.id))::int;','n:=round(n*public.online_maze_buff(c.id))::int;n:=round(n*public.online_panel_rate(c.id,''attack''))::int;');execute s;
end$$;

create function public.online_panel_sync(rid uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare s jsonb;prior jsonb;panels jsonb;fresh jsonb;broken jsonb;buffs jsonb;person record;entry record;spot record;kind text;attempt bigint;current_phase text;begin
select snapshot into s from online_adventure_rooms where id=rid for update;if s is null then return;end if;prior:=s;
if not(s?'effectPanels')then select data into panels from online_adventure_config where id='effect_panels';s:=s||jsonb_build_object('effectPanels',panels,'panelBuffs','{}'::jsonb,'panelParalysis','{}'::jsonb,'panelShocks','{}'::jsonb,'panelHealUsed','{}'::jsonb);end if;
panels:=s->'effectPanels';broken:=coalesce(s->'brokenFloors','[]');current_phase:=s#>>'{bossEncounter,phase}';
-- Destroyed tiles stay destroyed. Buffs are tied to their panel source, not to fountain blessings.
select coalesce(jsonb_agg(p||jsonb_build_object('destroyed',coalesce((p->>'destroyed')::boolean,false)or exists(select 1 from jsonb_array_elements(broken)b where b->>'x'=p->>'x'and b->>'y'=p->>'y'))),'[]')into panels from jsonb_array_elements(panels)p;
if current_phase='waiting'and s?'panelBossAttempt'then
select coalesce(jsonb_agg(p),'[]')into panels from jsonb_array_elements(panels)p where not coalesce((p->>'bossPanel')::boolean,false);
s:=s-'panelBossAttempt';
end if;
if current_phase='battle'and not(s?'panelBossAttempt')then
 foreach kind in array array['attack_up','defense_up']loop
  select x,y into spot from generate_series(43,56)gx(x)cross join generate_series(7,20)gy(y)
  where not online_adventure_blocked(x,y,1,s)
  and not exists(select 1 from jsonb_array_elements(panels)p where(p->>'x')::int=gx.x and(p->>'y')::int=gy.y)
  and not exists(select 1 from jsonb_array_elements(s->'enemies')e where(e->>'hp')::int>0 and(e->>'x')::int=gx.x and(e->>'y')::int=gy.y)
  and not exists(select 1 from online_adventure_members m join online_presence p on p.character_id=m.character_id where m.room_id=rid and m.floor=1 and m.finished_at is null and m.x=gx.x and m.y=gy.y and p.location='dungeon')order by random()limit 1;
  if spot.x is not null then panels:=panels||jsonb_build_array(jsonb_build_object('id','boss_'||kind,'kind',kind,'x',spot.x,'y',spot.y,'bossPanel',true,'destroyed',false));end if;
 end loop;s:=s||jsonb_build_object('panelBossAttempt',s#>'{bossEncounter,at}');
end if;
buffs:='{}';for person in select key,value from jsonb_each(coalesce(s->'panelBuffs','{}'))loop
 fresh:='{}';for entry in select key,value from jsonb_each(person.value)loop
 if exists(select 1 from jsonb_array_elements(panels)p where p->>'id'=entry.value->>'source'and not coalesce((p->>'destroyed')::boolean,false))then fresh:=fresh||jsonb_build_object(entry.key,entry.value);end if;
 end loop;buffs:=buffs||jsonb_build_object(person.key,fresh);end loop;
if exists(select 1 from online_adventure_rooms where id=rid and status='cleared')then buffs:='{}';s:=s||'{"panelParalysis":{}}';end if;
s:=s||jsonb_build_object('effectPanels',panels,'panelBuffs',buffs);
if s is distinct from prior then update online_adventure_rooms set snapshot=s where id=rid;end if;
end$$;

alter function public.online_maze_sync(uuid)rename to online_maze_sync_pre_panels;
create function public.online_maze_sync(rid uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$begin perform online_maze_sync_pre_panels(rid);perform online_panel_sync(rid);end$$;
alter function public.online_world(text,jsonb)rename to online_world_pre_panels;
create function public.online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare m online_adventure_members;after_m online_adventure_members;presence online_presence;s jsonb;p jsonb;result jsonb;cid uuid;actual text:=action;used jsonb;kind text;hpmax int;begin
if auth.uid()is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)then raise exception 'ログインしてください。';end if;
perform online_lock_action(action);select * into presence from online_presence where user_id=auth.uid();cid:=presence.character_id;select * into m from online_adventure_members where character_id=cid and finished_at is null;
if presence.location='dungeon'and m.floor=1 then
 perform online_maze_sync(m.room_id);select snapshot into s from online_adventure_rooms where id=m.room_id;
 if action in('move','attack','skill','wait','use_item')and coalesce((s#>>array['panelParalysis',cid::text])::int,0)>0 then
 actual:='wait';s:=jsonb_set(s,'{panelParalysis}',coalesce(s->'panelParalysis','{}')||jsonb_build_object(cid::text,0));s:=jsonb_set(s,'{panelShocks}',coalesce(s->'panelShocks','{}')||jsonb_build_object(cid::text,online_adventure_now_ms()));update online_adventure_rooms set snapshot=s where id=m.room_id;
 end if;
end if;
result:=online_world_pre_panels(actual,case when actual<>action then '{}'::jsonb else payload end);
if presence.location='dungeon'and m.floor=1 then
 select * into after_m from online_adventure_members where id=m.id;select snapshot into s from online_adventure_rooms where id=m.room_id;
 if action='move'and actual='move'and(after_m.x<>m.x or after_m.y<>m.y)then
  select value into p from jsonb_array_elements(s->'effectPanels')where(value->>'x')::int=after_m.x and(value->>'y')::int=after_m.y and not coalesce((value->>'destroyed')::boolean,false)limit 1;
  kind:=p->>'kind';
  if kind='heal'then
   used:=coalesce(s#>array['panelHealUsed',cid::text],'[]');
   if not(used?(p->>'id'))then
    hpmax:=case when exists(select 1 from online_characters where id=cid and coalesce((gear->>'weapon')::boolean,false)and gear->>'weapon_key'like'star_%')then 150 else 100 end;
    if(select hp from online_characters where id=cid)<hpmax then
    update online_characters set hp=least(hpmax,hp+25)where id=cid;
    s:=jsonb_set(s,'{panelHealUsed}',coalesce(s->'panelHealUsed','{}')||jsonb_build_object(cid::text,used||jsonb_build_array(p->>'id')));
    end if;
   end if;
  elsif kind='paralysis'then
   s:=jsonb_set(s,'{panelParalysis}',coalesce(s->'panelParalysis','{}')||jsonb_build_object(cid::text,1));s:=jsonb_set(s,'{panelShocks}',coalesce(s->'panelShocks','{}')||jsonb_build_object(cid::text,online_adventure_now_ms()));
  elsif kind in('attack_up','defense_up','attack_down','defense_down')then
   used:=coalesce(s#>array['panelBuffs',cid::text],'{}')||jsonb_build_object(kind,jsonb_build_object('source',p->>'id','rate',case when kind like'%_up'then 1.2 else .8 end));
   s:=jsonb_set(s,'{panelBuffs}',coalesce(s->'panelBuffs','{}')||jsonb_build_object(cid::text,used));
  end if;
  update online_adventure_rooms set snapshot=s where id=m.room_id and snapshot is distinct from s;
 end if;
 perform online_panel_sync(m.room_id);select snapshot into s from online_adventure_rooms where id=m.room_id;
 if result->'adventure'is not null and result->'adventure'<>'null'::jsonb then result:=jsonb_set(result,'{adventure,snapshot}',s);end if;
 if result->'active'is not null then result:=jsonb_set(result,'{active,hp}',to_jsonb((select hp from online_characters where id=cid)));end if;
end if;return result;
end$$;
revoke all on function public.online_panel_rate(uuid,text),public.online_adventure_defence_pre_panels(uuid),public.online_adventure_defence(uuid),public.online_panel_sync(uuid),public.online_maze_sync_pre_panels(uuid),public.online_maze_sync(uuid),public.online_world_pre_panels(text,jsonb)from public,anon,authenticated;
revoke all on function public.online_world(text,jsonb)from public,anon;grant execute on function public.online_world(text,jsonb)to authenticated;
notify pgrst,'reload schema';commit;
