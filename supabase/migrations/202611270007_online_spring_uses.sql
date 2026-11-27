-- The ordinary resting spring, like the blessing fountain, is once per character.
alter function online_world(text,jsonb)rename to online_world_pre_spring_uses;
create function online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p online_presence;m online_adventure_members;s jsonb;cfg jsonb;result jsonb;k text:=payload->>'id';spring boolean:=false;begin
 if action='interact'and k='spring'then
 if auth.uid()is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)then raise exception 'ログインしてください。';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));select * into p from online_presence where user_id=auth.uid();select * into m from online_adventure_members where character_id=p.character_id and finished_at is null;
 if p.location='dungeon'and m.floor=1 then
 perform pg_advisory_xact_lock(hashtextextended('online-room:'||m.room_id::text,0));select snapshot into s from online_adventure_rooms where id=m.room_id for update;
 if coalesce(s#>array['springUsed',k],'[]')?m.character_id::text then raise exception 'この泉は一人一回までです。';end if;spring:=true;
 end if;end if;
 result:=online_world_pre_spring_uses(action,payload);
 if spring then
 select snapshot into s from online_adventure_rooms where id=m.room_id;
 s:=jsonb_set(s,'{springUsed}',coalesce(s->'springUsed','{}')||jsonb_build_object(k,coalesce(s#>array['springUsed',k],'[]')||jsonb_build_array(m.character_id::text)));
 update online_adventure_rooms set snapshot=s where id=m.room_id;result:=jsonb_set(result,'{adventure,snapshot}',s);
 end if;return result;
end$$;
revoke all on function online_world_pre_spring_uses(text,jsonb)from public,anon,authenticated;
revoke all on function online_world(text,jsonb)from public,anon;
grant execute on function online_world(text,jsonb)to authenticated;
notify pgrst,'reload schema';
