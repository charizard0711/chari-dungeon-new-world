import {Audio} from '../../audio/manager';
import {actionSoundVolume,playBossStab} from '../actionAudio';
import type {AdventureSnapshot} from './types';
import {railNow} from './railway';

const TILE=48;

export function mountArenaCombatEffects(scene:any){
 const fx=scene.add.graphics().setDepth(106);
 const sounded=new Set<string>();
 const playOnce=(key:string,fn:()=>void)=>{
  if(sounded.has(key))return;
  sounded.add(key);
  if(sounded.size>16)sounded.delete(sounded.values().next().value!);
  fn();
 };
 function drawSmash(smash:NonNullable<NonNullable<AdventureSnapshot['bossEncounter']>['smash']>,now:number){
  const age=now-smash.at;
  if(age<0||age>=smash.duration)return;
  const x=(smash.x+.5)*TILE,y=(smash.y+.86)*TILE;
  if(age<1800){
   const charge=Math.min(1,age/1350),pulse=.7+.3*Math.sin(age*.027);
   const ax=x-23+charge*10,ay=y-55-charge*28;
   for(const [width,color,alpha] of [[21,0x6537e9,.2],[9,0xbe86ff,.58],[3,0xffefff,.92]])
    fx.lineStyle(width,color,alpha*charge*pulse).lineBetween(ax,ay,ax+7,ay-27);
   fx.fillStyle(0xfef4ff,charge*pulse).fillCircle(ax+7,ay-27,4+charge*3);
   fx.lineStyle(2,0xf2c7ff,.65*charge).lineBetween(ax-17,ay-21,ax+26,ay-33).lineBetween(ax+4,ay-43,ax+10,ay-9);
   for(const tile of smash.tiles){
    const px=tile.x*TILE,py=tile.y*TILE;
    fx.fillStyle(0x8d30d3,.16*charge).fillRect(px+2,py+2,TILE-4,TILE-4);
    fx.lineStyle(2,0xeec4ff,.55*pulse).strokeRect(px+3,py+3,TILE-6,TILE-6);
   }
  }else{
   const t=Math.min(1,(age-1800)/780),fade=1-t;
   if(age<2080)playOnce('smash:'+smash.at,()=>{scene.cameras.main.shake(210,.003);playBossStab(scene);});
   for(const [width,color,alpha] of [[11,0xb33ef5,.3],[3,0xf2cbff,.9]])
    fx.lineStyle(width,color,alpha*fade).strokeEllipse(x,y+9,42+t*313,12+t*112);
   for(let i=0;i<24;i++){
    const a=i*2.39996,d=20+t*(63+i%6*16),lift=Math.sin(t*Math.PI)*(22+i%5*8);
    fx.fillStyle(i%3?0xc480ff:0xffefff,fade*.76).fillTriangle(x+Math.cos(a)*d,y+Math.sin(a)*d*.55-lift,x+Math.cos(a)*d+6,y+Math.sin(a)*d*.55-lift+3,x+Math.cos(a)*d+1,y+Math.sin(a)*d*.55-lift-5);
   }
  }
 }
 function drawBlast(x:number,y:number,age:number){
  const t=age/880,fade=1-t,spread=1-Math.pow(fade,3);
  fx.fillStyle(0xff912c,.15*fade).fillEllipse(x,y,42+spread*210,25+spread*147);
  for(let i=0;i<3;i++){
   const travel=Math.max(0,Math.min(1,t*1.65-i*.15));
   fx.lineStyle(8-i*2,i===0?0xff7624:0xffd987,(1-travel)*.83).strokeEllipse(x,y,32+travel*260,18+travel*164);
  }
  for(let i=0;i<22;i++){
   const a=i*2.39996,d=spread*(24+(i%6)*13);
   const px=x+Math.cos(a)*d,py=y+Math.sin(a)*d*.54-Math.sin(t*Math.PI)*(15+i%5*9);
   fx.fillStyle(i%3?0x392a29:0x6b3c23,.42*fade).fillCircle(px,py,5+t*(11+i%6));
   if(t<.65)fx.fillStyle(i%3?0xf28925:0xffe189,(1-t/.65)*.59).fillCircle(px,py+3,8+spread*(i%5)*3);
  }
  if(t<.32){
   const alpha=(1-t/.32)*.93;
   fx.fillStyle(0xff8a2b,alpha*.87).fillEllipse(x,y-15,42+spread*123,46+spread*106);
   fx.fillStyle(0xffd25e,alpha).fillEllipse(x,y-22,38+spread*66,38+spread*72);
   fx.fillStyle(0xfff8da,alpha).fillEllipse(x,y-26,29+spread*44,36+spread*55);
  }
  for(let i=0;i<32;i++){
   const a=i*2.39996,d=13+spread*(30+i%9*11);
   const py=y+Math.sin(a)*d*.63-Math.sin(t*Math.PI)*(11+i%5*10),px=x+Math.cos(a)*d;
   fx.lineStyle(1+i%3,i%3===0?0xffe99c:0xff8a34,fade*.84).lineBetween(px,py,px-Math.cos(a)*11*fade,py-Math.sin(a)*8*fade);
  }
 }
 return {update(arena:boolean,belongs:(x:number,y:number)=>boolean){
  fx.clear();
  const a=scene.packet.adventure;if(!a)return;
  const s:AdventureSnapshot=a.snapshot,now=railNow(scene);
  const smash=s.bossEncounter?.smash;
  if(arena&&s.bossEncounter?.phase==='battle'&&smash)drawSmash(smash,now);
  for(const blast of s.blasts??[]){
   const age=now-blast.at;
   if(blast.floor!==a.floor||age<0||age>=880||!belongs(blast.x,blast.y))continue;
   const near=Math.abs(blast.x-scene.player.x)+Math.abs(blast.y-scene.player.y);
   if(near>10)continue;
   if(age<300)playOnce(blast.actor+':'+blast.at,()=>{
    if(near<=5)scene.cameras.main.shake(220,near<=2?.008:.004);
    if(actionSoundVolume(scene)>0)void Audio.playSe('dynamite');
   });
   drawBlast((blast.x+.5)*TILE,(blast.y+.58)*TILE,age);
  }
 },destroy(){fx.destroy();}};
}
