import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {COSTUMES} from '../src/motionLab/wardrobe';
import {verticalAttack} from '../src/motionLab/verticalAttack';
const manifest=JSON.parse(readFileSync(new URL('../src/motionLab/wardrobe-assets.json',import.meta.url),'utf8'));
let combinations=0;
for(const costume of COSTUMES)for(const gender of ['male','female']){
 if('gender' in costume&&costume.gender!==gender)continue;
 const a=manifest[`${costume.key}_${gender}`];assert.ok(a,`${costume.key} ${gender}`);combinations++;
 for(const p of [a.path,a.arms])assert.ok(existsSync(new URL('../public'+p,import.meta.url)),p);
 assert.equal(a.directions.length,4);
 for(const r of a.directions)assert.ok(r>=0&&r<a.rows);
 if(a.rowBounds){assert.equal(a.rowBounds.length,a.rows+1);assert.ok(a.rowBounds.every((v:number,i:number)=>i===0||v>a.rowBounds[i-1]));}
}
assert.equal(combinations,18);
for(const type of ['greatsword','longsword','katana','dagger','dual_sword'])for(const back of [false,true]){
 const idle=verticalAttack(type,back,0,false),end=verticalAttack(type,back,1,true);
 assert.deepEqual(end.hand,idle.hand);assert.ok(Math.abs(end.angle-idle.angle)<1e-9);
 const shoulder=[back?5:-5,-26];let previous=idle;
 for(let i=0;i<=1000;i++){
  const p=verticalAttack(type,back,i/1000,true);
  assert.ok([...p.hand,...p.off,p.angle].every(Number.isFinite));
  assert.ok(Math.hypot(p.hand[0]-shoulder[0],p.hand[1]-shoulder[1])<19,'arm reach');
  assert.ok(Math.abs(p.angle-previous.angle)<.06,'continuous blade angle');
  previous=p;
 }
 const strike=verticalAttack(type,back,type==='greatsword'?.75:.72,true);
 assert.ok(back?Math.sin(strike.angle)<0:Math.sin(strike.angle)>0,'blade points toward the target at follow-through');
}
console.log('18 wardrobe combinations and continuous front/back melee poses passed.');
