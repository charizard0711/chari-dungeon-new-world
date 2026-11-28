begin;

create function public.online_arena_pattern(pattern int,px int,py int,ex int,ey int,s jsonb)
returns jsonb language sql stable set search_path=public,pg_temp as $$
 with direction as (
  select case when abs(px-ex)>=abs(py-ey) then case when px>=ex then 1 else -1 end else 0 end dx,
         case when abs(py-ey)>abs(px-ex) then case when py>=ey then 1 else -1 end else 0 end dy
 ), cells as (
  select px+u as x,py+v as y from generate_series(-3,3) u cross join generate_series(-3,3) v
  where pattern=0 and ((u=0 and abs(v)<=2) or (v=0 and abs(u)<=2))
     or pattern=1 and abs(u)+abs(v)<=2
  union all
  select px+lane*dx-width*dy,py+lane*dy+width*dx from direction
  cross join generate_series(-3,3) lane cross join generate_series(-1,1) width where pattern=2
 )
 select coalesce(jsonb_agg(jsonb_build_object('x',x,'y',y) order by y,x),'[]')
 from cells where online_in_boss_room(x,y) and not online_adventure_blocked(x,y,1,s)
$$;

-- The three retainers enter only when the cage has fully opened.
do $$
declare d text:=pg_get_functiondef('public.online_maze_sync_pre_cinematic(uuid)'::regprocedure);
 hook text:=' if s is distinct from r.snapshot then';
begin
 if strpos(d,hook)=0 then raise exception 'Arena retainer spawn hook missing';end if;
 d:=replace(d,hook,$hook$
 if s#>>'{bossEncounter,phase}'='battle' and not coalesce((s#>>'{bossEncounter,retainersSpawned}')::boolean,false) then
  for m in
   select ordinal, x, y from (values(1,44,8),(2,56,8),(3,50,7)) plans(ordinal,sx,sy)
   cross join lateral (
    select gx.x,gy.y from generate_series(sx-2,sx+2)gx(x) cross join generate_series(sy-1,sy+1)gy(y)
    where online_in_boss_room(gx.x,gy.y) and not online_adventure_blocked(gx.x,gy.y,1,s)
    and not exists(select 1 from jsonb_array_elements(s->'enemies') e where (e->>'hp')::int>0 and (e->>'x')::int=gx.x and (e->>'y')::int=gy.y)
    and not exists(select 1 from online_adventure_members a join online_presence p on p.character_id=a.character_id
     where a.room_id=rid and a.floor=1 and a.finished_at is null and p.location='dungeon' and a.x=gx.x and a.y=gy.y)
    order by abs(gx.x-sx)+abs(gy.y-sy),gy.y,gx.x limit 1
   ) tile
  loop
   s:=jsonb_set(s,'{enemies}',(s->'enemies')||jsonb_build_array(jsonb_build_object(
    'id','vesper-retainer-'||m.ordinal,'key','vesper_retainer','retainer',true,'areaPattern',m.ordinal-1,
    'x',m.x,'y',m.y,'dir','down','hp',100,'max',100,'atk',16,'def',4,
    'name',(array['黄晶の近衛・十字剣','黄晶の近衛・震撃','黄晶の近衛・突剣'])[m.ordinal],
    'nextMoveAt',now_ms+260*m.ordinal,'nextAttackAt',now_ms+700,
    'nextAreaAt',now_ms+1300+1400*m.ordinal)));
  end loop;
  s:=jsonb_set(s,'{bossEncounter,retainersSpawned}','true');
 elsif s#>>'{bossEncounter,phase}' in('waiting','returning','cleared') then
  if exists(select 1 from jsonb_array_elements(s->'enemies') e where e?'retainer') then
   s:=jsonb_set(s,'{enemies}',coalesce((select jsonb_agg(e) from jsonb_array_elements(s->'enemies') e where not(e?'retainer')),'[]'));
  end if;
 end if;
 if s is distinct from r.snapshot then$hook$);
 execute d;
end$$;

do $$
declare d text:=pg_get_functiondef('public.online_enemy_step_state(uuid,text,uuid,jsonb)'::regprocedure);
 start_at int; end_at int;
