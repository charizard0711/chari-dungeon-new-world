begin;
-- A town heartbeat is optional while another request holds the same player's lock.
-- Preserve the existing lock order when the player has an active adventure membership.
do $$
declare
 definition text;
 hook text := 'if p.location=''dungeon''then';
begin
 select pg_get_functiondef('public.online_world_pre_realtime_speeds(text,jsonb)'::regprocedure)
 into definition;
 if strpos(definition, 'town_poll_backpressure') > 0 then return; end if;
 if strpos(definition, hook) = 0 then raise exception 'Poll guard hook missing'; end if;
 execute replace(definition, hook, $patch$
 /* town_poll_backpressure */
 if p.location = 'town' and not exists (
  select 1 from public.online_adventure_members member
  where member.character_id = p.character_id and member.finished_at is null
 ) then
  if not pg_try_advisory_xact_lock(hashtextextended(auth.uid()::text, 0)) then
   return jsonb_build_object('pollDeferred', true);
  end if;
 end if;
 if p.location='dungeon'then$patch$);
end$$;

-- Sign-in only needs the signed-in user's character cards. Avoid the shared
-- world snapshot, presence heartbeat, and inventory repair in this read.
create function public.online_lobby_characters() returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then
  raise exception 'ログインしてください。';
 end if;
 return coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',c.id,'slot',c.slot,'name',c.name,'gender',c.gender,'hp',c.hp,
   'gear',c.gear,'hair_color',coalesce(c.hair_color,'brown'),'inventory','{}'::jsonb
  ) order by c.slot)
  from public.online_characters c where c.user_id=uid
 ),'[]'::jsonb);
end$$;
revoke all on function public.online_lobby_characters() from public,anon;
grant execute on function public.online_lobby_characters() to authenticated;
notify pgrst,'reload schema';
commit;
