-- Included after the generated config update. All helpers are server-only.
create or replace function public.online_in_boss_room(px int,py int)returns boolean language sql immutable as $$select px between 41 and 58 and py between 3 and 22$$;
alter function public.online_adventure_defence(uuid) rename to online_adventure_defence_pre_maze;
create function public.online_maze_buff(cid uuid)returns numeric language sql stable security definer set search_path=public,pg_temp as $$select coalesce((select (r.snapshot->'fountainBuffs'->>cid::text)::numeric from online_adventure_members m join online_adventure_rooms r on r.id=m.room_id join online_presence p on p.character_id=m.character_id where m.character_id=cid and m.finished_at is null and m.floor=1 and p.location='dungeon' and r.status='active'),1)$$;
create function public.online_adventure_defence(cid uuid)returns integer language sql stable security definer set search_path=public,pg_temp as $$select round(public.online_adventure_defence_pre_maze(cid)*public.online_maze_buff(cid))::int$$;

create or replace function public.online_adventure_blocked(px int,py int,f int,s jsonb)returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare cfg jsonb;g jsonb;p jsonb;begin
 if f=2 then return px<1 or py<1 or px>11 or py>9 or(px=5 and py=6);end if;
 select data into cfg from online_adventure_config where id='floor1';
 if px<0 or py<0 or px>=(cfg->>'width')::int or py>=(cfg->>'height')::int or coalesce(substring(cfg->'rows'->>py from px+1 for 1),'#')<>'.'then return true;end if;
 if px between 94 and 97 and py between 36 and 37 and coalesce(s->'bridge'->>'phase','down')<>'up'then return true;end if;
 if px between 49 and 50 and py between 23 and 24 and coalesce(s->'bossEncounter'->>'phase','waiting')in('opening','battle','returning')then return true;end if;
 for g in select jsonb_array_elements(cfg->'gates')loop
  if px>=(g->>'x')::int and px<(g->>'x')::int+(g->>'w')::int and py>=(g->>'y')::int and py<(g->>'y')::int+(g->>'h')::int then
   if g->>'key'='both'then if not(coalesce(s->'keys','[]')?'amber'and coalesce(s->'keys','[]')?'violet')then return true;end if;
   elsif not(coalesce(s->'keys','[]')?(g->>'key'))then return true;end if;
  end if;
 end loop;
 for p in select jsonb_array_elements(cfg->'props')loop if px=(p->>'x')::int and py=(p->>'y')::int and(p->>'id'<>'stairs'or coalesce((s->>'stairs')::boolean,false))then return true;end if;end loop;
 return false;
end$$;

