import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const sharp=require(process.env.SHARP_MODULE||'C:/Users/masam/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const esm=code=>`data:text/javascript;base64,${Buffer.from(ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64')}`;
const framesUrl=esm(await fs.readFile('src/playerWalkFrames.ts','utf8'));
const {PLAYER_WALK_FRAMES}=await import(framesUrl);
const {PlayerAnimation}=await import(esm((await fs.readFile('src/playerAnimation.ts','utf8')).replace('./playerWalkFrames',framesUrl)));
const {SMOOTH_WALK_HAND_ANCHORS}=await import(esm(await fs.readFile('src/smoothWalkHandAnchors.ts','utf8')));
const {PLAYER_HAND_ANCHORS}=await import(esm(await fs.readFile('src/playerHandAnchors.ts','utf8')));
const animation=new PlayerAnimation();animation.play('walk1',0);
assert.equal(animation.walkFrameMs*PLAYER_WALK_FRAMES.length,288,'Original walk-cycle duration');
assert.equal(new Set(Array.from({length:288},(_,n)=>animation.sample(n))).size,18);
assert.equal(animation.sample(288),'walk1');animation.play('idle',300);assert.equal(animation.sample(300),'idle');animation.play('atkWindup',320);assert.equal(animation.sample(320),'atkWindup');assert.equal(animation.sample(350),'atkWindup2');
const manifest=JSON.parse(await fs.readFile('public/assets/characters/smooth-walk-v1/manifest.json','utf8'));
assert.equal(manifest.files.length,18);
function frame(raw,width,index){const out=Buffer.alloc(96*96*4),x=index%8*96,y=Math.floor(index/8)*96;for(let line=0;line<96;line++)raw.copy(out,line*96*4,((y+line)*width+x)*4,((y+line)*width+x+96)*4);return out;}
function sameVisible(a,b,label){for(let p=0;p<a.length;p+=4){assert.equal(b[p+3],a[p+3],label+' alpha');if(a[p+3])for(let k=0;k<3;k++)assert.equal(b[p+k],a[p+k],label+' color');}}
function difference(a,b){let d=0;for(let p=0;p<a.length;p+=4){for(let k=0;k<3;k++)d+=Math.abs(a[p+k]*a[p+3]-b[p+k]*b[p+3])/255;d+=Math.abs(a[p+3]-b[p+3]);}return d;}
for(const {id,source}of manifest.files){
 const a=await sharp('public/'+source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const b=await sharp(`public/assets/characters/smooth-walk-v1/${id}.webp`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 assert.equal(b.info.width,768);assert.equal(b.info.height,1344);
 const gender=id.startsWith('male-')?'male':'female',armor=id.slice(gender.length+1),key='player_'+id.replaceAll('-','_');
 const oldHands=PLAYER_HAND_ANCHORS[key]??PLAYER_HAND_ANCHORS[`player_${gender}_${armor.startsWith('pumpkin_')?'arcane':'leather'}`],hands=SMOOTH_WALK_HAND_ANCHORS[key];assert.equal(hands.length,112);
 for(let dir=0;dir<4;dir++){
  for(let old=0;old<16;old++){
   const next=dir*28+(old<2?old:old<8?2+(old-2)*3:20+old-8),previous=dir*16+old;
   sameVisible(frame(a.data,a.info.width,previous),frame(b.data,b.info.width,next),`${id} direction ${dir} original ${old}`);
   assert.deepEqual(hands[next],oldHands[previous]);
  }
  const poses=Array.from({length:18},(_,i)=>frame(b.data,b.info.width,dir*28+2+i));
  assert.ok(new Set(poses.map(p=>p.toString('base64'))).size>=16,`${id} has distinct in-betweens`);
  const smooth=poses.reduce((sum,p,i)=>sum+difference(p,poses[(i+1)%18]),0)/18;
  const original=Array.from({length:6},(_,i)=>frame(a.data,a.info.width,dir*16+2+i));
  const rough=original.reduce((sum,p,i)=>sum+difference(p,original[(i+1)%6]),0)/6;
  assert.ok(smooth<rough*.75,`${id} direction ${dir}: smaller visual changes per pose`);
 }
}
console.log('PASS: 18 appearance sets, all 64 original frames and hand anchors preserved, 18 distinct walking poses, lower adjacent-frame change, unchanged cycle timing and attack poses.');
