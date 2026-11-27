import type Phaser from 'phaser';
import {ELEMENT_INFO,MONSTER_DEFS,monsterElement} from '../../data';
import type {Element} from '../../types';
import {actionSoundVolume} from '../actionAudio';

const elements=['fire','thunder','water','ice','light','dark'] as const;
const monsterColors=new Map(MONSTER_DEFS.map(def=>[def.key,monsterElement(def)]));
const shades:Record<Element,number>={fire:0xffd475,thunder:0xfffcdf,water:0xcbf6ff,ice:0xeaFFFF,light:0xffffff,dark:0xdab7ff};
const cue=(element:Element)=>'element_impact_'+element;
export function enemyAttackElement(enemy?:{key:string;element?:Element|null}){
 if(!enemy||enemy.element===null)return undefined;
 return enemy.element??monsterColors.get(enemy.key);
}
export function preloadElementImpacts(scene:Phaser.Scene){
 for(const e of elements)if(!scene.cache.audio.exists(cue(e)))scene.load.audio(cue(e),`assets/online/action-audio-v1/element-hit-${e}.wav`);
}

type Impact={element:Element;x:number;y:number;angle:number;size:number;at:number};
const headings:Record<string,number>={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2};
const ttl=330;
export function mountElementImpacts(scene:Phaser.Scene){
 const g=scene.add.graphics().setDepth(119),hits:Impact[]=[],lastSound=new Map<Element,number>();
 const draw=(time:number)=>{
  if(!hits.length)return;
  g.clear();
  while(hits.length&&time-hits[0].at>=ttl)hits.shift();
  for(const hit of hits){
   const {element,x,y,angle,size}=hit,p=Math.max(0,(time-hit.at)/ttl),fade=(1-p)**1.5;
   const color=ELEMENT_INFO[element].color,shine=shades[element];
   if(element==='water'||element==='light'||element==='dark'){
    const radius=size*(.34+p*1.08);
    g.lineStyle((element==='dark'?4:2)*fade,color,fade*.85).strokeEllipse(x,y+5,radius*2,radius*1.06);
   }
   for(let i=0;i<7;i++){
    const a=angle+i*2.39996,dist=size*(.16+(i%3)*.13+p*.86);
    const px=x+Math.cos(a)*dist,py=y+Math.sin(a)*dist*.7;
    g.fillStyle(color,fade*.93);
    if(element==='fire'){
     const lift=py-size*p*.45;
     g.fillTriangle(px-4*fade,lift+5,px+3*fade,lift+4,px+2,lift-8*fade);
     g.fillStyle(shine,fade*.88).fillCircle(px,lift+2,1.7);
    }else if(element==='thunder'){
     g.lineStyle(3*fade,color,fade).beginPath().moveTo(x,y).lineTo(x+(px-x)*.45+4, y+(py-y)*.44).lineTo(x+(px-x)*.62-3,y+(py-y)*.63+5).lineTo(px,py).strokePath();
     g.fillStyle(shine,fade).fillCircle(px,py,2);
    }else if(element==='ice'){
     const point=5+size*.12;
     g.fillTriangle(px-4,py+4,px+3,py+4,px+2,py-point);
     g.lineStyle(1,shine,fade).lineBetween(px,py+2,px+2,py-point);
    }else if(element==='water'){
     g.fillCircle(px,py,2.5+fade*2).fillStyle(shine,fade*.74).fillCircle(px-1,py-1,1.2);
    }else if(element==='light'){
     g.lineStyle(2,shine,fade).lineBetween(px-5*fade,py,px+5*fade,py).lineBetween(px,py-7*fade,px,py+7*fade);
    }else{
     g.fillCircle(px,py,4.5*fade+1).fillStyle(0x282040,fade).fillCircle(px-1,py+1,3*fade+1);
    }
   }
  }
 };
 scene.events.on('update',draw);
 return {hit(element:Element|undefined,x:number,y:number,dir?:string,size=24,withSound=false){
  if(!element||!ELEMENT_INFO[element])return;
  const v=scene.cameras.main.worldView;
  if(v&&(x<v.x-72||x>v.right+72||y<v.y-72||y>v.bottom+72))return;
  const time=scene.time.now;
  if(hits.length>=36)hits.shift();
  hits.push({element,x,y,size,angle:headings[dir??'right']??0,at:time});
  if(!withSound||time-(lastSound.get(element)??-Infinity)<95)return;
  const volume=actionSoundVolume(scene);
  if(volume>0&&scene.cache.audio.exists(cue(element))){lastSound.set(element,time);scene.sound.play(cue(element),{volume:volume*.68});}
 },destroy(){scene.events.off('update',draw);g.destroy();hits.length=0;}};
}