create function public.online_maze_sync(rid uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare r online_adventure_rooms;s jsonb;cfg jsonb;es jsonb;ids jsonb;roll numeric;phase text;now_ms bigint:=online_adventure_now_ms();actors jsonb;cnt int;ready_count int;occupants int;holder uuid;b jsonb;pad jsonb;m record;oldphase text;begin
 perform pg_advisory_xact_lock(hashtextextended('online-room:'||rid::text,0));
 select * into r from online_adventure_rooms where id=rid for update;if r.id is null then return;end if;s:=r.snapshot;select data into cfg from online_adventure_config where id='floor1';
 if coalesce((s->>'mapVersion')::int,0)<>5 then
  select jsonb_agg(fresh||jsonb_build_object('hp',case when coalesce((fresh->>'boss')::boolean,false)then 0 else coalesce((prior->>'hp')::int,(fresh->>'hp')::int)end) order by ord)into es from jsonb_array_elements(cfg->'enemies')with ordinality f(fresh,ord)left join lateral(select value prior from jsonb_array_elements(coalesce(s->'enemies','[]'))where value->>'id'=fresh->>'id'limit 1)p on true;
  select jsonb_agg(id)into ids from(select value->>'id'id from jsonb_array_elements(cfg->'props')where value->>'kind'='chest'and value->>'id'<>'coop_gold'order by random()limit 6)q;
  roll:=random();s:=s||jsonb_build_object('version',5,'mapVersion',5,'enemies',es,'telegraphs','[]'::jsonb,'goldChests',ids||'["coop_gold"]'::jsonb,'fountainKind',case when roll<.01 then'gold'when roll<.11 then'silver'else'normal'end,'fountainUsed','[]'::jsonb,'fountainBuffs','{}'::jsonb,'bossEncounter',jsonb_build_object('phase',case when r.status='cleared'then'cleared'else'waiting'end,'at',now_ms),'bridge','{"phase":"down","latched":false,"armed":true}'::jsonb);
  s:=s-'turn';delete from online_boss_rounds where room_id=rid;delete from online_boss_intents where room_id=rid;
 end if;
 -- Pressure switch needs another character to cross. Once occupied, it latches until empty.
 select a.character_id into holder from online_adventure_members a join online_presence p on p.character_id=a.character_id join online_characters c on c.id=a.character_id where a.room_id=rid and a.finished_at is null and a.floor=1 and a.x=92 and a.y=39 and p.location='dungeon'and p.seen_at>clock_timestamp()-interval '5 seconds'and c.hp>0 limit 1;
 select count(*)into occupants from online_adventure_members a join online_presence p on p.character_id=a.character_id join online_characters c on c.id=a.character_id where a.room_id=rid and a.finished_at is null and a.floor=1 and a.x>=94 and a.x<=104 and a.y between 32 and 38 and p.location='dungeon'and c.hp>0;
 b:=s->'bridge';oldphase:=b->>'phase';
 if occupants>0 then b:=b||'{"phase":"up","latched":true}'::jsonb;
 elsif coalesce((b->>'latched')::boolean,false)then b:=b||'{"phase":"down","latched":false,"armed":false}'::jsonb;
 elsif holder is null then b:=b||'{"phase":"down","armed":true}'::jsonb;
 elsif coalesce((b->>'armed')::boolean,true)then
  if b->>'phase'='down'then b:=b||jsonb_build_object('phase','rising','at',now_ms);elsif b->>'phase'='rising'and now_ms-(b->>'at')::bigint>=1200 then b:=b||'{"phase":"up"}'::jsonb;end if;
 end if;
 if b->>'phase'<>oldphase and b->>'phase'<>'rising'then b:=b||jsonb_build_object('at',now_ms);end if;
 b:=b||jsonb_build_object('holder',holder);s:=s||jsonb_build_object('bridge',b);
 phase:=s->'bossEncounter'->>'phase';
 if r.status='cleared'then s:=s||jsonb_build_object('bossEncounter',jsonb_build_object('phase','cleared','at',now_ms),'fountainBuffs','{}'::jsonb);
 elsif phase='waiting'then
  select coalesce(jsonb_agg(a.character_id order by a.character_id),'[]'),count(*)into actors,cnt from online_adventure_members a join online_presence p on p.character_id=a.character_id join online_characters c on c.id=a.character_id where a.room_id=rid and a.finished_at is null and a.floor=1 and online_in_boss_room(a.x,a.y)and p.location='dungeon'and p.seen_at>clock_timestamp()-interval '5 seconds'and c.hp>0;
  select count(distinct a.x)into ready_count from online_adventure_members a where a.room_id=rid and actors?a.character_id::text and a.y=15 and a.x in(select 47+2*i from generate_series(0,cnt-1)i);
  s:=jsonb_set(s,'{bossEncounter}',(s->'bossEncounter')||jsonb_build_object('padCount',cnt));
  if cnt>0 and ready_count=cnt then s:=jsonb_set(s,'{bossEncounter}',jsonb_build_object('phase','opening','at',now_ms,'participants',actors,'padCount',cnt));end if;
 elsif phase in('opening','battle')then
  if not exists(select 1 from online_adventure_members a join online_presence p on p.character_id=a.character_id join online_characters c on c.id=a.character_id where a.room_id=rid and(s->'bossEncounter'->'participants')?a.character_id::text and a.floor=1 and online_in_boss_room(a.x,a.y)and p.location='dungeon'and p.seen_at>clock_timestamp()-interval '30 seconds'and c.hp>0)then
   s:=jsonb_set(s,'{bossEncounter}',(s->'bossEncounter')||jsonb_build_object('phase','returning','at',now_ms));s:=s||'{"telegraphs":[]}'::jsonb;select jsonb_agg(case when coalesce((e->>'boss')::boolean,false)then e||'{"hp":0}'::jsonb else e end)into es from jsonb_array_elements(s->'enemies')e;s:=s||jsonb_build_object('enemies',es);
  elsif phase='opening'and now_ms-(s->'bossEncounter'->>'at')::bigint>=2800 then
   select jsonb_agg(case when coalesce((e->>'boss')::boolean,false)then e||'{"hp":480,"x":50,"y":10}'::jsonb else e end)into es from jsonb_array_elements(s->'enemies')e;s:=s||jsonb_build_object('enemies',es,'bossEncounter',(s->'bossEncounter')||jsonb_build_object('phase','battle','at',now_ms));
  end if;
 elsif phase='returning'and now_ms-(s->'bossEncounter'->>'at')::bigint>=1800 then
  select jsonb_agg(case when coalesce((e->>'boss')::boolean,false)then e||'{"hp":0,"x":50,"y":10}'::jsonb else e end)into es from jsonb_array_elements(s->'enemies')e;s:=s||jsonb_build_object('enemies',es,'bossEncounter',jsonb_build_object('phase','waiting','at',now_ms),'telegraphs','[]'::jsonb);delete from online_boss_rounds where room_id=rid;delete from online_boss_intents where room_id=rid;s:=s-'turn';
 end if;
 if s is distinct from r.snapshot then update online_adventure_rooms set snapshot=s where id=rid;end if;
end$$;

alter function public.online_adventure_tick(uuid)rename to online_adventure_tick_pre_maze;
create function public.online_adventure_tick(rid uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$begin if current_setting('online.resolving_boss',true)='on'then return;end if;perform online_maze_sync(rid);perform online_adventure_tick_pre_maze(rid);perform online_maze_sync(rid);end$$;
-- The combat implementation is shared by ordinary and simultaneous boss turns.
do $$declare src text;begin
 select pg_get_functiondef('public.online_world_adventures(text,jsonb)'::regprocedure)into src;
 if position('damage:=damage+n;'in src)=0 then raise exception 'Attack hook mismatch';end if;
 src:=replace(src,'damage:=damage+n;','n:=round(n*public.online_maze_buff(c.id))::int;damage:=damage+n;');execute src;
end$$;

alter function public.online_world(text,jsonb)rename to online_world_pre_maze;
create function public.online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare uid uuid:=auth.uid();p online_presence;m online_adventure_members;r online_adventure_rooms;c online_characters;s jsonb;result jsonb;key text;item jsonb;arr jsonb;ins jsonb;slot text;mult numeric;kind text;cx int;cy int;nx int;ny int;handled boolean:=false;begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)then raise exception 'ログインしてください。';end if;
 if action not in('poll','list')then perform pg_advisory_xact_lock(71390119);end if;
 select * into p from online_presence where user_id=uid;select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
 if m.id is not null then perform online_maze_sync(m.room_id);select * into r from online_adventure_rooms where id=m.room_id;s:=r.snapshot;end if;
 if p.location='dungeon'and m.floor=1 then
  if online_in_boss_room(m.x,m.y)and s->'bossEncounter'->>'phase'in('opening','battle','returning')and action in('room_return','room_enter','room_teleport','room_stairs','leave')then raise exception 'ボス戦中は脱出できません。';end if;
  if action='move'then nx:=(payload->>'x')::int;ny:=(payload->>'y')::int;
   if nx between 94 and 97 and ny between 36 and 37 and not coalesce((s->'bridge'->>'latched')::boolean,false)and coalesce(s->'bridge'->>'holder','')=m.character_id::text then raise exception '別の仲間がパネルを踏んでいる必要があります。';end if;
   if online_in_boss_room(nx,ny)and not online_in_boss_room(m.x,m.y)and s->'bossEncounter'->>'phase'in('opening','battle','returning')then raise exception 'ボス戦が終わるまで入場できません。';end if;
  end if;
  if action='interact'then key:=payload->>'id';select(value->>'x')::int,(value->>'y')::int into cx,cy from jsonb_array_elements((select data->'props'from online_adventure_config where id='floor1'))where value->>'id'=key;
   if key='blessing'or exists(select 1 from jsonb_array_elements((select data->'props'from online_adventure_config where id='floor1'))a where a->>'id'=key and a->>'kind'='chest')then
    if cx is null or abs(m.x-cx)+abs(m.y-cy)>2 then raise exception '近くで操作してください。';end if;
    if key='coop_gold'and(m.x<98 or m.y<32 or m.y>38)then raise exception '宝物室の中で開けてください。';end if;
    select * into c from online_characters where id=m.character_id for update;
    if key='blessing'then
     if s->'fountainUsed'?c.id::text then raise exception 'この泉は一人一回までです。';end if;
     kind:=s->>'fountainKind';mult:=case kind when'gold'then 1.5 when'normal'then 1.1 else 1 end;ins:=c.instances;
     foreach slot in array array['weapon','shield','armor','necklace']loop
      select coalesce(jsonb_agg(case when(kind='gold'and slot='weapon')or(kind='silver'and coalesce((c.gear->>slot)::boolean,false)and e->>'id'=c.gear->>(slot||'_instance_id'))then jsonb_set(e,'{dur}',coalesce(e->'max','0'))else e end order by ord),'[]')into arr from jsonb_array_elements(coalesce(ins->slot,'[]'))with ordinality q(e,ord);
      if ins?slot then ins:=jsonb_set(ins,array[slot],arr);end if;
     end loop;
     update online_characters set instances=ins,hp=case when coalesce((gear->>'weapon')::boolean,false)and gear->>'weapon_key'like'star_%'then 150 else 100 end where id=c.id;
     s:=s||jsonb_build_object('fountainUsed',(s->'fountainUsed')||jsonb_build_array(c.id::text),'fountainBuffs',(s->'fountainBuffs')||jsonb_build_object(c.id::text,mult));
    else
     if s->'opened'?key then raise exception 'この宝箱は開封済みです。';end if;
     update online_characters set gold=gold+case when s->'goldChests'?key then 180 else 50 end where id=c.id;perform online_give_equipment(c.id,'potion',false);s:=jsonb_set(s,'{opened}',(s->'opened')||jsonb_build_array(key));
    end if;
    update online_adventure_rooms set snapshot=s where id=r.id;handled:=true;
   end if;
  end if;
 end if;
 result:=online_world_pre_maze(case when handled then'poll'else action end,case when handled then'{}'::jsonb else payload end);
 if result->'adventure'->>'id'is not null then perform online_maze_sync((result->'adventure'->>'id')::uuid);select snapshot into s from online_adventure_rooms where id=(result->'adventure'->>'id')::uuid;result:=jsonb_set(result,'{adventure,snapshot}',s);end if;
 return result;
end$$;
revoke all on function public.online_world_pre_maze(text,jsonb),public.online_adventure_tick_pre_maze(uuid),public.online_maze_sync(uuid),public.online_maze_buff(uuid),public.online_adventure_defence_pre_maze(uuid),public.online_adventure_defence(uuid),public.online_adventure_blocked(int,int,int,jsonb),public.online_adventure_tick(uuid),public.online_in_boss_room(int,int)from public,anon,authenticated;
revoke all on function public.online_world(text,jsonb)from public,anon;grant execute on function public.online_world(text,jsonb)to authenticated;
