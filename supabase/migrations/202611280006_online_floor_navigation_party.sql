begin;

-- Only used when a retainer cannot close the distance with its usual step.
create function public.online_retainer_detour(rid uuid, sx int, sy int, tx int, ty int, s jsonb, cfg jsonb)
returns int[] language plpgsql stable set search_path=public,pg_temp as $$
declare
 cells int[]:=array[sx*1000+sy]; first_steps int[]:=array[0]; depths int[]:=array[0];
 blocked int[]; cursor_at int:=1; x int;y int; nx int;ny int; cell int; first_cell int; dir int;
 dx constant int[]:=array[1,-1,0,0];dy constant int[]:=array[0,0,1,-1];
begin
 select coalesce(array_agg(a.x*1000+a.y),'{}') into blocked from (
  select (e->>'x')::int x,(e->>'y')::int y from jsonb_array_elements(s->'enemies') e where (e->>'hp')::int>0
  union all select m.x,m.y from online_adventure_members m join online_presence p on p.character_id=m.character_id
   where m.room_id=rid and m.floor=1 and m.finished_at is null and p.location='dungeon'
  union all select (tile->>'x')::int,(tile->>'y')::int
   from jsonb_array_elements(s#>'{bossEncounter,smash,tiles}') tile
   where not coalesce((s#>>'{bossEncounter,smash,applied}')::boolean,false)
 ) a;
 while cursor_at<=cardinality(cells) and cursor_at<=128 loop
  x:=cells[cursor_at]/1000;y:=cells[cursor_at]%1000;
  if depths[cursor_at]<9 then
   for dir in 1..4 loop
    nx:=x+dx[dir];ny:=y+dy[dir];cell:=nx*1000+ny;
    if cell=any(cells) or cell=any(blocked) or not online_in_boss_room(nx,ny)
      or online_frame_blocked(nx,ny,1,s,cfg) then continue;end if;
    first_cell:=case when cursor_at=1 then cell else first_steps[cursor_at] end;
    if abs(nx-tx)+abs(ny-ty)=1 then return array[first_cell/1000,first_cell%1000];end if;
    cells:=array_append(cells,cell);first_steps:=array_append(first_steps,first_cell);
    depths:=array_append(depths,depths[cursor_at]+1);
   end loop;
  end if;
  cursor_at:=cursor_at+1;
 end loop;
 return null;
end$$;

do $$
declare d text; hook text:='end if;exit;end loop;end if;end if;';
begin
 select pg_get_functiondef('public.online_enemy_step_cached(uuid,text,uuid,jsonb,jsonb)'::regprocedure) into d;
 if strpos(d,hook)=0 then raise exception 'Retainer movement hook missing';end if;
 d:=replace(d,'declare front_y int;','declare detour int[];front_y int;');
 execute replace(d,hook,$patch$
 end if;exit;end loop;
 if e->>'retainer'='true' and nx=(es->i->>'x')::int and ny=(es->i->>'y')::int then
  detour:=online_retainer_detour(rid,nx,ny,m.x,m.y,s,cfg);
  if detour is not null then
   e:=e||jsonb_build_object('x',detour[1],'y',detour[2],'movedAt',nowms,
    'dir',case when detour[1]>nx then 'right' when detour[1]<nx then 'left' when detour[2]>ny then 'down' else 'up' end);
   nx:=detour[1];ny:=detour[2];
  end if;
 end if;
 end if;end if;$patch$);
end$$;

-- Spread spawns along ordinary lanes. Current rooms receive unoccupied positions only.
do $$
declare cfg jsonb; mobs jsonb;
begin
 select data into cfg from online_adventure_config where id='floor1';
 select jsonb_agg(jsonb_build_object('id','corridor-'||i,'key',key,'name',label,'x',x,'y',y,
  'hp',hp,'max',hp,'atk',atk,'def',1,'dir','down') order by i) into mobs from
 (values (1,'m_bat','通路コウモリ',37,14,24,5),(2,'m_jelly','洞窟ゼリー',24,22,25,4),
  (3,'m_mush','ランタンマッシュ',62,23,29,5),(4,'m_spider','迷路グモ',32,31,28,6),
  (5,'m_bat','通路コウモリ',49,36,24,5),(6,'m_jelly','洞窟ゼリー',62,39,25,4),
  (7,'m_spider','迷路グモ',77,48,28,6),(8,'m_bat','通路コウモリ',71,53,24,5),
  (9,'m_mush','ランタンマッシュ',47,58,29,5),(10,'m_jelly','洞窟ゼリー',33,66,25,4),
  (11,'m_spider','迷路グモ',66,72,28,6),(12,'m_bat','通路コウモリ',39,71,24,5)) v(i,key,label,x,y,hp,atk)
 where not online_frame_blocked(x,y,1,'{"keys":[],"bossEncounter":{"phase":"waiting"}}',cfg);
 if jsonb_array_length(mobs)<8 then raise exception 'Corridor spawn layout does not match floor 1';end if;
 update online_adventure_config set data=jsonb_set(data,'{enemies}',(data->'enemies')||mobs) where id='floor1';
 update online_adventure_rooms r set snapshot=jsonb_set(snapshot,'{enemies}',(snapshot->'enemies')||
  coalesce((select jsonb_agg(e) from jsonb_array_elements(mobs) e where
   not exists(select 1 from jsonb_array_elements(r.snapshot->'enemies') old
    where old->>'id'=e->>'id' or (old->>'hp')::int>0 and old->>'x'=e->>'x' and old->>'y'=e->>'y')
   and not exists(select 1 from online_adventure_members a where a.room_id=r.id and a.floor=1 and a.finished_at is null
    and a.x=(e->>'x')::int and a.y=(e->>'y')::int)),'[]'::jsonb))
 where r.status='active' and r.snapshot->>'mapVersion'='5';
end$$;

create function public.online_room_hud_roster(rid uuid) returns jsonb
language sql stable set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',c.id,'name',c.name,'hp',c.hp,'hpMax',online_equipment_hp(c.gear),'floor',m.floor
 ) order by m.floor,c.name,c.id),'[]') from online_adventure_members m
 join online_characters c on c.id=m.character_id join online_presence p on p.character_id=c.id
 where m.room_id=rid and m.finished_at is null and p.location='dungeon'
 and p.seen_at>clock_timestamp()-interval '20 seconds'
