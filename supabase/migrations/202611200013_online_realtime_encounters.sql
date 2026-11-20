begin;
create or replace function public.online_adventure_now_ms() returns bigint language sql volatile security definer set search_path=public,pg_temp as $$select floor(extract(epoch from clock_timestamp())*1000)::bigint$$;
revoke all on function public.online_adventure_now_ms() from public,anon,authenticated;
create or replace function public.online_adventure_tick(rid uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare room public.online_adventure_rooms;s jsonb;cfg jsonb;enemies jsonb;enemy jsonb;home jsonb;m public.online_adventure_members;tele jsonb;danger jsonb:='[]';nx int;ny int;dist int;i int;phase int;hx int;hy int;radius int;tx int;ty int;dx int;dy int;remaining int;warn jsonb;facing text;attack boolean;now_ms bigint;last_ms bigint;pause_ms bigint;resolves_ms bigint;move_ms int;attack_ms int;next_move bigint;next_attack bigint;next_area bigint;homes jsonb;
begin
 perform pg_advisory_xact_lock(hashtextextended('online-room:'||rid::text,0));
 select * into room from online_adventure_rooms where id=rid for update;now_ms:=public.online_adventure_now_ms();
 if room.id is null then return;end if;
 -- One server clock for the room, independent of actions or player count.
 if room.status<>'active' or now_ms-coalesce((room.snapshot->>'simAtMs')::bigint,0)<200 then return;end if;
 if not exists(select 1 from online_adventure_members a join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.finished_at is null and a.floor=1 and p.location='dungeon' and p.seen_at>clock_timestamp()-interval '3 seconds') then update online_adventure_rooms set pending_step_at=null where id=rid;return;end if;
 select data into cfg from online_adventure_config where id='floor1';s:=room.snapshot;enemies:=s->'enemies';phase:=coalesce((s->>'tick')::int,0);
 last_ms:=coalesce((s->>'simAtMs')::bigint,now_ms);pause_ms:=case when now_ms-last_ms>3000 then now_ms-last_ms else 0 end;
 -- An inactive room never catches up with a burst of moves or overdue damage.
 if pause_ms>0 then
  select coalesce(jsonb_agg(value||jsonb_build_object('resolvesAt',coalesce((value->>'resolvesAt')::bigint,last_ms+3000)+pause_ms)),'[]') into danger from jsonb_array_elements(coalesce(s->'telegraphs','[]'));
  s:=jsonb_set(s,'{telegraphs}',danger);danger:='[]';
  select jsonb_agg(value||jsonb_build_object('nextMoveAt',coalesce((value->>'nextMoveAt')::bigint,last_ms)+pause_ms,'nextAttackAt',coalesce((value->>'nextAttackAt')::bigint,last_ms+1000)+pause_ms,'nextAreaAt',coalesce((value->>'nextAreaAt')::bigint,last_ms+2500)+pause_ms)) into enemies from jsonb_array_elements(enemies);
 end if;
 select jsonb_object_agg(value->>'id',value) into homes from jsonb_array_elements(cfg->'enemies');
 for tele in select jsonb_array_elements(coalesce(s->'telegraphs','[]')) loop
  if not exists(select 1 from jsonb_array_elements(enemies) alive where alive->>'id'=tele->>'source' and (alive->>'hp')::int>0) then continue;end if;
  resolves_ms:=coalesce((tele->>'resolvesAt')::bigint,now_ms+greatest(1,coalesce((tele->>'remaining')::int,3))*1000);
  if resolves_ms>now_ms then danger:=danger||jsonb_build_array(tele||jsonb_build_object('resolvesAt',resolves_ms,'remaining',ceil((resolves_ms-now_ms)/1000.0)::int));continue;end if;
  for m in select a.* from online_adventure_members a join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.finished_at is null and a.floor=1 and p.location='dungeon' and p.seen_at>clock_timestamp()-interval '3 seconds' loop
   if exists(select 1 from jsonb_array_elements(tele->'tiles') t where (t->>'x')::int=m.x and (t->>'y')::int=m.y) then update online_characters set hp=greatest(0,hp-greatest(2,(tele->>'damage')::int-public.online_adventure_defence(id))) where id=m.character_id;end if;
  end loop;
 end loop;
 for i in 0..jsonb_array_length(enemies)-1 loop
  enemy:=enemies->i;if (enemy->>'hp')::int<=0 then continue;end if;
  home:=homes->(enemy->>'id');hx:=(home->>'x')::int;hy:=(home->>'y')::int;radius:=case when enemy ? 'boss' then 7 when enemy ? 'elite' then 5 else 7 end;
  nx:=(enemy->>'x')::int;ny:=(enemy->>'y')::int;attack:=false;
  select a.* into m from online_adventure_members a join online_presence p on p.character_id=a.character_id join online_characters c on c.id=a.character_id where a.room_id=rid and a.finished_at is null and a.floor=1 and c.hp>0 and p.location='dungeon' and p.seen_at>clock_timestamp()-interval '3 seconds' and abs(a.x-hx)<=radius and abs(a.y-hy)<=radius order by abs(a.x-nx)+abs(a.y-ny),a.character_id limit 1;
  if m.id is null and nx=hx and ny=hy then continue;end if;
  move_ms:=case when enemy ? 'boss' then 900 when enemy ? 'elite' then 750 else 600 end;
  attack_ms:=case when enemy ? 'boss' then 1600 when enemy ? 'elite' then 1400 else 1200 end;
  next_move:=coalesce((enemy->>'nextMoveAt')::bigint,now_ms+200+(i%3)*100);
  next_attack:=coalesce((enemy->>'nextAttackAt')::bigint,now_ms+1000);
  next_area:=coalesce((enemy->>'nextAreaAt')::bigint,now_ms+2500);
  if m.id is null then tx:=hx;ty:=hy;else tx:=m.x;ty:=m.y;end if;
  dx:=tx-nx;dy:=ty-ny;dist:=abs(dx)+abs(dy);facing:=case when abs(dx)>abs(dy) then case when dx>0 then 'right' else 'left' end else case when dy<0 then 'up' else 'down' end end;
  if dist>0 then enemy:=enemy||jsonb_build_object('dir',facing);end if;
  -- Melee and pursuit continue during a timed warning, with independent cooldowns.
  if m.id is not null and dist<=1 and now_ms>=next_attack then
   update online_characters set hp=greatest(0,hp-greatest(1,(enemy->>'atk')::int-public.online_adventure_defence(id))) where id=m.character_id;attack:=true;next_attack:=now_ms+attack_ms;
  elsif dist>0 and (m.id is null or dist>1) and now_ms>=next_move then
   next_move:=now_ms+move_ms;
   for dx,dy in select v.x,v.y from (values(1,0),(-1,0),(0,1),(0,-1)) v(x,y) order by abs(nx+v.x-tx)+abs(ny+v.y-ty) loop
    if abs(nx+dx-hx)>radius or abs(ny+dy-hy)>radius or public.online_adventure_blocked(nx+dx,ny+dy,1,s) then continue;end if;
    if exists(select 1 from jsonb_array_elements(enemies) e where e->>'id'<>enemy->>'id' and (e->>'hp')::int>0 and (e->>'x')::int=nx+dx and (e->>'y')::int=ny+dy) or exists(select 1 from online_adventure_members a join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.floor=1 and a.finished_at is null and p.location='dungeon' and p.seen_at>clock_timestamp()-interval '3 seconds' and a.x=nx+dx and a.y=ny+dy) then continue;end if;
    if abs(nx+dx-tx)+abs(ny+dy-ty)>=dist then continue;end if;
    nx:=nx+dx;ny:=ny+dy;enemy:=enemy||jsonb_build_object('x',nx,'y',ny,'movedAt',now_ms,'dir',case when dx>0 then 'right' when dx<0 then 'left' when dy>0 then 'down' else 'up' end);exit;
   end loop;
  end if;
  enemy:=enemy||jsonb_build_object('attackBeat',case when attack then phase+1 else coalesce((enemy->>'attackBeat')::int,-1) end);
  if m.id is not null and (enemy ? 'boss' or enemy ? 'elite') and not exists(select 1 from jsonb_array_elements(danger) t where t->>'source'=enemy->>'id') and now_ms>=next_area then
   next_area:=now_ms+8000;
   warn:='[]';if phase%12=0 then for tx in m.x-1..m.x+1 loop for ty in m.y-1..m.y+1 loop if not public.online_adventure_blocked(tx,ty,1,s) then warn:=warn||jsonb_build_array(jsonb_build_object('x',tx,'y',ty));end if;end loop;end loop;
   else for dx in -3..3 loop if not public.online_adventure_blocked(nx+dx,ny,1,s) then warn:=warn||jsonb_build_array(jsonb_build_object('x',nx+dx,'y',ny));end if;if dx<>0 and not public.online_adventure_blocked(nx,ny+dx,1,s) then warn:=warn||jsonb_build_array(jsonb_build_object('x',nx,'y',ny+dx));end if;end loop;end if;
   danger:=danger||jsonb_build_array(jsonb_build_object('id',(enemy->>'id')||':'||now_ms::text,'source',enemy->>'id','tiles',warn,'remaining',3,'castAt',now_ms,'resolvesAt',now_ms+3000,'durationMs',3000,'damage',case when enemy ? 'boss' then case when (enemy->>'hp')::int<240 then 24 else 18 end else 12 end,'name',case when phase%12=0 then '結晶落下' else '十字の裂光' end));
  end if;
  enemy:=enemy||jsonb_build_object('nextMoveAt',next_move,'nextAttackAt',next_attack,'nextAreaAt',next_area,'moveIntervalMs',move_ms);
  enemies:=jsonb_set(enemies,array[i::text],enemy);
 end loop;
 for m in select a.* from online_adventure_members a join online_characters c on c.id=a.character_id where a.room_id=rid and a.finished_at is null and c.hp<=0 loop
  select x,y into nx,ny from generate_series((cfg->'spawn'->>'x')::int-3,(cfg->'spawn'->>'x')::int+3) gx(x) cross join generate_series((cfg->'spawn'->>'y')::int-3,(cfg->'spawn'->>'y')::int+3) gy(y) where not public.online_adventure_blocked(x,y,1,s) and not exists(select 1 from online_adventure_members a join online_presence p on p.character_id=a.character_id where a.room_id=rid and a.character_id<>m.character_id and a.floor=1 and p.location='dungeon' and a.x=gx.x and a.y=gy.y) order by abs(x-(cfg->'spawn'->>'x')::int)+abs(y-(cfg->'spawn'->>'y')::int),y,x limit 1;
  update online_adventure_members set x=coalesce(nx,(cfg->'spawn'->>'x')::int),y=coalesce(ny,(cfg->'spawn'->>'y')::int),floor=1 where id=m.id;update online_characters set hp=50 where id=m.character_id;
 end loop;
 update online_adventure_rooms set snapshot=s||jsonb_build_object('enemies',enemies,'tick',phase+1,'telegraphs',danger,'simAtMs',now_ms,'clockVersion',1),pending_step_at=null,last_tick=clock_timestamp() where id=rid;
end$$;
revoke all on function public.online_adventure_tick(uuid) from public,anon,authenticated;
-- Add a server timestamp to responses, without trusting client clocks or request timestamps.
do $$declare source text;begin
 select pg_get_functiondef('public.online_world(text,jsonb)'::regprocedure) into source;
 if position('encounter_clock_v1' in source)=0 then
  if position('return result;' in source)=0 then raise exception 'Expected world response was not found';end if;
  source:=replace(source,'return result;','/* encounter_clock_v1 */ return result||jsonb_build_object(''serverTime'',public.online_adventure_now_ms());');execute source;
 end if;
end $$;
-- Convert outstanding turn warnings once, preserving saves and all defeated enemies.
do $$declare saved online_adventure_rooms;now_ms bigint;es jsonb;warnings jsonb;begin
 perform pg_advisory_xact_lock(71390119);now_ms:=public.online_adventure_now_ms();
 for saved in select * from online_adventure_rooms where status='active' order by id loop
  perform pg_advisory_xact_lock(hashtextextended('online-room:'||saved.id::text,0));
  select * into saved from online_adventure_rooms where id=saved.id for update;
  if coalesce((saved.snapshot->>'clockVersion')::int,0)>=1 then continue;end if;
  select jsonb_agg(value||jsonb_build_object('nextMoveAt',now_ms+300+(ord%3)*100,'nextAttackAt',now_ms+1000,'nextAreaAt',now_ms+2500,'moveIntervalMs',case when value ? 'boss' then 900 when value ? 'elite' then 750 else 600 end) order by ord) into es from jsonb_array_elements(saved.snapshot->'enemies') with ordinality e(value,ord);
  select coalesce(jsonb_agg(value||jsonb_build_object('resolvesAt',now_ms+greatest(1,least(3,coalesce((value->>'remaining')::int,3)))*1000,'castAt',now_ms,'durationMs',3000)),'[]') into warnings from jsonb_array_elements(coalesce(saved.snapshot->'telegraphs','[]'));
  update online_adventure_rooms set snapshot=saved.snapshot||jsonb_build_object('clockVersion',1,'simAtMs',now_ms,'enemies',es,'telegraphs',warnings),pending_step_at=null where id=saved.id;
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
