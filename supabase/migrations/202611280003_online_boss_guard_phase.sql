begin;

-- A landed hit opens a short counter window while the retainers are alive.
do $$
declare d text; hook text;
begin
 select pg_get_functiondef('public.online_world_adventures(text,jsonb)'::regprocedure) into d;
 hook:='damage:=damage+n;';
 if strpos(d,hook)=0 then raise exception 'Adventure damage hook missing';end if;
 execute replace(d,hook,$patch$
 if enemy->>'id'='vesper' and n>0 then
  enemy:=enemy||jsonb_build_object('counterTarget',c.id,'counterUntil',online_adventure_now_ms()+3000);
 end if;
 damage:=damage+n;$patch$);

 select pg_get_functiondef('public.online_world(text,jsonb)'::regprocedure) into d;
 hook:='e:=e||jsonb_build_object(''hp'',newhp,''hitTurn'',coalesce((e->>''turnNo'')::int,0));';
 if strpos(d,hook)=0 then raise exception 'Dynamite damage hook missing';end if;
 execute replace(d,hook,hook||$patch$
 if e->>'id'='vesper' and newhp<hp then
  e:=e||jsonb_build_object('counterTarget',c.id,'counterUntil',now_ms+3000);
 end if;$patch$);

 select pg_get_functiondef('public.online_turn_target(uuid,jsonb)'::regprocedure) into d;
 hook:='order by case when e->>''provokedBy''';
 if strpos(d,hook)=0 then raise exception 'Enemy target priority hook missing';end if;
 execute replace(d,hook,$patch$
 order by case when e->>'id'='vesper' and e->>'counterTarget'=a.character_id::text
  and coalesce((e->>'counterUntil')::bigint,0)>online_adventure_now_ms() then 0 else 1 end,
 case when e->>'provokedBy'$patch$);
end$$;

-- Keep the fast, preloaded-map implementation in sync with the canonical AI.
do $$
declare body text; source text; move_hook text:='elsif nowms>=coalesce((e->>''nextMoveAt'')::bigint,0)';
 melee_hook text:='if nowms>=coalesce((e->>''nextAttackAt'')::bigint,0)then dmg';
 area_hook text:='and nowms>=coalesce((e->>''nextAreaAt'')::bigint,nowms+1800) and not exists';
begin
 select prosrc into body from pg_proc where oid='public.online_enemy_step_state(uuid,text,uuid,jsonb)'::regprocedure;
 if strpos(body,move_hook)=0 or strpos(body,melee_hook)=0 or strpos(body,area_hook)=0
  or strpos(body,'begin'||chr(10)||' s:=frame;')=0
  or strpos(body,'es:=jsonb_set(es,array[i::text],e);')=0 then raise exception 'Realtime enemy hooks missing';end if;
 body:=replace(body,'declare pattern int;','declare guarded boolean:=false;countering boolean:=false;pattern int;');
 body:=replace(body,' danger:=coalesce(s->''telegraphs'',''[]'');',$patch$
 if eid='vesper' and s#>>'{bossEncounter,phase}'='battle' then
  guarded:=exists(select 1 from jsonb_array_elements(es) guard
    where guard->>'retainer'='true' and (guard->>'hp')::int>0);
  countering:=guarded and e->>'counterTarget'=cid::text
    and coalesce((e->>'counterUntil')::bigint,0)>nowms;
 end if;
 danger:=coalesce(s->'telegraphs','[]');$patch$);
 body:=replace(body,move_hook,move_hook||' and not guarded');
 body:=replace(body,melee_hook,'if (not guarded or countering) and nowms>=coalesce((e->>''nextAttackAt'')::bigint,0)then dmg');
 body:=replace(body,area_hook,
  'and (nowms>=coalesce((e->>''nextAreaAt'')::bigint,nowms+1800) or (countering and not didattack and nowms>=coalesce((e->>''nextAttackAt'')::bigint,0))) and not exists');
 body:=replace(body,'jsonb_array_elements(s#>''{bossEncounter,smash,tiles}'') t',
  'jsonb_array_elements(s#>''{bossEncounter,smash,tiles}'') as marked(tile)');
 body:=replace(body,'(t->>''x'')::int=nx+dx and (t->>''y'')::int=ny+dy',
  '(marked.tile->>''x'')::int=nx+dx and (marked.tile->>''y'')::int=ny+dy');
 body:=replace(body,'es:=jsonb_set(es,array[i::text],e);',$patch$
 if countering and (didattack or jsonb_array_length(danger)>jsonb_array_length(coalesce(s->'telegraphs','[]'))) then
  e:=e-'counterTarget'-'counterUntil';
 end if;
 es:=jsonb_set(es,array[i::text],e);$patch$);
 select pg_get_functiondef('public.online_enemy_step_state(uuid,text,uuid,jsonb)'::regprocedure) into source;
 execute replace(source,(select prosrc from pg_proc where oid='public.online_enemy_step_state(uuid,text,uuid,jsonb)'::regprocedure),body);

 body:=replace(body,'select data into cfg from online_adventure_config where id=''floor1'';','cfg:=frame_cfg;');
 body:=replace(body,'online_turn_los(nx,ny,m.x,m.y,s)','online_frame_los(nx,ny,m.x,m.y,s,frame_cfg)');
 body:=replace(body,'online_adventure_blocked(nx+dx,ny+dy,1,s)','online_frame_blocked(nx+dx,ny+dy,1,s,frame_cfg)');
 body:=replace(body,'online_adventure_blocked(m.x+dx,m.y,1,s)','online_frame_blocked(m.x+dx,m.y,1,s,frame_cfg)');
 body:=replace(body,'online_adventure_blocked(m.x,m.y+dx,1,s)','online_frame_blocked(m.x,m.y+dx,1,s,frame_cfg)');
 execute format('create or replace function public.online_enemy_step_cached(rid uuid,eid text,cid uuid,frame jsonb,frame_cfg jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as %L',body);
end$$;

-- Use one snapshot write on a normal tick and skip targeting during cooldowns.
do $$
declare d text; target_hook text:='target:=online_turn_target(rid,e);if target is null then continue;end if;';
 staged_write text:='''realtimeVersion'',1);update online_adventure_rooms set snapshot=s-''turn''where id=rid;';
 final_write text:='update online_adventure_rooms set snapshot=s where id=rid;perform set_config';
begin
 select pg_get_functiondef('public.online_adventure_tick(uuid)'::regprocedure) into d;
 if strpos(d,target_hook)=0 or strpos(d,'oldbeat:=coalesce')=0
 or strpos(d,'s:=s||jsonb_build_object(''telegraphs'',danger,''realtimeAt'',nowms,'||staged_write)=0
 or strpos(d,final_write)=0 then raise exception 'Enemy tick hooks missing';end if;
 d:=replace(d,target_hook,'');
 d:=replace(d,'oldbeat:=coalesce',target_hook||chr(10)||'oldbeat:=coalesce');
 d:=replace(d,'s:=s||jsonb_build_object(''telegraphs'',danger,''realtimeAt'',nowms,'||staged_write,
  's:=s||jsonb_build_object(''telegraphs'',danger,''realtimeAt'',nowms,''realtimeVersion'',1);');
 d:=replace(d,final_write,'update online_adventure_rooms set snapshot=s-''turn'' where id=rid;perform set_config');
 execute d;
end$$;

commit;
