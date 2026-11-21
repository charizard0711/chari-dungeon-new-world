import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import catalog from '../src/motionLab/weapons.json';
import {ORIGINAL_GRIPS,rigPose,solveElbow} from '../src/motionLab/originalWeaponRig';
for(const type of Object.keys(ORIGINAL_GRIPS)){
 const weapon=catalog.find(w=>w.weaponType===type)!;
 assert(weapon&&existsSync('public'+weapon.held));
 for(let i=0;i<=100;i++){
  const p=rigPose(type,i/100,true,false);
  assert([...p.hand,...p.off,p.angle,p.lean].every(Number.isFinite));
  const shoulder:[number,number]=[2,-26],elbow=solveElbow(shoulder,p.hand,1);
  const upper=Math.hypot(elbow[0]-shoulder[0],elbow[1]-shoulder[1]);
  const lower=Math.hypot(elbow[0]-p.hand[0],elbow[1]-p.hand[1]);
  assert(Math.abs(upper-lower)<1e-8,'continuous connected two-bone arm');
  assert(Math.hypot(p.hand[0]-2,p.hand[1]+26)<18,'hand target stays within natural reach');
 }
}
const main=readFileSync('src/motionLab/main.ts','utf8');
assert(main.includes('await load(w.held)'),'render original asset path');
assert(!main.includes('/weapon-study-v3/'),'do not render redesigned replacement weapons');
assert(existsSync('public/assets/characters/weapon-rig-v4/body.png'));
assert(existsSync('public/assets/characters/weapon-rig-v4/arms.png'));
console.log('Original weapon assets, 808 rig poses, reach and arm connections passed.');
