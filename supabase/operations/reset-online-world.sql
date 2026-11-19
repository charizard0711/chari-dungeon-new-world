-- MANUAL OPERATION, not a migration. Execute only after final deletion confirmation.
-- Scope: three existing non-anonymous email accounts and all online gameplay data.
-- Preserve anonymous ranking accounts, ranking tables, rules, catalogs and functions.
begin;
lock table public.online_profiles,public.online_characters,public.online_presence,
  public.online_messages,public.online_ground_items,public.online_training_hits
  in access exclusive mode;
do $$
begin
  if (select count(*) from auth.users where not coalesce(is_anonymous,false) and email is not null) <> 3
     or (select count(*) from public.online_profiles) <> 2
     or (select count(*) from public.online_characters) <> 2 then
    raise exception 'Online account/character counts changed. Review scope before resetting.';
  end if;
  if exists(select 1 from public.online_profiles p join auth.users u on u.id=p.user_id
            where coalesce(u.is_anonymous,false) or u.email is null) then
    raise exception 'Unexpected online identity; review scope before resetting.';
  end if;
end $$;
delete from public.online_training_hits;
delete from public.online_messages;
delete from public.online_ground_items;
delete from public.online_presence;
delete from public.online_characters;
delete from public.online_profiles;
delete from auth.users where not coalesce(is_anonymous,false) and email is not null;
select
  (select count(*) from auth.users where not coalesce(is_anonymous,false) and email is not null) as remaining_online_accounts,
  (select count(*) from public.online_characters) as remaining_characters,
  (select count(*) from public.online_profiles) as remaining_profiles;
commit;
