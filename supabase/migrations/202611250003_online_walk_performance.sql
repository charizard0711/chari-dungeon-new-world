-- Index prior monster states once per action instead of scanning N monsters N times.
do $$declare s text;needle text;begin
 select pg_get_functiondef('online_world_pre_railway(text,jsonb)'::regprocedure)into s;
 needle:='for idx in 0..jsonb_array_length(es)-1 loop e:=es->idx;select value into old_e from jsonb_array_elements(before_s->''enemies'')where value->>''id''=e->>''id'';g:=online_mob_profile(e->>''key'')->>''gimmick'';';
 if position(needle in s)=0 then raise exception 'Monster death scan hook missing';end if;
 s:=replace(s,'declare uid uuid:=auth.uid();','declare old_by_id jsonb;uid uuid:=auth.uid();');
 s:=replace(s,needle,'select jsonb_object_agg(value->>''id'',value)into old_by_id from jsonb_array_elements(before_s->''enemies'');
 for idx in 0..jsonb_array_length(es)-1 loop e:=es->idx;if(e->>''hp'')::int>0 then continue;end if;old_e:=old_by_id->(e->>''id'');if coalesce((old_e->>''hp'')::int,0)<=0 then continue;end if;g:=online_mob_profile(e->>''key'')->>''gimmick'';');execute s;
end$$;
-- A bounded token bucket batches already-buffered walking without trusting client time.
-- Every square still uses the existing collision, enemy, trap, reward and healing rules.
alter function public.online_world(text,jsonb)rename to online_world_pre_walk_batch;
create function public.online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p online_presence;m online_adventure_members;result jsonb;step jsonb;budget_at timestamptz;stamp timestamptz;available int;done int:=0;old_x int;old_y int;new_x int;new_y int;stopped boolean:=false;begin
 -- Idle observers must not queue behind a room mutation; try again on the next poll.
 if action='poll'and coalesce((payload->>'allow_deferred')::boolean,false)and auth.uid()is not null then
 select * into p from online_presence where user_id=auth.uid();
 if p.location='dungeon'then
 if not pg_try_advisory_xact_lock(hashtextextended(auth.uid()::text,0))then return jsonb_build_object('pollDeferred',true);end if;
 select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
 if m.id is not null and not pg_try_advisory_xact_lock(hashtextextended('online-room:'||m.room_id::text,0))then return jsonb_build_object('pollDeferred',true);end if;
 end if;end if;
 if action<>'walk_batch'then return online_world_pre_walk_batch(action,payload);end if;
 if auth.uid()is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)then raise exception 'ログインしてください。';end if;
 if jsonb_typeof(payload->'steps')is distinct from'array'or jsonb_array_length(payload->'steps')not between 1 and 3 then raise exception '移動経路を確認してください。';end if;
 perform online_lock_action('move');select * into p from online_presence where user_id=auth.uid();
 select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
 if p.character_id is null or p.location not in('town','dungeon')then raise exception '町に入場してください。';end if;
 if p.location='dungeon'and online_in_boss_room(m.x,m.y)then raise exception 'ボスエリアでは1行動ずつ選んでください。';end if;
 stamp:=clock_timestamp();budget_at:=greatest(p.moved_at,stamp-interval '330 milliseconds');
 available:=least(3,floor(extract(epoch from(stamp-budget_at))*1000/110)::int);
 if available<1 then raise exception '少し待ってください。';end if;
 for step in select value from jsonb_array_elements(payload->'steps')limit available loop
 begin
 select * into p from online_presence where user_id=auth.uid();select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
 old_x:=case when p.location='dungeon'then m.x else p.x end;old_y:=case when p.location='dungeon'then m.y else p.y end;
 if p.location='dungeon'and(online_in_boss_room(old_x,old_y)or m.rail_trip is not null)then stopped:=true;exit;end if;
 if abs((step->>'x')::int-old_x)+abs((step->>'y')::int-old_y)<>1 then raise exception '移動経路を確認してください。';end if;
 -- Credit has already been checked against server time; allow each validated buffered square.
 update online_presence set moved_at=clock_timestamp()-interval '111 milliseconds'where user_id=auth.uid();
 result:=online_world_pre_walk_batch('move',step);done:=done+1;
 update online_presence set moved_at=budget_at+done*interval '110 milliseconds'where user_id=auth.uid();
 select(value->>'x')::int,(value->>'y')::int into new_x,new_y from jsonb_array_elements(result->'players')where value->>'character_id'=p.character_id::text;
 if new_x is distinct from(step->>'x')::int or new_y is distinct from(step->>'y')::int or result#>>'{active,hp}'='0'then stopped:=true;exit;end if;
 exception when others then if done=0 then raise;end if;stopped:=true;exit;end;
 end loop;
 if result is null then result:=online_world_pre_walk_batch('poll','{}');end if;
 return result||jsonb_build_object('walkBatch',jsonb_build_object('accepted',done,'stopped',stopped));
end$$;
revoke all on function public.online_world_pre_walk_batch(text,jsonb)from public,anon,authenticated;
revoke all on function public.online_world(text,jsonb)from public,anon;
grant execute on function public.online_world(text,jsonb)to authenticated;
