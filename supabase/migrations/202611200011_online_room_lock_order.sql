-- Serialize one party before any member/presence writes, rather than all players.
-- All nested tick/loot/gear operations then share the same room-first lock order.
do $$
declare source text; needle text:='perform pg_advisory_xact_lock(hashtextextended(uid::text,0));';
begin
 select pg_get_functiondef('public.online_world_v7(text,jsonb)'::regprocedure) into source;
 if position('room_lock_order_v1' in source)>0 then return;end if;
 if position(needle in source)=0 then raise exception 'Expected online entry lock was not found';end if;
 source:=replace(source,needle,$patch$
 /* room_lock_order_v1 */
 perform pg_advisory_xact_lock(hashtextextended('online-room:'||lock_candidate.room_id::text,0))
 from (
  select lock_member.room_id from public.online_presence lock_presence join public.online_adventure_members lock_member on lock_member.character_id=lock_presence.character_id
   where lock_presence.user_id=uid and lock_member.finished_at is null
  union select (payload->>'room_id')::uuid where action='room_join'
 ) lock_candidate order by lock_candidate.room_id;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 $patch$);
 execute source;
end $$;
