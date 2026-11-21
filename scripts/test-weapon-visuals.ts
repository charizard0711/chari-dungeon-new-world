import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import weapons from '../src/motionLab/weapons.json';
import directions from '../src/motionLab/weapon-directions.json';
import {registerWeaponPixels} from '../src/motionLab/weaponVisuals';
for(const w of weapons){
 for(const path of [w.icon,w.starIcon,w.held,w.star])assert(existsSync('public'+path),w.key+' missing '+path);
 if(['bow','handgun'].includes(w.weaponType)){const d=(directions as any)[w.key];assert(d&&existsSync('public'+d.path));assert(d.row>=0&&d.row<d.rows);}
}
// A shifted/padded image must attach to the same physical point, not the image centre.
function pixels(pad:number){const size=100+pad*2,d=new Uint8ClampedArray(size*size*4);for(let y=10;y<90;y++)for(let x=47;x<53;x++)d[((y+pad)*size+x+pad)*4+3]=255;return {d,size};}
const a=pixels(0),b=pixels(31),x=registerWeaponPixels(a.d,a.size,a.size,'longsword'),y=registerWeaponPixels(b.d,b.size,b.size,'longsword');
assert(Math.abs(x.grip[0]*a.size+31-y.grip[0]*b.size)<.01);
assert(Math.abs(x.grip[1]*a.size+31-y.grip[1]*b.size)<.01);
assert(Math.abs(x.basis+Math.PI/2)<.001);
assert(x.grip[1]>.7&&x.grip[1]<.9);
assert.throws(()=>registerWeaponPixels(new Uint8ClampedArray(16),2,2,'dagger'));
for(const file of ['src/motionLab/main.ts','src/online/characterRig.ts','src/online/characterPreview.ts'])assert(readFileSync(file,'utf8').includes('loadWeaponVisual'));
console.log('PASS: 103 normal/rare weapon sources, all ranged direction mappings, padding-invariant grip/axis registration and shared renderer integration.');
