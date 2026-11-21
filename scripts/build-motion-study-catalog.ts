import fs from 'node:fs';
import {WEAPON_DEFS} from '../src/data';
import {HELD_EQUIPMENT} from '../src/equipmentAppearance';
const boot=fs.readFileSync('src/scenes/BootScene.ts','utf8');
const original=Object.fromEntries([...boot.matchAll(/(w_\w+):\s*'([^']+)'/g)].map(m=>[m[1],m[2]]));
const exists=(p:string)=>fs.existsSync('public/'+p);
const catalog=WEAPON_DEFS.map(def=>{
 const directional=HELD_EQUIPMENT.find(e=>e.itemKey===def.key);
 const paths=[`assets/online/equipment-v2/${def.key}.webp`,`assets/katana-v1/${def.key}.webp`,original[def.key],`assets/adventure-v1/${def.key}.png`,`assets/halloween-v1/${def.key}.png`].filter(Boolean);
 const base=paths.find(exists);if(!base)throw Error('Missing '+def.key);
 const icon=[`assets/art-refresh-v1/icon_${def.key}.png`,base].find(exists)!;
 const held=directional&&exists(directional.path)?directional.path:base;
 const star=[`assets/online/equipment-v2/held_star_${def.key}.png`,`assets/star-weapons-v1/star_${def.key}.webp`].find(exists);
 return {...def,icon:'/'+icon,held:'/'+held,directional:held===directional?.path,star:star?'/'+star:null,starDirectional:!!star?.includes('/held_'),starIcon:exists(`assets/online/item-icons-v3/star_${def.key}.webp`)?`/assets/online/item-icons-v3/star_${def.key}.webp`:null};
});
fs.writeFileSync('src/motionLab/weapons.json',JSON.stringify(catalog,null,2)+'\n');
console.log(`${catalog.length} weapons; ${catalog.filter(w=>w.star).length} alternate appearances; all paths exist.`);
