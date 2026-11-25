-- Contention is a retryable response, not an 800ms blocking wait / HTTP 500.
-- Acquire neither user nor room locks by waiting while another game request is active.
do $$declare s text;busy text;begin
select pg_get_functiondef('online_dungeon_walk(jsonb)'::regprocedure)into s;
busy:='return jsonb_build_object(''deferred'',true,''ack'',jsonb_build_object(''sequence'',seq,''accepted'',0,''stopped'',false,''retryAfterMs'',120));';
if position('perform pg_advisory_xact_lock(hashtextextended(uid::text,0));'in s)=0 then raise exception 'Motion user-lock hook missing';end if;
s:=replace(s,'perform pg_advisory_xact_lock(hashtextextended(uid::text,0));','if not pg_try_advisory_xact_lock(hashtextextended(uid::text,0))then '||busy||'end if;');
s:=replace(s,'perform pg_advisory_xact_lock(hashtextextended(''online-room:''||m.room_id::text,0));','if not pg_try_advisory_xact_lock(hashtextextended(''online-room:''||m.room_id::text,0))then '||busy||'end if;');
-- Older clients may increment their sequence after a deferred response. Skipped IDs
-- are safe: cardinal collision checks and server time still validate every square.
s:=replace(s,'if seq<>channel.sequence+1 then','if seq<channel.sequence then');execute s;
end$$;
notify pgrst,'reload schema';
