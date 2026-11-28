begin;

alter table public.online_characters add column invulnerable_until timestamptz;
create function public.online_preserve_invulnerable_hp() returns trigger language plpgsql
set search_path=public,pg_temp as $$
begin
 if new.hp<old.hp and old.invulnerable_until>clock_timestamp() then
  new.hp:=least(old.hp,online_equipment_hp(new.gear));
 end if;
 return new;
end$$;
create trigger online_preserve_invulnerable_hp before update of hp on public.online_characters
for each row when (old.invulnerable_until is not null and new.hp<old.hp)
execute function public.online_preserve_invulnerable_hp();

create function public.online_floor_gear(weapon_only boolean) returns public.online_catalog
language plpgsql volatile set search_path=public,pg_temp as $$
declare reward online_catalog; tier text:=case when random()<.10 then 'C' else 'D' end;
begin
 select * into reward from online_catalog where grade=tier and
  case when weapon_only then category='weapon' else category in('weapon','armor','shield','necklace','boots','gloves') end
 order by random() limit 1;
 return reward;
end$$;

create function public.online_floor_consumable() returns text language sql volatile as $$
 select (array['skill_drink','potion','warp','invis'])[1+floor(random()*4)::int]
$$;

create function public.online_floor_rare_item() returns text language sql volatile as $$
 select case when random()<.5 then 'mystery_bread' else 'dynamite' end
$$;

create function public.online_floor_chest(cid uuid, gold_chest boolean) returns void
language plpgsql set search_path=public,pg_temp as $$
declare roll numeric:=random(); gear online_catalog;
begin
 if roll<(case when gold_chest then .30 else .01 end) then
  gear:=online_floor_gear(true);
  perform online_give_equipment(cid,gear.key,random()<.01);
 elsif roll<(case when gold_chest then .40 else .02 end) then
  perform online_give_equipment(cid,online_floor_rare_item(),false);
 else
  perform online_give_equipment(cid,online_floor_consumable(),false);
 end if;
end$$;

create function public.online_floor_kill(rid uuid, floor_no int, killer uuid, enemy jsonb) returns void
language plpgsql set search_path=public,pg_temp as $$
declare boss boolean:=coalesce((enemy->>'boss')::boolean,false);
 elite boolean:=coalesce((enemy->>'elite')::boolean,false);
 retainer boolean:=coalesce((enemy->>'retainer')::boolean,false);
 amount int:=case when boss then 300 when coalesce((enemy->>'elite')::boolean,false) then 40 else 8 end;
 px int:=(enemy->>'x')::int;py int:=(enemy->>'y')::int;
 reward online_catalog; item_key text;
begin
 update online_characters c set gold=least(2147483647,c.gold::bigint+
  case when c.id=killer then amount else ceil(amount*.20)::int end)
 where c.id=killer or (coalesce(enemy->'contributors','{}')?c.id::text and exists(
  select 1 from online_adventure_members m where m.room_id=rid and m.floor=floor_no
   and m.character_id=c.id and m.finished_at is null));
 if floor_no<>1 then return;end if;
 if not retainer and (boss or elite or random()<.10) then
  reward:=online_floor_gear(false);
  insert into online_adventure_loot(room_id,floor,x,y,kind,category)
  values(rid,floor_no,px,py,case when random()<.01 then 'star_'||reward.key else reward.key end,reward.category);
 end if;
 if random()<.30 then
  insert into online_adventure_loot(room_id,floor,x,y,kind,category)
  values(rid,floor_no,px,py,online_floor_consumable(),'item');
 end if;
 if boss or elite or (not retainer and random()<.01) then
  item_key:=online_floor_rare_item();
  insert into online_adventure_loot(room_id,floor,x,y,kind,category)
  values(rid,floor_no,px,py,item_key,'item');
 end if;
end$$;

-- Normalize equipped and unequipped legacy instances without changing their IDs.
update public.online_catalog set dur_max=0 where coalesce(dur_max,0)>0;
update public.online_catalog set shop_price=null where key='repair';
select public.online_sync_instances(id) from public.online_characters;

