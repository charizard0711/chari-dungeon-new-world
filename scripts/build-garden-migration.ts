import fs from 'node:fs/promises';
import {townBlocked,TOWN_MIN_X,TOWN_MAX_X,TOWN_MIN_Y,TOWN_MAX_Y} from '../src/online/townLayout';
import {HOUSES} from '../src/online/housingCatalog';
const rows=[];for(let y=TOWN_MIN_Y;y<=TOWN_MAX_Y;y++){let row='';for(let x=TOWN_MIN_X;x<=TOWN_MAX_X;x++)row+=townBlocked(x,y)?'#':'.';rows.push(row);}
let sql=`begin;
select pg_advisory_xact_lock(71390119);
-- Generated from gardenMap.ts and plaza footprints; never change saved ownership/interiors.
create or replace function public.online_town_blocked(x int,y int)returns boolean language sql immutable security definer set search_path=public,pg_temp as $$
 select case when x<${TOWN_MIN_X} or x>${TOWN_MAX_X} or y<${TOWN_MIN_Y} or y>${TOWN_MAX_Y} then true else
 substring((array[${rows.map(r=>`'${r}'`).join(',\n')}])[y-(${TOWN_MIN_Y})+1] from x-(${TOWN_MIN_X})+1 for 1)='#' end;
$$;
revoke all on function public.online_town_blocked(int,int) from public,anon,authenticated;
`;
for(const h of HOUSES){const {x,y,w,doorX,doorY,plotX,plotY,art}=h;sql+=`update public.online_house_catalog set data=data||'${JSON.stringify({x,y,w,h:h.h,doorX,doorY,plotX,plotY,art})}'::jsonb where id='${h.id}';\n`;}
const changes:Record<string,[string,string][]>={
 online_attack_tiles:[['nx=12 and ny=5','nx=22 and ny=13']],
 online_world_core:[['tile_x=12 and tile_y=5','tile_x=22 and tile_y=13'],['dx:=12-r.x;dy:=5-r.y','dx:=22-r.x;dy:=13-r.y']],
 online_world_equipment:[['abs(r.x-18)+abs(r.y-9)','abs(r.x-18)+abs(r.y-4)'],['abs(r.x-7)+abs(r.y-9)','abs(r.x-2)+abs(r.y-13)']],
 online_world_pre_gardens:[['abs(p.x-16)+abs(p.y-2)','abs(p.x-7)+abs(p.y-3)']],
 online_world_pre_guild_flags:[['abs(p.x-16)+abs(p.y-2)','abs(p.x-7)+abs(p.y-3)']],
 online_world_pre_resale:[['abs(pres.x-8)+abs(pres.y-17)','abs(pres.x-7)+abs(pres.y-18)']],
 online_world_warehouse:[["when 'merchant' then 9 end","when 'merchant' then 4 end"],['abs(r.x-20)+abs(r.y-5)>2 or r.y<5','abs(r.x-22)+abs(r.y-3)>2 or r.y<3'],['generate_series(6,17)','generate_series(4,17)'],['abs(x-20)+abs(y-6)','abs(x-22)+abs(y-4)']],
};
const quote=(s:string)=>"'"+s.replaceAll("'","''")+"'";
for(const [name,pairs]of Object.entries(changes)){
 sql+=`do $patch$ declare definition text;begin\nselect pg_get_functiondef(oid)into strict definition from pg_proc where pronamespace='public'::regnamespace and proname='${name}';\n`;
 for(const [a,b]of pairs)sql+=`if position(${quote(a)} in definition)=0 then raise exception 'Missing expected layout guard in ${name}';end if;\ndefinition:=replace(definition,${quote(a)},${quote(b)});\n`;
 sql+='execute definition;end $patch$;\n';
}
sql+=`-- Exit at the relocated home, retaining room positions and permissions.
update public.online_house_visits v set return_x=(c.data->>'doorX')::int,return_y=(c.data->>'doorY')::int+1 from public.online_house_catalog c where c.id=v.house_id;
-- Relocate only occupants/loot newly inside walls or outside the new bounds.
do $$declare p record;nx int;ny int;begin
 for p in select user_id,x,y from public.online_presence where location='town'and public.online_town_blocked(x,y)loop
  select tile_x,tile_y into nx,ny from public.online_free_town_tile(p.x,p.y,p.user_id);
  if nx is null then raise exception 'No free town tile for relocation';end if;
  update public.online_presence set x=nx,y=ny,moved_at='epoch'where user_id=p.user_id;
 end loop;
 for p in select id,dropped_by,x,y from public.online_ground_items where public.online_town_blocked(x,y)loop
  select tile_x,tile_y into nx,ny from public.online_free_town_tile(p.x,p.y,p.dropped_by);
  if nx is null then raise exception 'No free town tile for dropped item';end if;
  update public.online_ground_items set x=nx,y=ny where id=p.id;
 end loop;
end$$;
notify pgrst,'reload schema';
commit;
`;
await fs.writeFile('supabase/migrations/202611210012_online_garden_town.sql',sql);
console.log('Generated garden collision/catalog/service migration',rows.length,'rows',HOUSES.length,'houses');
