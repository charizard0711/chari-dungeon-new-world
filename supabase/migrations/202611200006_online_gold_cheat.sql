begin;
alter function public.online_world(text,jsonb) rename to online_world_adventures;
revoke all on function public.online_world_adventures(text,jsonb) from public,anon,authenticated;
create function public.online_world(action text,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();cid uuid;amount bigint;
begin
 if action='claim_gold' then
  if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,true) then raise exception 'ログインしてください。';end if;
  perform pg_advisory_xact_lock(71390119);perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  if not exists(select 1 from online_profiles where user_id=uid and super_account) then raise exception 'スーパーアカウント専用です。';end if;
  select c.id into cid from online_characters c join online_presence p on p.character_id=c.id where p.user_id=uid and c.user_id=uid and c.catalog_unlocked for update of c;
  if cid is null then raise exception '設定からチートのアイテム一覧を開いてください。';end if;
  if coalesce(payload->>'amount','')!~'^[0-9]{1,7}$' then raise exception '1〜1,000,000 Gで指定してください。';end if;
  amount:=(payload->>'amount')::bigint;
  if amount<1 or amount>1000000 then raise exception '1〜1,000,000 Gで指定してください。';end if;
  if (select gold::bigint+amount from online_characters where id=cid)>2147483647 then raise exception '所持金の上限です。';end if;
  update online_characters set gold=gold+amount::integer where id=cid;
  return public.online_world_adventures('poll','{}');
 end if;
 return public.online_world_adventures(action,payload);
end$$;
revoke all on function public.online_world(text,jsonb) from public,anon;
grant execute on function public.online_world(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
