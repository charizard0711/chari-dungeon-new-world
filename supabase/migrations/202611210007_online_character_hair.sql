begin;
alter table public.online_characters add column hair_color text not null default 'brown' check(hair_color in('brown','black','silver','gold','red','blue'));
alter function public.online_world(text,jsonb) rename to online_world_pre_character_hair;
revoke all on function public.online_world_pre_character_hair(text,jsonb) from public,anon,authenticated;
create function public.online_world(action text,payload jsonb default '{}')returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;chosen text;cid uuid;begin
 if action='appearance_hair' then
  if auth.uid() is null then raise exception 'ログインしてください。';end if;
  chosen:=payload->>'hair_color';cid:=(payload->>'character_id')::uuid;
  if chosen is null or chosen not in('brown','black','silver','gold','red','blue')then raise exception '髪色が正しくありません。';end if;
  update public.online_characters set hair_color=chosen where id=cid and user_id=auth.uid();
  if not found then raise exception '自分のキャラクターを選んでください。';end if;
  result:=public.online_world_pre_character_hair('list','{}');
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
revoke all on function public.online_world(text,jsonb) from public,anon;
grant execute on function public.online_world(text,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
