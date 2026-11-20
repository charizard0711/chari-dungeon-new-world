import fs from 'node:fs';import {HOUSES} from '../src/online/housingCatalog';
const path='supabase/migrations/202611210004_online_housing.sql',sql=fs.readFileSync(path,'utf8');
const marker='-- HOUSE_CATALOG_DATA',end='-- END_HOUSE_CATALOG_DATA';
const insert='insert into public.online_house_catalog(id,data)values\n'+HOUSES.map(h=>`('${h.id}','${JSON.stringify(h).replaceAll("'","''")}'::jsonb)`).join(',\n')+';';
const from=sql.indexOf(marker),to=sql.includes(end)?sql.indexOf(end)+end.length:from+marker.length;
fs.writeFileSync(path,sql.slice(0,from)+marker+'\n'+insert+'\n'+end+sql.slice(to));
