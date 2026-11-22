import assert from 'node:assert/strict';
import {attackTiming,weaponAttackSpeed} from '../src/online/adventure/combatProfiles';
import {originalMuzzle} from '../src/motionLab/originalWeaponRig';
for(const type of ['bow','handgun','greatsword','longsword'] as const){const t=attackTiming(type);assert(t.windup<t.impact&&t.impact<t.duration);if(type==='bow'||type==='handgun')assert.equal(t.impact,t.windup+t.flight);}
assert(attackTiming('bow').duration>attackTiming('handgun').duration*2);
assert(attackTiming('greatsword').duration>attackTiming('handgun').duration*3);
assert(weaponAttackSpeed('handgun')>weaponAttackSpeed('bow'));
const left=originalMuzzle('handgun','left',58/268),right=originalMuzzle('handgun','right',58/268);assert.equal(left[0],-right[0]);assert.equal(left[1],right[1]);assert(right[1]<-20);
console.log('PASS shared release/impact/recovery clocks, ranged flight, weapon speed ordering and muzzle symmetry');
