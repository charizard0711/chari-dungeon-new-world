begin;
create or replace function online_attack_duration(cid uuid)returns numeric language sql stable security definer set search_path=public,pg_temp as $$select (case when coalesce((c.gear->>'weapon')::boolean,false) and k.weapon_type='greatsword' then 460 else 268 end)*90.0/online_weapon_speed(case when coalesce((c.gear->>'weapon')::boolean,false)then k.weapon_type end) from online_characters c left join online_catalog k on k.key=regexp_replace(c.gear->>'weapon_key','^star_','') where c.id=cid$$;
revoke all on function online_attack_duration(uuid)from public,anon,authenticated;
notify pgrst,'reload schema';commit;
