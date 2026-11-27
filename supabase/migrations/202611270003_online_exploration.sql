begin;
-- Compact per-room/floor discovery. Private bitset, never the global player save.
create table online_adventure_maps(room_id uuid references online_adventure_rooms(id)on delete cascade,floor int not null,tiles bytea not null,revision int not null default 0,primary key(room_id,floor));
alter table online_adventure_maps enable row level security;
revoke all on online_adventure_maps from public,anon,authenticated;
create function online_explore_step(rid uuid,f int,px int,py int,cfg jsonb)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare w int:=case when f=2 then 13 else(cfg->>'width')::int end;h int:=case when f=2 then 11 else(cfg->>'height')::int end;bits bytea;original bytea;cx int;cy int;i int;begin
 if px<0 or py<0 or px>=w or py>=h then return;end if;
 if f=1 and exists(select 1 from jsonb_array_elements(cfg#>'{railway,stations}')s where px>=(s->>'x')::int and px<(s->>'x')::int+(s->>'w')::int and py>=(s->>'y')::int and py<(s->>'y')::int+(s->>'h')::int)then return;end if;
 select tiles into bits from online_adventure_maps where room_id=rid and floor=f;
 if bits is null then bits:=decode(repeat('00',(w*h+7)/8),'hex');end if;original:=bits;
 for cy in greatest(0,py-1)..least(h-1,py+1)loop for cx in greatest(0,px-1)..least(w-1,px+1)loop
 if f=1 and exists(select 1 from jsonb_array_elements(cfg#>'{railway,stations}')s where cx>=(s->>'x')::int and cx<(s->>'x')::int+(s->>'w')::int and cy>=(s->>'y')::int and cy<(s->>'y')::int+(s->>'h')::int)then continue;end if;
 i:=cy*w+cx;bits:=set_bit(bits,i,1);
 end loop;end loop;
 if bits is distinct from original then insert into online_adventure_maps values(rid,f,bits,1)on conflict(room_id,floor)do update set tiles=excluded.tiles,revision=online_adventure_maps.revision+1;end if;
end$$;
create function online_exploration_state(rid uuid,f int)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$select coalesce((select jsonb_build_object('revision',revision,'tiles',encode(tiles,'hex'))from online_adventure_maps where room_id=rid and floor=f),'{"revision":0,"tiles":""}'::jsonb)$$;
revoke all on function online_explore_step(uuid,int,int,int,jsonb),online_exploration_state(uuid,int)from public,anon,authenticated;
-- The fast path marks every accepted tile, including intermediate batch steps.
do $$declare s text;begin
 select pg_get_functiondef('online_dungeon_walk(jsonb)'::regprocedure)into s;
 if position('spent:=spent+1;accepted:=accepted+1;'in s)=0 then raise exception 'Explore movement hook missing';end if;
 s:=replace(s,'spent:=spent+1;accepted:=accepted+1;','spent:=spent+1;accepted:=accepted+1;perform online_explore_step(m.room_id,m.floor,m.x,m.y,cfg);');execute s;
 select pg_get_functiondef('online_motion_state(uuid)'::regprocedure)into s;
 if position('return jsonb_build_object(''roomId'''in s)=0 then raise exception 'Explore packet hook missing';end if;
 s:=replace(s,'return jsonb_build_object(''roomId''','return jsonb_build_object(''exploration'',online_exploration_state(m.room_id,m.floor),''roomId''');execute s;
end$$;
alter function online_world(text,jsonb)rename to online_world_pre_exploration;
create function online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;m online_adventure_members;cfg jsonb;begin
 result:=online_world_pre_exploration(action,payload);
 if result#>>'{adventure,inside}'='true' then
 select * into m from online_adventure_members where character_id=(result#>>'{active,id}')::uuid and finished_at is null;
 if m.id is not null then
 if action in('move','walk_batch','room_create','room_join','room_enter','room_teleport','room_stairs','use_item')then select data into cfg from online_adventure_config where id='floor1';perform online_explore_step(m.room_id,m.floor,m.x,m.y,cfg);end if;
 result:=jsonb_set(result,'{adventure,exploration}',online_exploration_state(m.room_id,m.floor));
 end if;end if;return result;
end$$;
revoke all on function online_world_pre_exploration(text,jsonb)from public,anon,authenticated;
revoke all on function online_world(text,jsonb)from public,anon;
grant execute on function online_world(text,jsonb)to authenticated;
notify pgrst,'reload schema';
commit;
