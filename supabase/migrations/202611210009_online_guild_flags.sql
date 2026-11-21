begin;
alter table public.online_guilds add column flag smallint not null default 1 check(flag between 1 and 10);
alter function public.online_world(text,jsonb) rename to online_world_pre_guild_flags;
revoke all on function public.online_world_pre_guild_flags(text,jsonb) from public,anon,authenticated;
create function public.online_world(action text,payload jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;cid uuid;gid uuid;chosen int;
begin
 if action in('guild_flag','guild_create') then
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'ログインしてください。';end if;
  chosen:=coalesce((payload->>'flag')::int,1);
  if chosen not between 1 and 10 then raise exception '旗は10種類から選んでください。';end if;
  perform pg_advisory_xact_lock(71390119);
  select c.id into cid from online_characters c join online_presence p on p.character_id=c.id where c.user_id=auth.uid() and p.user_id=auth.uid();
  if cid is null then raise exception 'キャラクターで入場してください。';end if;
  if action='guild_create' then result:=online_world_pre_guild_flags(action,payload);end if;
  select id into gid from online_guilds where owner_character_id=cid for update;
  if gid is null then raise exception 'ギルドマスターだけが旗を変更できます。';end if;
  update online_guilds set flag=chosen where id=gid;
  result:=online_world_pre_guild_flags('poll','{}');
 else result:=online_world_pre_guild_flags(action,payload);end if;
 result:=jsonb_set(result,'{players}',coalesce((select jsonb_agg(p||jsonb_build_object('guild_flag',g.flag,'guild_name',g.name)) from jsonb_array_elements(coalesce(result->'players','[]'))p left join online_guild_members m on m.character_id::text=p->>'character_id' left join online_guilds g on g.id=m.guild_id),'[]'));
 if result->'guild'->>'id' is not null then
  result:=jsonb_set(result,'{guild,flag}',to_jsonb((select flag from online_guilds where id::text=result->'guild'->>'id')));
 end if;
 if result->'inspection'->'guild'->>'id' is not null then
  result:=jsonb_set(result,'{inspection,guild,flag}',to_jsonb((select flag from online_guilds where id::text=result->'inspection'->'guild'->>'id')));
 end if;
 return result;
end$$;
revoke all on function public.online_world(text,jsonb) from public,anon;
grant execute on function public.online_world(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
