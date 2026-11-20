import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {WEAPON_DEFS,SHIELD_DEFS,ELEMENT_INFO,elementMultiplier} from '../src/data';
import {NECKLACE_DEFS,expansionEquipmentKey} from '../src/townEquipment';
assert.deepEqual(NECKLACE_DEFS.map(n=>n.grade),['D','C','B','A','S','SS','SSS']);
const baseWeapons=WEAPON_DEFS.filter(w=>w.element&&!expansionEquipmentKey(w.key));
const pairs=new Set(baseWeapons.map(w=>w.weaponType+':'+w.grade));
const added=WEAPON_DEFS.filter(w=>expansionEquipmentKey(w.key));assert.equal(added.length,pairs.size*2);
for(const element of ['light','dark'] as const){
 for(const pair of pairs){const [type,grade]=pair.split(':');const w=added.find(w=>w.element===element&&w.weaponType===type&&w.grade===grade);assert.ok(w,pair+' '+element);assert.ok(baseWeapons.some(b=>b.weaponType===type&&b.grade===grade&&b.atkMin===w.atkMin&&b.atkMax===w.atkMax&&b.durMax===w.durMax));}
 const grades=new Set(SHIELD_DEFS.filter(s=>s.element&&!expansionEquipmentKey(s.key)).map(s=>s.grade));
 for(const grade of grades)assert.ok(SHIELD_DEFS.some(s=>s.element===element&&s.grade===grade));
 assert.ok(ELEMENT_INFO[element]);
}
assert.equal(elementMultiplier('light','dark'),1.5);assert.equal(elementMultiplier('dark','light'),1.5);assert.equal(elementMultiplier('dark','dark'),.75);
for(const item of [...added,...SHIELD_DEFS.filter(s=>expansionEquipmentKey(s.key)),...NECKLACE_DEFS]){
 await fs.access(`public/assets/online/equipment-v2/${item.key}.webp`);
 if('weaponType'in item){await fs.access(`public/assets/online/equipment-v2/held_star_${item.key}.png`);await fs.access(`public/assets/online/equipment-v2/held_${item.key}.png`);await fs.access(`public/assets/online/equipment-v2/star_${item.key}.webp`);if(item.weaponType==='bow')await fs.access(`public/assets/online/equipment-v2/arrow_${item.key}.webp`);if(item.weaponType==='katana')for(const prefix of ['','star_'])await fs.access(`public/assets/online/equipment-v2/sheath_${prefix}${item.key}.webp`);}
}
console.log(`PASS: seven necklace ranks, ${added.length} light/dark weapons match every existing elemental type/rank, matching shield tiers, reciprocal light/dark affinities, and all consumable icon/held/star/accessory files.`);
