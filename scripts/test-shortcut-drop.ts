import assert from 'node:assert/strict';
import {quickSlots,shortcutDrop} from '../src/online/quickSlots';
const potion={category:'item' as const,key:'potion'},weapon={category:'weapon' as const,key:'w_iron_dagger',instanceId:'unique-weapon'};
assert.equal(quickSlots(undefined)[0]?.key,'potion');assert.equal(quickSlots([]).length,20);assert.equal(quickSlots([])[0],null);
assert.deepEqual(shortcutDrop(3,weapon),{action:'set_quick_slot',payload:{index:3,ref:weapon}});
assert.deepEqual(shortcutDrop(19,potion,0),{action:'swap_quick_slots',payload:{from:0,to:19}});
assert.equal(shortcutDrop(2,potion,2),undefined);assert.throws(()=>shortcutDrop(20,potion,0));assert.throws(()=>shortcutDrop(2,potion,-1));
const refs=quickSlots([potion,weapon]);[refs[0],refs[1]]=[refs[1],refs[0]];assert.equal(refs[0]?.instanceId,'unique-weapon');assert.equal(refs[1]?.key,'potion');[refs[1],refs[19]]=[refs[19],refs[1]];assert.equal(refs[1],null);assert.equal(refs[19]?.key,'potion');
console.log('PASS shortcut registration vs atomic swap, same-slot no-op, empty targets, legacy defaults, exact weapon instance and slot bounds');