do $$
declare d text; from_pos int; to_pos int;
begin
 select replace(pg_get_functiondef('public.online_world_adventures(text,jsonb)'::regprocedure),chr(13),'') into d;
 d:=replace(d,'damage:=damage+n;hit:=true;', $patch$
 enemy:=enemy||jsonb_build_object('contributors',coalesce(enemy->'contributors','{}')||jsonb_build_object(c.id::text,true));
 damage:=damage+n;hit:=true;$patch$);
 d:=replace(d,'update online_characters set gold=gold+case when coalesce((enemy->>''boss'')::boolean,false) then 0 when coalesce((enemy->>''elite'')::boolean,false) then 40 when coalesce((enemy->>''fragment'')::boolean,false) then 0 else 8 end where id=c.id;',
  'perform online_floor_kill(room.id,member.floor,c.id,enemy);');
 d:=replace(d,'if count_members>0 then update online_characters set gold=gold+300 where id=(checkpoint->>''id'')::uuid;perform online_give_equipment((checkpoint->>''id'')::uuid,''potion'',false);end if;','');
 from_pos:=strpos(d,'    if keytext is not null then'||chr(10)||'     select ordinality');
 to_pos:=strpos(d,'   elsif action=''chat'' then');
 if from_pos=0 or to_pos<=from_pos or strpos(d,'perform online_floor_kill')=0 then raise exception 'Adventure reward hooks missing';end if;
 execute substr(d,1,from_pos-1)||substr(d,to_pos);

 select pg_get_functiondef('public.online_world_equipment(text,jsonb)'::regprocedure) into d;
 d:=replace(d,'and coalesce(cat.dur_max,0)>0','and false');
 from_pos:=strpos(d,'   update public.online_characters set instances=jsonb_set(instances,array[''weapon''');
 if from_pos=0 then raise exception 'Town durability hook missing';end if;
 execute substr(d,1,from_pos-1)||regexp_replace(substr(d,from_pos),'^.*?where id=c.id;','   null;');

 select replace(pg_get_functiondef('public.online_world_pre_target_turns(text,jsonb)'::regprocedure),chr(13),'') into d;
 from_pos:=strpos(d,';ins:=c.instances;');
 to_pos:=strpos(d,'     s:=s||jsonb_build_object(''fountainUsed''');
 if from_pos=0 or to_pos<=from_pos then raise exception 'Fountain repair hook missing';end if;
 d:=substr(d,1,from_pos)||'update online_characters set hp=online_equipment_hp(gear) where id=c.id;'||chr(10)||substr(d,to_pos);
 from_pos:=strpos(d,'     if s->''opened''?key then');
 to_pos:=strpos(d,'    end if;'||chr(10)||'    update online_adventure_rooms');
 if from_pos=0 or to_pos<=from_pos then raise exception 'Chest reward hook missing';end if;
 execute substr(d,1,from_pos-1)||$patch$
     arr:=coalesce(s#>array['personalChests',c.id::text],'[]');
     if arr?key then raise exception 'この宝箱は開封済みです。';end if;
     perform online_floor_chest(c.id,coalesce(s->'goldChests'?key,false));
     s:=s||jsonb_build_object('personalChests',coalesce(s->'personalChests','{}')||jsonb_build_object(c.id::text,arr||jsonb_build_array(key)));
$patch$||substr(d,to_pos);
end$$;

do $$
declare d text;
begin
 select replace(pg_get_functiondef('public.online_world(text,jsonb)'::regprocedure),chr(13),'') into d;
 if strpos(d,'newhp:=greatest(0,hp-amount);')=0 then raise exception 'Dynamite hit hook missing';end if;
 d:=replace(d,'newhp:=greatest(0,hp-amount);',$patch$
   newhp:=greatest(0,hp-amount);
   e:=e||jsonb_build_object('contributors',coalesce(e->'contributors','{}')||jsonb_build_object(c.id::text,true));$patch$);
 d:=replace(d,'if newhp=0 then'||chr(10)||'     s:=', 'if newhp=0 then perform online_floor_kill(r.id,m.floor,c.id,e);'||chr(10)||'     s:=');
 d:=replace(d,'if found then'||chr(10)||'       update online_characters set gold=gold+300 where id=reward.character_id;'||chr(10)||
   '       perform online_give_equipment(reward.character_id,''potion'',false);'||chr(10)||'      end if;','');
 d:=replace(d,'gold_gain:=gold_gain+case when coalesce((e->>''elite'')::boolean,false) then 40 when e?''fragment'' then 0 else 8 end;',
  'perform online_floor_kill(r.id,m.floor,c.id,e);');
 d:=replace(d,',gold=gold+gold_gain','');
 d:=replace(d, 'if action=''inspect_player'' then', $patch$
 if action='repair_equipment' or action='use_item' and payload->>'kind'='repair' then
  raise exception '装備の修理は廃止されました。';
 end if;
 if action='use_item' and payload->>'kind'='mystery_bread' then
  perform online_lock_action(action);
  select * into p from online_presence where user_id=uid and location='dungeon';
  select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
  select * into c from online_characters where id=p.character_id and user_id=uid;
  if m.id is null or c.hp<=0 or m.rail_trip is not null then raise exception 'ダンジョンの中で使ってください。';end if;
  if online_in_boss_room(m.x,m.y) and exists(select 1 from online_adventure_rooms where id=m.room_id
   and snapshot#>>'{bossEncounter,phase}'='opening') then raise exception '登場演出中は使えません。';end if;
  if coalesce((c.inventory->>'mystery_bread')::int,0)<1 then raise exception 'クロワッサンを持っていません。';end if;
  update online_characters set inventory=jsonb_set(inventory,'{mystery_bread}',to_jsonb((inventory->>'mystery_bread')::int-1)) where id=c.id;
  update online_characters ch set hp=online_equipment_hp(ch.gear),invulnerable_until=clock_timestamp()+interval '2 minutes'
  from online_adventure_members a join online_presence pr on pr.character_id=a.character_id
  where ch.id=a.character_id and a.room_id=m.room_id and a.floor=m.floor and a.finished_at is null and pr.location='dungeon';
  return online_world_pre_arena_update('poll','{}');
 end if;
 if action='inspect_player' then$patch$);
 execute d;
end$$;

revoke all on function public.online_preserve_invulnerable_hp(),public.online_floor_gear(boolean),
 public.online_floor_consumable(),public.online_floor_rare_item(),public.online_floor_chest(uuid,boolean),
 public.online_floor_kill(uuid,int,uuid,jsonb) from public,anon,authenticated;

commit;
