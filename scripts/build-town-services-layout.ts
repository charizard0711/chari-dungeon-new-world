import fs from 'node:fs/promises';
import {townBlocked,TOWN_MIN_X,TOWN_MAX_X,TOWN_MIN_Y,TOWN_MAX_Y} from '../src/online/townLayout';

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
const changes:Record<string,[string,string][]>={online_attack_tiles:[['nx=22 and ny=13','nx=8 and ny=9']],online_world_core:[['tile_x=22 and tile_y=13','tile_x=8 and tile_y=9'],['dx:=22-r.x;dy:=13-r.y','dx:=8-r.x;dy:=9-r.y']]};
const quote=(s:string)=>"'"+s.replaceAll("'","''")+"'";
for(const [name,pairs]of Object.entries(changes)){
 sql+=`do $patch$ declare definition text;begin\nselect pg_get_functiondef(oid)into strict definition from pg_proc where pronamespace='public'::regnamespace and proname='${name}';\n`;
 for(const [a,b]of pairs)sql+=`if position(${quote(a)} in definition)=0 then raise exception 'Missing expected layout guard in ${name}';end if;\ndefinition:=replace(definition,${quote(a)},${quote(b)});\n`;
 sql+='execute definition;end $patch$;\n';
}
sql+=`-- Relocate only occupants/loot newly inside walls or outside the new bounds.
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
await fs.writeFile('supabase/migrations/202611210014_online_town_services_layout.sql',sql);
console.log('Generated updated plaza services collision');
