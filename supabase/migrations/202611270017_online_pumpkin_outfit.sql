begin;
-- Keep the IDs, durability and location of both legacy outfits when normalizing their keys.
create function public.online_pumpkin_key(k text)returns text
language sql immutable set search_path=public,pg_temp as $$
 select regexp_replace(k,'^((?:star_)?(?:armor_)?pumpkin)_(male|female)$','\1')
$$;
create function public.online_pumpkin_json(data jsonb)returns jsonb
language sql immutable set search_path=public,pg_temp as $$
 select regexp_replace(data::text,'"((?:star_)?(?:armor_)?pumpkin)_(male|female)"','"\1"','g')::jsonb
$$;
revoke all on function public.online_pumpkin_key(text),public.online_pumpkin_json(jsonb) from public,anon,authenticated;

insert into public.online_catalog(key,category,grade,def_bonus,dur_max,gacha_pool)
values('armor_pumpkin','armor','A',8,0,true);
update public.online_catalog set gacha_pool=false,shop_price=null
where key in('armor_pumpkin_male','armor_pumpkin_female');

do $$
declare
 definition text:=pg_get_functiondef('public.online_give_equipment(uuid,text,boolean)'::regprocedure);
 old_lookup text:='from public.online_catalog where key=item_key;';
begin
 if strpos(definition,old_lookup)=0 then raise exception 'Pumpkin grant lookup missing';end if;
 execute replace(definition,old_lookup,'from public.online_catalog where key=online_pumpkin_key(item_key);');
end$$;

update public.online_characters
set gear=online_pumpkin_json(gear),equipment=online_pumpkin_json(equipment),
    instances=online_pumpkin_json(instances),quick_slots=online_pumpkin_json(quick_slots),
    warehouse=online_pumpkin_json(warehouse)
where concat(gear,equipment,instances,quick_slots,warehouse)~'"(?:star_)?(?:armor_)?pumpkin_(male|female)"';
update public.online_ground_items set kind=online_pumpkin_key(kind),equipment_state=online_pumpkin_json(equipment_state)
where category='armor' and kind<>online_pumpkin_key(kind);
update public.online_adventure_loot set kind=online_pumpkin_key(kind),equipment_state=online_pumpkin_json(equipment_state)
where category='armor' and kind<>online_pumpkin_key(kind);
update public.online_market_listings set item_key=online_pumpkin_key(item_key),item_state=online_pumpkin_json(item_state)
where category='armor' and item_key<>online_pumpkin_key(item_key);
commit;
