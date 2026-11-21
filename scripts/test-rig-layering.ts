import assert from 'node:assert/strict';
import {drawOriginalRig,ORIGINAL_GRIPS} from '../src/motionLab/originalWeaponRig';
const bodyImage={width:64,height:64},weapon={width:64,height:64},shield={width:32,height:32};
const body={image:bodyImage,scale:1,frames:Array.from({length:32},()=>({sx:0,sy:0,cw:64,ch:64,root:[32,60]}))};
const parts=Array.from({length:12},()=>({width:8,height:8}));
for(const type of Object.keys(ORIGINAL_GRIPS))for(const dir of ['down','up'] as const)for(let i=0;i<24;i++){
 const drawn:unknown[]=[];
 const g=new Proxy({globalAlpha:1,drawImage:(image:unknown)=>drawn.push(image)},{get:(obj,key)=>key in obj?(obj as any)[key]:()=>{}});
 drawOriginalRig(g as any,body as any,parts as any,weapon as any,type,false,dir,i/24,true,false,1,false,{verticalArt:false,shield:shield as any});
 assert.equal(drawn.filter(x=>x===bodyImage).length,1);
 assert.equal(dir==='down'?drawn[0]:drawn.at(-1),bodyImage,`${type} ${dir}: torso must be behind front gear and ahead of rear gear`);
 assert.equal(g.globalAlpha,1);
}
console.log('PASS: opaque front limbs and gear, rear torso occlusion across all weapon types and 24 attack phases.');
