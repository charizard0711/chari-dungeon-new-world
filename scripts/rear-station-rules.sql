-- A separate rear station; the original southern approach is restored unchanged.
do $$declare s text;begin
select pg_get_functiondef('online_world_pre_latency(text,jsonb)'::regprocedure)into s;
if position('if m.x=50 and m.y=39'in s)=0 then raise exception 'Rear station migration hook missing';end if;
s:=replace(s,'then 51 else 50 end;dy:=case when(v.rail_trip->>''reverse'')::boolean then 101 else 39 end;', 'then 51 else 102 end;dy:=case when(v.rail_trip->>''reverse'')::boolean then 101 else 16 end;');
s:=replace(s,'then 49 else 53 end;sy:=case when gate=''entry''then 83 else 26 end;', 'then 49 else 94 end;sy:=case when gate=''entry''then 83 else 3 end;');
s:=replace(s,'if m.x=50 and m.y=39','if m.x=102 and m.y=16');
s:=replace(s,'then 51 else 50 end;sy:=case when board=''entry''then 101 else 39 end;', 'then 51 else 102 end;sy:=case when board=''entry''then 101 else 16 end;');
s:=replace(s,'if action=''move''and (payload->>''y'')::int>=84', 'if action=''move''and exists(select 1 from jsonb_array_elements(cfg#>''{railway,stations}'')st where (payload->>''x'')::int>=(st->>''x'')::int and (payload->>''x'')::int<(st->>''x'')::int+(st->>''w'')::int and (payload->>''y'')::int>=(st->>''y'')::int and (payload->>''y'')::int<(st->>''y'')::int+(st->>''h'')::int and not coalesce((m.rail_gates->>(st->>''id''))::boolean,false))then raise exception ''先に改札をクリックして開けてください。'';end if; if action=''move''and (payload->>''y'')::int>=84');execute s;
-- The rear exit seals for the same encounter phases as the front.
select pg_get_functiondef('online_adventure_blocked_pre_cinematic(integer,integer,integer,jsonb)'::regprocedure)into s;
s:=replace(s,'begin','begin if f=1 and px between 54 and 55 and py=2 and coalesce(s#>>''{bossEncounter,phase}'',''waiting'')in(''opening'',''battle'',''returning'')then return true;end if;');execute s;
select pg_get_functiondef('online_frame_blocked(integer,integer,integer,jsonb,jsonb)'::regprocedure)into s;
s:=replace(s,'begin','begin if f=1 and px between 54 and 55 and py=2 and coalesce(s#>>''{bossEncounter,phase}'',''waiting'')in(''opening'',''battle'',''returning'')then return true;end if;');execute s;
end$$;
-- Both movement transports obey the same private turnstile and boarding rules.
do $$declare s text;begin
select replace(pg_get_functiondef('online_dungeon_walk(jsonb)'::regprocedure),chr(13),'')into s;
s:=replace(s,'if nx is null or ny is null', 'if m.floor=1 and exists(select 1 from jsonb_array_elements(cfg#>''{railway,stations}'')st where nx>=(st->>''x'')::int and nx<(st->>''x'')::int+(st->>''w'')::int and ny>=(st->>''y'')::int and ny<(st->>''y'')::int+(st->>''h'')::int and not coalesce((m.rail_gates->>(st->>''id''))::boolean,false))then stopped:=true;exit;end if; if nx is null or ny is null');
s:=replace(s,'end loop;'||chr(10)||'update online_presence set seen_at=stamp', 'if m.floor=1 and exists(select 1 from jsonb_array_elements(cfg#>''{railway,stations}'')st where nx=(st->>''padX'')::int and ny=(st->>''padY'')::int)then stopped:=true;exit;end if;'||chr(10)||'end loop;'||chr(10)||'update online_presence set seen_at=stamp');
s:=replace(s,'result:=online_motion_state(c.id)', 'if accepted>0 and m.floor=1 then select value into area from jsonb_array_elements(cfg#>''{railway,stations}'')where m.x=(value->>''padX'')::int and m.y=(value->>''padY'')::int; if area is not null then perform online_world(''interact'',jsonb_build_object(''id'',''rail_board_''||(area->>''id'')));end if;end if;'||chr(10)||'result:=online_motion_state(c.id)');if position('then stopped:=true;exit;end if;'||chr(10)||'end loop;' in s)=0 then raise exception 'Boarding stop hook missing';end if;execute s;
-- Own gold / travel state accompanies sparse acknowledgements so a new trip is visible immediately.
select pg_get_functiondef('online_motion_state(uuid)'::regprocedure)into s;
s:=replace(s,'''hp'',c.hp', '''gold'',c.gold,''railTrip'',m.rail_trip,''railGates'',m.rail_gates,''hp'',c.hp');execute s;
end$$;
-- Relocate only characters left inside the removed platform. No rooms, gear or saves are reset.
do $$declare m record;s jsonb;spot record;begin
for m in select * from online_adventure_members where floor=1 and finished_at is null and rail_trip is null and x between 48 and 62 and y between 27 and 42 loop
select snapshot into s from online_adventure_rooms where id=m.room_id;
if online_adventure_blocked(m.x,m.y,1,s)then
select x,y into spot from generate_series(49,55)gx(x)cross join generate_series(25,29)gy(y)
where not online_adventure_blocked(x,y,1,s)and not exists(select 1 from online_adventure_members o where o.room_id=m.room_id and o.floor=1 and o.finished_at is null and o.id<>m.id and o.x=gx.x and o.y=gy.y)
order by abs(x-50)+abs(y-28),y,x limit 1;
if spot.x is not null then update online_adventure_members set x=spot.x,y=spot.y where id=m.id;end if;
end if;end loop;end$$;
notify pgrst,'reload schema';
