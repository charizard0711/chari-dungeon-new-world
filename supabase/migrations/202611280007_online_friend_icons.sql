begin;
alter table public.online_characters add column friend_icon text;
create index if not exists online_friendships_requester_idx on public.online_friendships(requester);
create index if not exists online_friendships_recipient_idx on public.online_friendships(recipient);

create function public.online_friend_icons(action text, icon text default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 uid uuid:=auth.uid();
 active public.online_characters;
 icons jsonb;
begin
 if uid is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then
  raise exception 'ログインしてください。';
 end if;
 select c.* into active from online_presence p join online_characters c
  on c.id=p.character_id and c.user_id=p.user_id where p.user_id=uid;
 if active.id is null then raise exception 'キャラクターで入場してください。';end if;
 if action='save' then
  select * into active from online_characters where id=active.id and user_id=uid for update;
  if icon is not null and (length(icon)>100 or not exists(
   select 1 from jsonb_each(coalesce(active.equipment,'{}')) as slots(slot,items)
   where slot in ('weapon','armor','shield','necklace','boots','gloves') and items ? icon
  )) then raise exception '所持している装備から選んでください。';end if;
  update online_characters set friend_icon=icon where id=active.id returning * into active;
 elsif action<>'list' or action is null then
  raise exception '操作が見つかりません。';
 end if;
 select coalesce(jsonb_object_agg(f.id,chosen.friend_icon) filter(where chosen.friend_icon is not null),'{}')
 into icons from online_friendships f
 join lateral (
   select c.friend_icon from online_characters c
   left join online_presence p on p.user_id=c.user_id and p.character_id=c.id and p.seen_at>now()-interval '20 seconds'
   where c.user_id=case when f.requester=uid then f.recipient else f.requester end
   order by (p.user_id is not null) desc,c.slot limit 1
 ) chosen on true
 where uid in(f.requester,f.recipient);
 return jsonb_build_object('characterId',active.id,'selected',active.friend_icon,'friends',icons);
end$$;
revoke all on function public.online_friend_icons(text,text) from public,anon;
grant execute on function public.online_friend_icons(text,text) to authenticated;
notify pgrst,'reload schema';
commit;
