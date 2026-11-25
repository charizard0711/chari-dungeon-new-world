-- Separate per-character movement from per-weapon attack cadence.
alter table online_characters add column move_step_ms int not null default 152 check(move_step_ms between 110 and 400);
create function online_move_step_ms(cid uuid)returns int language sql stable security definer set search_path=public,pg_temp as $$select coalesce((select move_step_ms from online_characters where id=cid),152)$$;
create function online_attack_ms(typ text)returns int language sql immutable as $$select case typ when 'dagger'then 280 when 'twin_daggers'then 300 when 'dual_sword'then 360 when 'katana'then 380 when 'longsword'then 420 when 'lance'then 470 when 'bow'then 650 when 'handgun'then 260 when 'greatsword'then 760 else 420 end$$;
create function online_character_attack_ms(cid uuid)returns int language sql stable security definer set search_path=public,pg_temp as $$select online_attack_ms((select k.weapon_type from online_characters c join online_catalog k on k.key=regexp_replace(c.gear->>'weapon_key','^star_','')where c.id=cid and coalesce((c.gear->>'weapon')::boolean,false)))$$;
create function online_enemy_rates(k text)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$select jsonb_build_object('moveMs',case when k='m_bat'then 130 when k in('m_dark_ninja','m_wisp')then 140 when online_mob_profile(k)->>'behavior'='slow'then 230 else 152 end,'attackMs',case when k='m_bat'then 800 when k='m_dark_ninja'then 750 when online_mob_profile(k)->>'behavior'='slow'then 1500 when coalesce((online_mob_profile(k)->>'ranged')::boolean,false)then 1250 else 1050 end)$$;
create or replace function online_attack_duration(cid uuid)returns numeric language sql stable security definer set search_path=public,pg_temp as $$select online_character_attack_ms(cid)::numeric$$;
-- Preserve every existing validation, replacing only hard-coded pacing checks.
do $$declare f record;s text;begin
for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname like 'online_world%' and prokind='f'loop
s:=pg_get_functiondef(f.oid);
s:=replace(s,'interval ''110 milliseconds''','make_interval(secs=>online_move_step_ms((select character_id from online_presence where user_id=auth.uid()))/1000.0)');
s:=replace(s,'interval ''260 milliseconds''','make_interval(secs=>online_character_attack_ms((select character_id from online_presence where user_id=auth.uid()))/1000.0)');
s:=replace(s,'interval ''320 milliseconds''','make_interval(secs=>online_character_attack_ms((select character_id from online_presence where user_id=auth.uid()))/1000.0)');
-- The buffered walk budget follows the same character speed, without trusting client time.
s:=replace(s,'interval ''330 milliseconds''','make_interval(secs=>3*online_move_step_ms(p.character_id)/1000.0)');
s:=replace(s,'*1000/110','*1000/online_move_step_ms(p.character_id)');
s:=replace(s,'interval ''111 milliseconds''','make_interval(secs=>(online_move_step_ms(p.character_id)+1)/1000.0)');
s:=replace(s,'done*interval ''110 milliseconds''','done*make_interval(secs=>online_move_step_ms(p.character_id)/1000.0)');
if s<>pg_get_functiondef(f.oid)then execute s;end if;end loop;end$$;
-- Remove initiative/step-driven AI, retaining torch, death gimmicks and normal item rules.
create or replace function online_world_pre_town_fountain(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$begin return online_world_pre_shared_turns(action,payload);end$$;
do $$declare s text;a int;b int;begin
select pg_get_functiondef('online_world_pre_railway(text,jsonb)'::regprocedure)into s;
a:=position(' for e in select value from jsonb_array_elements(s->''enemies'')'in s);b:=position(' light:=greatest'in s);
if a=0 or b<=a then raise exception 'Step AI hook missing';end if;
s:=substring(s,1,a-1)||substring(s,b);execute s;
end$$;
-- Keep the established enemy traits, movement/collision, ranged attacks and art events.
-- Only the shared clock may call this path now.
create or replace function online_turn_enemy(rid uuid,eid text,cid uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$begin
if current_setting('online.realtime_tick',true)='on'then perform online_turn_enemy_pre_shared_turns(rid,eid,cid);end if;end$$;
do $$declare s text;a int;b int;needle text;begin
select replace(pg_get_functiondef('online_turn_enemy_pre_cinematic(uuid,text,uuid)'::regprocedure),chr(13),'')into s;
s:=replace(s,'declare s jsonb;','declare trait_due boolean;s jsonb;');
s:=replace(s,'turnno:=coalesce((e->>''turnNo'')::int,0)+1;','trait_due:=nowms>=coalesce((e->>''nextTraitAt'')::bigint,0);turnno:=coalesce((e->>''turnNo'')::int,0)+case when trait_due then 1 else 0 end;');
s:=replace(s,'''moveIntervalMs'',175','''nextTraitAt'',case when trait_due then nowms+1000 else(e->>''nextTraitAt'')::bigint end');
a:=position(' -- Only this monster'in s);b:=position(' if g=''regen'''in s);
if a=0 or b<=a then raise exception 'Turn warning hook missing';end if;
s:=substring(s,1,a-1)||' danger:=coalesce(s->''telegraphs'',''[]'');'||E'\n'||substring(s,b);
s:=replace(s,'if g=''regen''and','if trait_due and g=''regen''and');
s:=replace(s,'and not(pr->>''behavior''=''slow''and turnno%2=1)','');
if s!~'then[[:space:]]+dmg:=greatest'then raise exception 'Enemy attack hook missing';end if;
s:=regexp_replace(s,'then[[:space:]]+dmg:=greatest','then if nowms>=coalesce((e->>''nextAttackAt'')::bigint,0)then dmg:=greatest');
s:=regexp_replace(s,' else[[:space:]]+select data into cfg',' end if; elsif nowms>=coalesce((e->>''nextMoveAt'')::bigint,0)then select data into cfg');
s:=replace(s,'if g=''web_trail''and','if trait_due and g=''web_trail''and');
s:=replace(s,'and turnno%4=1 and not exists','and nowms>=coalesce((e->>''nextAreaAt'')::bigint,nowms+1800) and not exists');
s:=replace(s,'''mode'',''turn'',''remaining'',2','''remaining'',2,''castAt'',nowms,''resolvesAt'',nowms+greatest(1300,2*online_move_step_ms(cid)+650),''durationMs'',greatest(1300,2*online_move_step_ms(cid)+650)');
s:=replace(s,' es:=jsonb_set(es,', ' if jsonb_array_length(danger)>jsonb_array_length(coalesce(s->''telegraphs'',''[]''))then e:=e||jsonb_build_object(''nextAreaAt'',nowms+6000);end if;'||E'\n'||' es:=jsonb_set(es,');
execute s;end$$;
create or replace function online_adventure_tick(rid uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare r online_adventure_rooms;s jsonb;e jsonb;after_e jsonb;t jsonb;danger jsonb:='[]';m record;target uuid;rates jsonb;nowms bigint:=online_adventure_now_ms();lastms bigint;move_ms int;attack_ms int;idx int;oldbeat int;b jsonb;begin
if current_setting('online.realtime_tick',true)='on'then return;end if;
perform pg_advisory_xact_lock(hashtextextended('online-room:'||rid::text,0));select * into r from online_adventure_rooms where id=rid for update;if r.id is null then return;end if;
lastms:=coalesce((r.snapshot->>'realtimeAt')::bigint,0);if nowms-lastms<110 then return;end if;
perform online_adventure_tick_pre_shared_turns(rid);select snapshot into s from online_adventure_rooms where id=rid;
if r.status<>'active'or not exists(select 1 from online_adventure_members a join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.floor=1 and a.finished_at is null and p.location='dungeon'and p.seen_at>clock_timestamp()-interval '5 seconds')then return;end if;
b:=s->'bossEncounter';
-- Mandatory cinematic: suspend warnings, ordinary attacks and movement for the arena.
if b->>'phase'='opening'or(b->>'phase'='battle'and b->'smash'is not null and nowms<(b#>>'{smash,at}')::bigint+(b#>>'{smash,duration}')::int)then
s:=s||jsonb_build_object('realtimeAt',nowms,'realtimePaused',true,'realtimeVersion',1);update online_adventure_rooms set snapshot=s-'turn'where id=rid;return;end if;
if coalesce((s->>'realtimePaused')::boolean,false)or nowms-lastms>2500 then
select jsonb_agg(value||jsonb_build_object('nextMoveAt',nowms+200,'nextAttackAt',nowms+900,'nextAreaAt',nowms+1800))into e from jsonb_array_elements(s->'enemies');s:=s||jsonb_build_object('enemies',e,'telegraphs','[]'::jsonb,'realtimePaused',false);
end if;
-- Fixed shared deadlines; neither footsteps nor party size decrement these warnings.
for t in select value from jsonb_array_elements(coalesce(s->'telegraphs','[]'))loop
if not exists(select 1 from jsonb_array_elements(s->'enemies')z where z->>'id'=t->>'source'and(z->>'hp')::int>0)then continue;end if;
if t->>'resolvesAt'is null then t:=(t-'mode')||jsonb_build_object('castAt',nowms,'resolvesAt',nowms+1300,'durationMs',1300);end if;
if nowms<(t->>'resolvesAt')::bigint then danger:=danger||jsonb_build_array(t);continue;end if;
for m in select a.character_id,a.x,a.y from online_adventure_members a join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.finished_at is null and a.floor=1 and p.location='dungeon'and p.seen_at>clock_timestamp()-interval '5 seconds'loop
if exists(select 1 from jsonb_array_elements(t->'tiles')z where(z->>'x')::int=m.x and(z->>'y')::int=m.y)then update online_characters set hp=greatest(0,hp-greatest(2,(t->>'damage')::int-online_adventure_defence(id)))where id=m.character_id;end if;end loop;
end loop;
s:=s||jsonb_build_object('telegraphs',danger,'realtimeAt',nowms,'realtimeVersion',1);update online_adventure_rooms set snapshot=s-'turn'where id=rid;
perform set_config('online.realtime_tick','on',true);
for e in select value from jsonb_array_elements(s->'enemies')where(value->>'hp')::int>0 and exists(select 1 from online_adventure_members a join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.floor=1 and a.finished_at is null and p.location='dungeon'and p.seen_at>clock_timestamp()-interval '5 seconds'and abs(a.x-(value->>'x')::int)+abs(a.y-(value->>'y')::int)<=9)loop
target:=online_turn_target(rid,e);if target is null then continue;end if;
rates:=online_enemy_rates(e->>'key');move_ms:=(rates->>'moveMs')::int;attack_ms:=(rates->>'attackMs')::int;
if nowms<coalesce((e->>'nextMoveAt')::bigint,0)and nowms<coalesce((e->>'nextAttackAt')::bigint,0)and nowms<coalesce((e->>'nextAreaAt')::bigint,nowms+1800)then continue;end if;
oldbeat:=coalesce((e->>'attackBeat')::int,0);perform online_turn_enemy(rid,e->>'id',target);
select ordinality::int-1,value into idx,after_e from online_adventure_rooms q,jsonb_array_elements(q.snapshot->'enemies')with ordinality where q.id=rid and value->>'id'=e->>'id';
after_e:=after_e||jsonb_build_object('moveIntervalMs',move_ms,'attackIntervalMs',attack_ms,'nextMoveAt',case when nowms>=coalesce((e->>'nextMoveAt')::bigint,0)then nowms+move_ms else(e->>'nextMoveAt')::bigint end,'nextAttackAt',case when coalesce((after_e->>'attackBeat')::int,0)>oldbeat then nowms+attack_ms else coalesce((e->>'nextAttackAt')::bigint,nowms+attack_ms)end,'nextAreaAt',coalesce((after_e->>'nextAreaAt')::bigint,nowms+1800));
update online_adventure_rooms set snapshot=jsonb_set(snapshot,array['enemies',idx::text],after_e)where id=rid;
end loop;
perform set_config('online.realtime_tick','off',true);perform online_adventure_tick_pre_shared_turns(rid);
end$$;
-- Speed values are returned to clients, but only the server enforces their cooldowns.
alter function online_world(text,jsonb)rename to online_world_pre_realtime_speeds;
create function online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare result jsonb;cid uuid;begin
result:=online_world_pre_realtime_speeds(action,payload);if result->>'pollDeferred'='true'then return result;end if;
cid:=nullif(result#>>'{active,id}','')::uuid;
if cid is not null then result:=jsonb_set(result,'{active}',result->'active'||jsonb_build_object('moveStepMs',online_move_step_ms(cid),'attackCooldownMs',online_character_attack_ms(cid)));end if;
result:=jsonb_set(result,'{players}',coalesce((select jsonb_agg(value||jsonb_build_object('moveStepMs',online_move_step_ms((value->>'character_id')::uuid)))from jsonb_array_elements(result->'players')),'[]'));
return result;end$$;
-- Thin pulse: no inventory, equipment rebuilding, chat history or nested world wrappers.
create function online_combat_pulse()returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$declare p online_presence;m online_adventure_members;s jsonb;actors jsonb;hp int;begin
if auth.uid()is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)then raise exception 'ログインしてください。';end if;
if not pg_try_advisory_xact_lock(hashtextextended(auth.uid()::text,0))then return jsonb_build_object('deferred',true);end if;
select * into p from online_presence where user_id=auth.uid();select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
if p.location is distinct from'dungeon'or m.floor<>1 or m.id is null then return jsonb_build_object('deferred',true);end if;
if not pg_try_advisory_xact_lock(hashtextextended('online-room:'||m.room_id::text,0))then return jsonb_build_object('deferred',true);end if;
update online_presence set seen_at=clock_timestamp()where user_id=auth.uid()and seen_at<clock_timestamp()-interval '1 second';
perform online_adventure_tick(m.room_id);select snapshot into s from online_adventure_rooms where id=m.room_id;select * into m from online_adventure_members where id=m.id;select c.hp into hp from online_characters c where c.id=p.character_id;
select coalesce(jsonb_agg(jsonb_build_object('character_id',a.character_id,'x',a.x,'y',a.y,'dir',a.dir,'railTrip',a.rail_trip)),'[]')into actors from online_adventure_members a join online_presence q on q.character_id=a.character_id where a.room_id=m.room_id and a.finished_at is null and a.floor=m.floor and q.location='dungeon'and q.seen_at>clock_timestamp()-interval '5 seconds';
return jsonb_build_object('roomId',m.room_id,'floor',m.floor,'characterId',p.character_id,'hp',hp,'x',m.x,'y',m.y,'snapshot',s,'positions',actors,'serverTime',online_adventure_now_ms());end$$;
revoke all on function online_move_step_ms(uuid),online_attack_ms(text),online_character_attack_ms(uuid),online_enemy_rates(text),online_world_pre_realtime_speeds(text,jsonb)from public,anon,authenticated;
revoke all on function online_world(text,jsonb),online_combat_pulse()from public,anon;grant execute on function online_world(text,jsonb),online_combat_pulse()to authenticated;
notify pgrst,'reload schema';
