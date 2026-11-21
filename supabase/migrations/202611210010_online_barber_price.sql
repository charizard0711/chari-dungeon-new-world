begin;
-- Replace the existing hair wrapper without bypassing subsequent house/guild wrappers.
create or replace function public.online_world_pre_resale(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;chosen text;cid uuid;before_ids uuid[];ch public.online_characters;pres public.online_presence;begin
 if auth.uid() is null then raise exception 'ログインしてください。';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 if action='appearance_hair' then
  if auth.uid() is null then raise exception 'ログインしてください。';end if;
  chosen:=payload->>'hair_color';cid:=(payload->>'character_id')::uuid;
  if chosen is null or chosen not in('brown','black','silver','gold','red','blue')then raise exception '髪色が正しくありません。';end if;
  select * into pres from public.online_presence where user_id=auth.uid() for update;
  select * into ch from public.online_characters where id=cid and user_id=auth.uid() for update;
  if ch.id is null or pres.character_id is distinct from cid or pres.location is distinct from 'town' or abs(pres.x-8)+abs(pres.y-17)>2 then raise exception '南門の床屋に近づいてください。';end if;
  if ch.hair_color is distinct from chosen then
   if ch.gold<1000 then raise exception '髪色の変更には1,000G必要です。';end if;
   update public.online_characters set hair_color=chosen,gold=gold-1000 where id=cid;
  end if;
  result:=public.online_world_pre_character_hair('list','{}');
 elsif action='create_character' then
  chosen:=coalesce(payload->>'hair_color','brown');
  if chosen not in('brown','black','silver','gold','red','blue') then raise exception '髪色が正しくありません。';end if;
  select coalesce(array_agg(id),'{}') into before_ids from public.online_characters where user_id=auth.uid();
  result:=public.online_world_pre_character_hair(action,payload);
  update public.online_characters set hair_color=chosen where user_id=auth.uid() and not(id=any(before_ids));
 else
  result:=public.online_world_pre_character_hair(action,payload);
 end if;
 result:=jsonb_set(result,'{players}',coalesce((select jsonb_agg(p||jsonb_build_object('hair_color',coalesce(c.hair_color,'brown')))from jsonb_array_elements(coalesce(result->'players','[]'))p left join public.online_characters c on c.id::text=p->>'character_id'),'[]'));
 result:=jsonb_set(result,'{characters}',coalesce((select jsonb_agg(p||jsonb_build_object('hair_color',coalesce(c.hair_color,'brown')))from jsonb_array_elements(coalesce(result->'characters','[]'))p left join public.online_characters c on c.id::text=p->>'id'),'[]'));
 if result->'active' is not null and result->'active'<>'null'::jsonb then
  result:=jsonb_set(result,'{active,hair_color}',to_jsonb(coalesce((select hair_color from public.online_characters where id::text=result->'active'->>'id'),'brown')));
 end if;
 return result;
end$$;
revoke all on function public.online_world_pre_resale(text,jsonb) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
