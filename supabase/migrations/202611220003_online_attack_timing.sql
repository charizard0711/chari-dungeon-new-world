begin;
create or replace function online_weapon_speed(k text)returns int language sql immutable as $$select coalesce(('{"dagger":120,"twin_daggers":115,"dual_sword":105,"katana":100,"longsword":90,"lance":80,"bow":45,"handgun":135,"greatsword":40}'::jsonb->>k)::int,90)$$;
create or replace function online_attack_duration(cid uuid)returns numeric language sql stable security definer set search_path=public,pg_temp as $$select (case when c.gear->>'weapon_key'='w_hero_sword' then 460 else 268 end)*90.0/online_weapon_speed(case when coalesce((c.gear->>'weapon')::boolean,false)then k.weapon_type end) from online_characters c left join online_catalog k on k.key=regexp_replace(c.gear->>'weapon_key','^star_','') where c.id=cid$$;
do $$declare src text;begin
select pg_get_functiondef('public.online_world_adventures(text,jsonb)'::regprocedure)into src;
if position('interval ''260 milliseconds'''in src)=0 then raise exception 'Attack duration hook missing';end if;
src:=replace(src,'interval ''260 milliseconds''','(online_attack_duration(c.id)*interval ''1 millisecond'')');
if position('n:=online_turn_damage(n,enemy,kind);'in src)=0 then raise exception 'Damage hook missing';end if;
src:=replace(src,'n:=online_turn_damage(n,enemy,kind);','if attack_type=''handgun'' then n:=greatest(1,round(n*.7)::int);end if;n:=online_turn_damage(n,enemy,kind);');execute src;
end$$;
revoke all on function online_attack_duration(uuid),online_weapon_speed(text)from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
