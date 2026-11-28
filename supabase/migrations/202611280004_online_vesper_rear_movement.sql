begin;

-- The north side of the arena is the rear. Use the configured spawn as the
-- patrol anchor and the southernmost living retainer as the front line.
do $$
declare
 f record;
 definition text;
 guard_hook text:=$hook$guarded:=exists(select 1 from jsonb_array_elements(es) guard
    where guard->>'retainer'='true' and (guard->>'hp')::int>0);$hook$;
 attack_hook text:='if dist=1 or ';
 move_hook text:='elsif nowms>=coalesce((e->>''nextMoveAt'')::bigint,0) and not guarded';
 direction_hook text:=' for dx,dy in select x,y';
 cutoff_hook text:='if pr->>''behavior''not in(''loop'',''random'')and abs(nx+dx-m.x)+abs(ny+dy-m.y)>=dist then continue;end if;';
begin
 for f in select oid from pg_proc where oid in (
  'public.online_enemy_step_state(uuid,text,uuid,jsonb)'::regprocedure,
  'public.online_enemy_step_cached(uuid,text,uuid,jsonb,jsonb)'::regprocedure
 ) loop
  definition:=pg_get_functiondef(f.oid);
  if strpos(definition,'vesper_rear_movement')>0 then continue;end if;
  if strpos(definition,'declare guarded boolean')=0 or strpos(definition,guard_hook)=0
   or strpos(definition,attack_hook)=0 or strpos(definition,'m.x,m.y,s')=0
   or strpos(definition,move_hook)=0 or strpos(definition,direction_hook)=0
   or strpos(definition,'order by case when pr->>''behavior''')=0 or strpos(definition,cutoff_hook)=0 then
   raise exception 'Vesper rear movement hooks missing in %',f.oid::regprocedure;
  end if;
  definition:=replace(definition,'declare guarded boolean',
   'declare front_y int;home_x int;rear_x int;rear_y int;guarded boolean');
  definition:=replace(definition,guard_hook,$patch$
  select max((guard->>'y')::int) into front_y from jsonb_array_elements(es) guard
   where guard->>'retainer'='true' and (guard->>'hp')::int>0;
  guarded:=front_y is not null;$patch$);
  definition:=replace(definition,attack_hook,'if (not guarded or countering) and (dist=1 or ');
  definition:=regexp_replace(definition,'(online_(turn|frame)_los\(nx,ny,m\.x,m\.y,s(,frame_cfg)?\))then',
   '\1)then');
  definition:=replace(definition,move_hook,'elsif nowms>=coalesce((e->>''nextMoveAt'')::bigint,0)');
  definition:=replace(definition,direction_hook,$patch$
 /* vesper_rear_movement */
 if guarded then
  home_x:=coalesce((home->>'x')::int,nx);
  rear_y:=least(ny,coalesce((home->>'y')::int,ny)+1,front_y-1);
  rear_x:=greatest(home_x-3,least(home_x+3,m.x));
  if nx=rear_x then
   rear_x:=greatest(home_x-3,least(home_x+3,rear_x+case when nx<=home_x then 1 else -1 end));
  end if;
 end if;
 for dx,dy in select x,y$patch$);
  definition:=replace(definition,'order by case when pr->>''behavior''',
   'order by case when guarded then abs(nx+x-rear_x)+abs(ny+y-rear_y) when pr->>''behavior''');
  definition:=replace(definition,'else abs(nx+x-m.x)+abs(ny+y-m.y)end loop',
   'else abs(nx+x-m.x)+abs(ny+y-m.y)end, case when guarded and y<0 then 0 else 1 end loop');
  definition:=replace(definition,cutoff_hook,$patch$
 if guarded then
  if ny+dy>ny
   or abs(nx+dx-rear_x)+abs(ny+dy-rear_y)>=abs(nx-rear_x)+abs(ny-rear_y) then continue;end if;
 elsif pr->>'behavior'not in('loop','random') and abs(nx+dx-m.x)+abs(ny+dy-m.y)>=dist then
  continue;
 end if;$patch$);
  execute definition;
 end loop;
end$$;

-- A deliberate patrol step while protected, with the usual cadence once exposed.
do $$
declare definition text;
 hook text:='move_ms:=(rates->>''moveMs'')::int;';
begin
 select pg_get_functiondef('public.online_adventure_tick(uuid)'::regprocedure) into definition;
 if strpos(definition,'vesper_rear_step_ms')>0 then return;end if;
 if strpos(definition,hook)=0 then raise exception 'Vesper movement cadence hook missing';end if;
 execute replace(definition,hook,hook||$patch$
 /* vesper_rear_step_ms */
 if e->>'id'='vesper' and s#>>'{bossEncounter,phase}'='battle'
  and exists(select 1 from jsonb_array_elements(s->'enemies') guard
   where guard->>'retainer'='true' and (guard->>'hp')::int>0) then
  move_ms:=greatest(move_ms,750);
 end if;$patch$);
end$$;

commit;