$$;

create function public.online_room_hud_inspection(cid uuid, target_id uuid) returns jsonb
language plpgsql stable set search_path=public,pg_temp as $$
declare target online_characters;
begin
 select c.* into target from online_adventure_members me join online_adventure_members other on other.room_id=me.room_id
 join online_characters c on c.id=other.character_id
 join online_presence p on p.character_id=other.character_id
 where me.character_id=cid and me.finished_at is null and other.finished_at is null
 and p.location='dungeon' and p.seen_at>clock_timestamp()-interval '20 seconds' and c.id=target_id and c.id<>cid;
 if not found then raise exception '同じ部屋の冒険者を選択してください。';end if;
 return jsonb_build_object('characterId',target.id,'name',target.name,'gender',target.gender,'hp',target.hp,
  'sameAccount',target.user_id=auth.uid(),'equipment',coalesce((
   select jsonb_agg(jsonb_build_object('slot',slot,'key',coalesce(target.gear->>(slot||'_key'),
    case slot when 'weapon' then 'w_iron_dagger' when 'armor' then 'leather' end)))
   from unnest(array['weapon','armor','shield','necklace','boots','gloves']) slot
   where coalesce((target.gear->>slot)::boolean,false)
  ),'[]'));
end$$;

do $$
declare d text; hook text;
begin
 select pg_get_functiondef('public.online_motion_state(uuid)'::regprocedure) into d;
 hook:='''roomId'',m.room_id';
 if strpos(d,hook)=0 then raise exception 'Room HUD motion hook missing';end if;
 execute replace(d,hook,hook||',''roomRoster'',online_room_hud_roster(m.room_id),''level'',1+c.adventure_xp/20,''exp'',c.adventure_xp%20,''invulnerableUntil'',coalesce(extract(epoch from c.invulnerable_until)*1000,0)::bigint');
 select pg_get_functiondef('public.online_world(text,jsonb)'::regprocedure) into d;
 hook:='if action=''inspect_player'' then';
 if strpos(d,hook)=0 then raise exception 'Room inspection hook missing';end if;
 execute replace(d,hook,$patch$
 if action='room_inspect' then
  select * into p from online_presence where user_id=uid and location='dungeon';
  select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
  if m.id is null then raise exception 'ダンジョンの中で使ってください。';end if;
  e:=online_room_hud_inspection(p.character_id,(payload->>'character_id')::uuid);
  return online_world_pre_arena_update('poll','{}')||jsonb_build_object('inspection',e);
 end if;
 if action='inspect_player' then$patch$);

 select pg_get_functiondef('public.online_dungeon_walk(jsonb)'::regprocedure) into d;
 hook:='then buff:=coalesce(s#>array[''panelBuffs'',c.id::text]';
 if strpos(d,hook)=0 then raise exception 'Buff panel hook missing';end if;
 execute replace(d,hook,$patch$
 and not(coalesce(s#>array['panelBuffUsed',c.id::text],'[]')?(panel->>'id')) then
 s:=s||jsonb_build_object('panelBuffUsed',coalesce(s->'panelBuffUsed','{}')||jsonb_build_object(c.id::text,
  coalesce(s#>array['panelBuffUsed',c.id::text],'[]')||jsonb_build_array(panel->>'id')));
 buff:=coalesce(s#>array['panelBuffs',c.id::text]$patch$);

 select pg_get_functiondef('public.online_world_pre_shared_turns(text,jsonb)'::regprocedure) into d;
 hook:='elsif kind in(''attack_up'',''defense_up'',''attack_down'',''defense_down'')then';
 if strpos(d,hook)=0 then raise exception 'Legacy buff panel hook missing';end if;
 execute replace(d,hook,$patch$
 elsif kind in('attack_up','defense_up','attack_down','defense_down')
  and not(coalesce(s#>array['panelBuffUsed',cid::text],'[]')?(p->>'id')) then
  s:=s||jsonb_build_object('panelBuffUsed',coalesce(s->'panelBuffUsed','{}')||jsonb_build_object(cid::text,
   coalesce(s#>array['panelBuffUsed',cid::text],'[]')||jsonb_build_array(p->>'id')));$patch$);
end$$;

revoke all on function public.online_retainer_detour(uuid,int,int,int,int,jsonb,jsonb),
 public.online_room_hud_roster(uuid),public.online_room_hud_inspection(uuid,uuid) from public,anon,authenticated;

commit;
