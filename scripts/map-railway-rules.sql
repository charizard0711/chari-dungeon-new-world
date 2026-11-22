alter table public.online_adventure_members add column rail_gates jsonb not null default '{}',add column rail_trip jsonb;
-- Ease acceleration/deceleration over the first/last 15% of a trip.
create function public.online_rail_progress(t numeric)returns numeric language sql immutable as $$select case when t<=0 then 0 when t>=1 then 1 when t<.15 then t*t/.255 when t>.85 then 1-(1-t)*(1-t)/.255 else(t-.075)/.85 end$$;
alter function public.online_world(text,jsonb) rename to online_world_pre_map_railway;
create function public.online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
#variable_conflict use_column
declare uid uuid:=auth.uid();p online_presence;m online_adventure_members;r online_adventure_rooms;v online_adventure_members;result jsonb;cfg jsonb;route jsonb;trip jsonb;gate text;board text;dest jsonb;point jsonb;pos int;n int;sx int;sy int;oldx int;oldy int;dx int;dy int;nowms bigint:=online_adventure_now_ms();t numeric;spot record;players jsonb;actor jsonb;begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)then raise exception 'ログインしてください。';end if;
 select * into p from online_presence where user_id=uid;
 select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
 select data into cfg from online_adventure_config where id='floor1';route:=cfg#>'{railway,route}';n:=jsonb_array_length(route);
 if m.id is not null and p.location='dungeon' and m.floor=1 then
 perform pg_advisory_xact_lock(hashtextextended('online-room:'||m.room_id::text,0));
 select * into r from online_adventure_rooms where id=m.room_id for update;
 -- Finish authoritative trips, including those whose owner disconnected mid-ride.
 for v in select * from online_adventure_members where room_id=m.room_id and rail_trip is not null and finished_at is null for update loop
 if nowms>=(v.rail_trip->>'started')::bigint+(v.rail_trip->>'duration')::int then
 dx:=case when(v.rail_trip->>'reverse')::boolean then 49 else 54 end;dy:=case when(v.rail_trip->>'reverse')::boolean then 87 else 29 end;
 select cx as x,cy as y into spot from generate_series(dx-1,dx+1)gx(cx)cross join generate_series(dy-1,dy+1)gy(cy)
 where not online_adventure_blocked(cx,cy,1,r.snapshot)and not exists(select 1 from online_adventure_members a join online_presence op on op.character_id=a.character_id where a.room_id=m.room_id and a.finished_at is null and a.floor=1 and a.character_id<>v.character_id and a.rail_trip is null and a.x=cx and a.y=cy and op.location='dungeon'and op.seen_at>clock_timestamp()-interval '30 seconds')
 order by abs(cx-dx)+abs(cy-dy),cy,cx limit 1;
 if spot.x is not null then update online_adventure_members set x=spot.x,y=spot.y,rail_trip=null,dir='up'where id=v.id;end if;
 end if;end loop;
 select * into m from online_adventure_members where id=m.id;
 if m.rail_trip is not null and action not in('poll','list','chat')then
 if action='interact'and payload->>'id'like'rail_%'then action:='poll';payload:='{}';else raise exception '乗車中です。到着までお待ちください。';end if;
 end if;
 if action='move'and (payload->>'y')::int>=83 and(payload->>'y')::int<=89 and(payload->>'x')::int between 47 and 53 and coalesce((m.rail_gates->>'entry')::boolean,false)=false then raise exception '先に改札をクリックして開けてください。';end if;
 if action='interact'and payload->>'id'in('rail_entry','rail_boss','rail_board_entry','rail_board_boss')then
 gate:=case when payload->>'id'in('rail_entry','rail_board_entry')then'entry'else'boss'end;
 sx:=case when gate='entry'then 49 else 53 end;sy:=case when gate='entry'then 83 else 26 end;
 if not exists(select 1 from online_rail_unlocks where character_id=m.character_id and floor=1)then raise exception '一度フロアボスとの戦闘に参加すると改札が解放されます。';end if;
 if payload->>'id'in('rail_entry','rail_boss')then
 if abs(m.x-sx)+abs(m.y-sy)>2 then raise exception '改札の近くで操作してください。';end if;
 update online_adventure_members set rail_gates=rail_gates||jsonb_build_object(gate,true)where id=m.id;
 action:='poll';payload:='{}';
 else board:=gate;end if;
 end if;
 oldx:=m.x;oldy:=m.y;
 if board is null then result:=online_world_pre_map_railway(action,payload);end if;
 select * into m from online_adventure_members where id=m.id;
 -- Walking to the boarding square also boards, without an extra menu.
 if action='move'and m.rail_trip is null and(m.x<>oldx or m.y<>oldy)then
 if m.x=49 and m.y=87 and coalesce((m.rail_gates->>'entry')::boolean,false)then board:='entry';end if;
 if m.x=54 and m.y=29 and coalesce((m.rail_gates->>'boss')::boolean,false)then board:='boss';end if;
 end if;
 if board is not null then
 sx:=case when board='entry'then 49 else 54 end;sy:=case when board='entry'then 88 else 28 end;
 if abs(m.x-sx)+abs(m.y-sy)>1 then raise exception '列車のそばまで進んでください。';end if;
 if not coalesce((m.rail_gates->>board)::boolean,false)then raise exception '先に改札を開けてください。';end if;
 if m.attack_at>clock_timestamp()-interval '2 seconds'then raise exception '攻撃が終わってから乗車してください。';end if;
 update online_characters set gold=gold-500 where id=m.character_id and gold>=500 and hp>0;
 if not found then raise exception '乗車には500G必要です。';end if;
 update online_adventure_members set rail_trip=jsonb_build_object('started',nowms,'duration',20000,'reverse',board='boss'),rail_gates=rail_gates||'{"entry":true,"boss":true}'::jsonb where id=m.id;
 result:=online_world_pre_map_railway('poll','{}');
 end if;
 else
 if action='interact'and payload->>'id'like'rail_%'then raise exception '第1層の駅で利用してください。';end if;
 result:=online_world_pre_map_railway(action,payload);
 end if;
 if result->'adventure'is not null and result->'adventure'<>'null'::jsonb then
 select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
 result:=jsonb_set(result,'{adventure,railGates}',coalesce(m.rail_gates,'{}'));
 result:=jsonb_set(result,'{adventure,railTrip}',coalesce(m.rail_trip,'null'));
 players:='[]';for actor in select value from jsonb_array_elements(result->'players')loop
 select rail_trip into trip from online_adventure_members where room_id=m.room_id and character_id=(actor->>'character_id')::uuid and finished_at is null;
 if trip is not null then
 t:=greatest(0,least(1,(nowms-(trip->>'started')::bigint)/(trip->>'duration')::numeric));pos:=floor(online_rail_progress(t)*(n-1));if(trip->>'reverse')::boolean then pos:=n-1-pos;end if;point:=route->pos;
 actor:=actor||jsonb_build_object('railTrip',trip,'x',point->'x','y',point->'y');
 if actor->>'character_id'=p.character_id::text then result:=jsonb_set(jsonb_set(result,'{adventure,x}',point->'x'),'{adventure,y}',point->'y');end if;
 end if;players:=players||jsonb_build_array(actor);end loop;result:=jsonb_set(result,'{players}',players);
 end if;
 return result;
end$$;
revoke all on function public.online_world_pre_map_railway(text,jsonb),public.online_rail_progress(numeric)from public,anon,authenticated;
revoke all on function public.online_world(text,jsonb)from public,anon;
grant execute on function public.online_world(text,jsonb)to authenticated;
-- No rail passenger should become a turn target while their character is parked at a station server-side.
do $$declare src text;begin select pg_get_functiondef('public.online_turn_target(uuid,jsonb)'::regprocedure)into src;
 if position('a.finished_at is null'in src)=0 then raise exception 'Rail target hook missing';end if;
 src:=replace(src,'a.finished_at is null','a.finished_at is null and a.rail_trip is null');execute src;end$$;

do $$declare src text;begin select pg_get_functiondef('public.online_adventure_blocked(integer,integer,integer,jsonb)'::regprocedure)into src;
if position('if px=(p->>''x'')::int' in src)=0 then raise exception 'Gate movement hook missing';end if;
src:=replace(src,'if px=(p->>''x'')::int','if p->>''kind''<>''rail'' and px=(p->>''x'')::int');execute src;end$$;
