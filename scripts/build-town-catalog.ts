import fs from 'node:fs/promises';
import {WEAPON_DEFS,SHIELD_DEFS,ITEM_DEFS} from '../src/data';
import {PLAYER_ARMOR_DEFS} from '../src/playerAppearance';
import {NECKLACE_DEFS} from '../src/townEquipment';
import {weaponSkill} from '../src/weaponSkills';
const quote=(v:unknown)=>v===undefined||v===null?'null':typeof v==='number'?String(v):`'${String(v).replaceAll("'","''")}'`;
const prices={D:40,C:100,B:200,A:400,S:800,SS:1600,SSS:3200};
const entries=[
 ...WEAPON_DEFS.map(w=>({key:w.key,category:'weapon',grade:w.grade,dur:w.durMax,lo:w.atkMin,hi:w.atkMax,reach:w.weaponType==='bow'?3:w.weaponType==='handgun'?2:1,type:w.weaponType,price:!w.element&&!w.exclusiveLoot&&['D','C'].includes(w.grade)?prices[w.grade]:null,pool:!w.exclusiveLoot})),
 ...SHIELD_DEFS.map(w=>({key:w.key,category:'shield',grade:w.grade,dur:w.durMax,price:!w.element&&!w.exclusiveLoot&&w.grade==='D'?prices.D:null,pool:!w.exclusiveLoot})),
 ...Object.values(PLAYER_ARMOR_DEFS).map(w=>({key:'armor_'+w.key,category:'armor',grade:w.grade,dur:0,price:w.grade==='D'?40:null,pool:true})),
 ...NECKLACE_DEFS.map(w=>({key:w.key,category:'necklace',grade:w.grade,dur:0,price:w.grade==='D'?80:null,pool:true})),
 ...Object.keys(ITEM_DEFS).map(key=>({key,category:'item',grade:'D',dur:0,price:({potion:10,repair:30,skill_drink:50} as Record<string,number>)[key]??null,pool:false}))
] as {key:string;category:string;grade:string;dur:number;lo?:number;hi?:number;reach?:number;type?:string;price:number|null;pool:boolean}[];
const sql=`-- Generated from the shared game definitions by scripts/build-town-catalog.ts\ninsert into public.online_catalog(key,category,grade,dur_max,attack_min,attack_max,attack_range,weapon_type,shop_price,gacha_pool,skill) values\n`+entries.map(e=>'('+[e.key,e.category,e.grade,e.dur,e.lo,e.hi,e.reach,e.type,e.price,e.pool?'true':'false',e.type?JSON.stringify({type:e.type==='twin_daggers'?'dual_sword':e.type,...weaponSkill(e.type as any)}):null].map((v,i)=>i===9?v:quote(v)).join(',')+')').join(',\n')+`\non conflict(key) do update set category=excluded.category,grade=excluded.grade,dur_max=excluded.dur_max,attack_min=excluded.attack_min,attack_max=excluded.attack_max,attack_range=excluded.attack_range,weapon_type=excluded.weapon_type,shop_price=excluded.shop_price,gacha_pool=excluded.gacha_pool,skill=excluded.skill;\n`;
await fs.mkdir('supabase/seed',{recursive:true});await fs.writeFile('supabase/seed/town-catalog-v2.sql',sql);
await fs.mkdir('public/assets/online/equipment-v2',{recursive:true});await fs.writeFile('public/assets/online/equipment-v2/catalog.json',JSON.stringify(entries));
const migrationPath='supabase/migrations/202611200001_town_equipment_shops.sql';let migration=await fs.readFile(migrationPath,'utf8');migration=migration.replace(/\n-- BEGIN GENERATED CATALOG[\s\S]*?-- END GENERATED CATALOG\n/,'\n');migration=migration.replace(/commit;\s*$/,`-- BEGIN GENERATED CATALOG\n${sql}-- END GENERATED CATALOG\ncommit;\n`);await fs.writeFile(migrationPath,migration);
console.log(`Prepared ${entries.length} catalog entries`);