begin
 d:=replace(d,'declare trait_due boolean;','declare pattern int;warn_ms int;trait_due boolean;');
 d:=replace(d,'if(coalesce((e->>''boss'')::boolean,false)or coalesce((e->>''elite'')::boolean,false))',
  'if(e?''retainer'' or coalesce((e->>''boss'')::boolean,false)or coalesce((e->>''elite'')::boolean,false))');
 d:=replace(d,'elsif nowms>=coalesce((e->>''nextMoveAt'')::bigint,0)then',
  'elsif nowms>=coalesce((e->>''nextMoveAt'')::bigint,0) and not(e->>''id''=''vesper'' and s#>''{bossEncounter,smash}'' is not null and not coalesce((s#>>''{bossEncounter,smash,applied}'')::boolean,false))then');
 d:=replace(d,' if online_adventure_blocked(nx+dx,ny+dy,1,s)', $avoid$
 if not coalesce((s#>>'{bossEncounter,smash,applied}')::boolean,false)
 and exists(select 1 from jsonb_array_elements(s#>'{bossEncounter,smash,tiles}') t
  where (t->>'x')::int=nx+dx and (t->>'y')::int=ny+dy) then continue;end if;
 if online_adventure_blocked(nx+dx,ny+dy,1,s)$avoid$);
 start_at:=strpos(d,' for dx in -2..2 loop');end_at:=strpos(d,' if jsonb_array_length(danger)>');
 if start_at=0 or end_at<=start_at then raise exception 'Arena attack pattern hook missing';end if;
 d:=substring(d,1,start_at-1)||$patterns$
 if e->>'id'='vesper' or e?'retainer' then
  pattern:=coalesce((e->>'areaPattern')::int,0);
  warn_ms:=case when e?'retainer' then 1600 else 1900 end;
  tiles:=online_arena_pattern(pattern,m.x,m.y,nx,ny,s);
  if not(e?'retainer') then e:=e||jsonb_build_object('areaPattern',(pattern+1)%3);end if;
  danger:=danger||jsonb_build_array(jsonb_build_object(
    'id',eid||':'||nowms,'source',eid,'pattern',pattern,'remaining',2,'castAt',nowms,
    'resolvesAt',nowms+warn_ms,'durationMs',warn_ms,'damage',case when e?'retainer' then 12 else 22 end,
    'name',(array['結晶の十字剣','結晶の震撃','結晶の貫通剣'])[pattern+1],'tiles',tiles));
 else
  for dx in -2..2 loop
   if not online_adventure_blocked(m.x+dx,m.y,1,s) then tiles:=tiles||jsonb_build_array(jsonb_build_object('x',m.x+dx,'y',m.y));end if;
   if dx<>0 and not online_adventure_blocked(m.x,m.y+dx,1,s) then tiles:=tiles||jsonb_build_array(jsonb_build_object('x',m.x,'y',m.y+dx));end if;
  end loop;
  warn_ms:=greatest(1300,2*online_move_step_ms(cid)+650);
  danger:=danger||jsonb_build_array(jsonb_build_object(
   'id',eid||':'||turnno,'source',eid,'remaining',2,'castAt',nowms,'resolvesAt',nowms+warn_ms,
   'durationMs',warn_ms,'damage',18,'name','結晶の十字撃','tiles',tiles));
 end if;
 end if;
 $patterns$||substring(d,end_at);
 execute d;
end$$;

-- Keep the intro pause. HP checkpoint windups no longer pause motion, attacks or warnings.
do $$
declare d text;
begin
 d:=pg_get_functiondef('public.online_adventure_tick(uuid)'::regprocedure);
 execute replace(d,'if b->>''phase''=''opening''or(b->>''phase''=''battle''and b->''smash''is not null and nowms<(b#>>''{smash,at}'')::bigint+(b#>>''{smash,duration}'')::int)then','if b->>''phase''=''opening''then');
 d:=pg_get_functiondef('public.online_dungeon_walk(jsonb)'::regprocedure);
 execute replace(d,'and(s#>>''{bossEncounter,phase}''=''opening''or(s#>>''{bossEncounter,phase}''=''battle''and s#>''{bossEncounter,smash}''is not null and nowms<(s#>>''{bossEncounter,smash,at}'')::bigint+(s#>>''{bossEncounter,smash,duration}'')::int))then','and s#>>''{bossEncounter,phase}''=''opening''then');
 d:=pg_get_functiondef('public.online_world_pre_panels(text,jsonb)'::regprocedure);
 execute replace(d,'and(b->>''phase''=''opening''or(b->''smash''is not null and online_adventure_now_ms()<(b#>>''{smash,at}'')::bigint+(b#>>''{smash,duration}'')::int))then','and b->>''phase''=''opening''then');
 d:=pg_get_functiondef('public.online_world(text,jsonb)'::regprocedure);
 execute regexp_replace(d,'[[:space:]]+or now_ms<coalesce\(\(snapshot#>>''\{bossEncounter,smash,at\}''\)::bigint\+\(snapshot#>>''\{bossEncounter,smash,duration\}''\)::int,0\)','');
end$$;

-- Resolve knockback from live positions so a player who moved during the warning
-- can never be snapped back to an old square or onto another combatant.
do $$
declare d text:=pg_get_functiondef('public.online_maze_sync_pre_panels(uuid)'::regprocedure);
 from_at int;to_at int; reserve_at int;reserve_end int;
begin
 from_at:=strpos(d,'    select(z->>''x'')::int as x');to_at:=strpos(d,'    if target.x is not null then update');
 reserve_at:=strpos(d,'    reserved:=''[]'';');reserve_end:=strpos(d,'    select jsonb_agg(jsonb_build_object(''x'',x,''y'',y)order by score');
 if from_at=0 or to_at<=from_at or reserve_at=0 or reserve_end<=reserve_at then raise exception 'Arena checkpoint hook missing';end if;
 d:=substring(d,1,reserve_at-1)||'    reserved:=''[]'';'||chr(10)||substring(d,reserve_end);
 d:=substring(d,1,from_at-1)||$impact$
    select v.x,v.y into target from(values(m.x+1,m.y),(m.x-1,m.y),(m.x,m.y+1),(m.x,m.y-1))v(x,y)
    where online_in_boss_room(v.x,v.y)and not online_adventure_blocked(v.x,v.y,1,s)
    and not exists(select 1 from jsonb_array_elements(tiles)t where(t->>'x')::int=v.x and(t->>'y')::int=v.y)
    and not exists(select 1 from online_adventure_members a join online_presence p on p.character_id=a.character_id
      where a.room_id=rid and a.finished_at is null and a.floor=1 and a.id<>m.id and a.x=v.x and a.y=v.y and p.location='dungeon')
    and not exists(select 1 from jsonb_array_elements(s->'enemies')z where(z->>'hp')::int>0 and(z->>'x')::int=v.x and(z->>'y')::int=v.y)
    order by abs(v.x-bx)+abs(v.y-bosy) desc, v.y,v.x limit 1;
    if target.x is null then
     select coalesce(jsonb_agg(t),'[]') into tiles from jsonb_array_elements(tiles)t
      where (t->>'x')::int<>m.x or (t->>'y')::int<>m.y;
    else
     reserved:=coalesce(reserved,'[]')||jsonb_build_array(jsonb_build_object('id',m.character_id,'x',target.x,'y',target.y));
    end if;
 $impact$||substring(d,to_at);
 d:=replace(d,'smash:=smash||''{"applied":true}''::jsonb;', 'smash:=smash||jsonb_build_object(''applied'',true,''knockbacks'',coalesce(reserved,''[]''),''tiles'',tiles);');
 d:=replace(d,'''bossEncounter'',boss,''telegraphs'',''[]''::jsonb','''bossEncounter'',boss');
 -- Do not fracture a tile an enemy can step onto before impact.
 d:=replace(d,'   s:=s||jsonb_build_object(''brokenFloors''', $filter$
   select coalesce(jsonb_agg(t),'[]') into tiles from jsonb_array_elements(tiles)t
    where not exists(select 1 from jsonb_array_elements(s->'enemies')e where(e->>'hp')::int>0
     and (e->>'x')::int=(t->>'x')::int and (e->>'y')::int=(t->>'y')::int);
   s:=s||jsonb_build_object('brokenFloors'$filter$);
 execute d;
end$$;

alter function public.online_world(text,jsonb) rename to online_world_pre_arena_update;
create function public.online_world(action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 uid uuid:=auth.uid();m online_adventure_members;p online_presence;c online_characters;r online_adventure_rooms;
 e jsonb;es jsonb:='[]';s jsonb;blasts jsonb;hp int;amount int;newhp int;gold_gain int:=0;now_ms bigint;reward record;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'ログインしてください。';end if;
 if action='inspect_player' then
  if not exists(select 1 from online_presence where user_id=uid and location='town') then raise exception '装備の確認は町で行ってください。';end if;
 end if;
 if action<>'use_item' or payload->>'kind' is distinct from 'dynamite' then return online_world_pre_arena_update(action,payload);end if;
 perform online_lock_action('use_item');
 select * into p from online_presence where user_id=uid;
 select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
 select * into c from online_characters where id=p.character_id and user_id=uid;
 select * into r from online_adventure_rooms where id=m.room_id for update;
 if p.location is distinct from 'dungeon' or m.id is null or c.hp<=0 or m.rail_trip is not null then raise exception '今はダイナマイトを使えません。';end if;
 if coalesce((c.inventory->>'dynamite')::int,0)<1 then raise exception 'ダイナマイトを持っていません。';end if;
 if m.floor=1 and online_in_boss_room(m.x,m.y)and r.snapshot#>>'{bossEncounter,phase}'='opening' then raise exception '登場演出中は使えません。';end if;
 s:=r.snapshot;now_ms:=online_adventure_now_ms();
 for e in select value from jsonb_array_elements(coalesce(s->'enemies','[]')) loop
  hp:=(e->>'hp')::int;
  if m.floor=1 and hp>0 and online_in_boss_room(m.x,m.y)=online_in_boss_room((e->>'x')::int,(e->>'y')::int)
    and greatest(abs((e->>'x')::int-m.x),abs((e->>'y')::int-m.y))<=2
    and online_turn_los(m.x,m.y,(e->>'x')::int,(e->>'y')::int,s) then
   amount:=case when e?'retainer' then ceil((e->>'max')::int*.30)::int
    when coalesce((e->>'boss')::boolean,false) or coalesce((e->>'elite')::boolean,false) then ceil((e->>'max')::int*.10)::int else hp end;
   newhp:=greatest(0,hp-amount);
   if coalesce((e->>'boss')::boolean,false) then
    if coalesce((s#>>'{bossEncounter,smashCount}')::int,0)<2 then newhp:=greatest(1,newhp);end if;
    if newhp=0 then
     s:=s||'{"stairs":true,"telegraphs":[]}'::jsonb;
     update online_adventure_rooms set status='cleared' where id=r.id;
     for reward in select character_id from online_adventure_members where room_id=r.id and finished_at is null loop
      insert into online_adventure_rewards(room_id,character_id) values(r.id,reward.character_id) on conflict do nothing;
      if found then
       update online_characters set gold=gold+300 where id=reward.character_id;
       perform online_give_equipment(reward.character_id,'potion',false);
      end if;
     end loop;
    end if;
   elsif newhp=0 then
    gold_gain:=gold_gain+case when coalesce((e->>'elite')::boolean,false) then 40 when e?'fragment' then 0 else 8 end;
    if e?'dropKey' and not(s->'keys'?(e->>'dropKey')) then
     s:=jsonb_set(s,'{keys}',(s->'keys')||jsonb_build_array(e->>'dropKey'));end if;
   end if;
   e:=e||jsonb_build_object('hp',newhp,'hitTurn',coalesce((e->>'turnNo')::int,0));
  end if;
  es:=es||jsonb_build_array(e);
 end loop;
 update online_characters set inventory=jsonb_set(inventory,'{dynamite}',to_jsonb((inventory->>'dynamite')::int-1)),gold=gold+gold_gain where id=c.id;
 select coalesce(jsonb_agg(value order by ordinal),'[]') into blasts
 from (select value,ordinal from jsonb_array_elements(coalesce(s->'blasts','[]')) with ordinality b(value,ordinal)
  order by ordinal desc limit 7) recent;
 blasts:=blasts||jsonb_build_array(jsonb_build_object('at',now_ms,'x',m.x,'y',m.y,'floor',m.floor,'actor',c.id));
 update online_adventure_rooms set snapshot=s||jsonb_build_object('enemies',es,'blasts',blasts) where id=r.id;
 return online_world_pre_arena_update('poll','{}');
end$$;
revoke all on function public.online_arena_pattern(int,int,int,int,int,jsonb),public.online_world_pre_arena_update(text,jsonb),public.online_world(text,jsonb) from public,anon,authenticated;
grant execute on function public.online_world(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
