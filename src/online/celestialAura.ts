import type Phaser from 'phaser';

const orbitColors={
 aqua:{glow:0x297bff,light:0x69ceff,core:0xe1faff},
 crimson:{glow:0xee372a,light:0xff8054,core:0xffe5be},
} as const;
export type CelestialAuraColor=keyof typeof orbitColors;

export function celestialAuraColor(armor:string):CelestialAuraColor|undefined{
 return armor==='aqua'||armor==='crimson'?armor:undefined;
}

const STEPS=14;
const ARC=1.7;
const REVOLUTION_MS=1660;
const orbits=[
 {tilt:-.52,radius:32,height:-24},
 {tilt:.27,radius:31,height:-23},
 {tilt:.54,radius:33,height:-25},
 {tilt:-.20,radius:30,height:-22},
].map((orbit,index)=>({
 ...orbit,cosTilt:Math.cos(orbit.tilt),sinTilt:Math.sin(orbit.tilt),phaseOffset:index*Math.PI/2,
}));

function point(angle:number,orbit:typeof orbits[number]){
 const x=Math.cos(angle)*orbit.radius;
 const y=Math.sin(angle)*8;
 return {x:x*orbit.cosTilt-y*orbit.sinTilt,y:orbit.height+x*orbit.sinTilt+y*orbit.cosTilt};
}

function paintOrbit(back:Phaser.GameObjects.Graphics,front:Phaser.GameObjects.Graphics,color:CelestialAuraColor,phase:number,orbit:typeof orbits[number]){
 const palette=orbitColors[color];
 let angle=phase-ARC;
 let previous=point(angle,orbit);
 for(let i=1;i<=STEPS;i++){
  const progress=i/STEPS;
  const nextAngle=phase-(1-progress)*ARC;
  const next=point(nextAngle,orbit);
  const layer=Math.sin((angle+nextAngle)/2)>=0?front:back;
  const opacity=.17+.83*progress;
  const width=.65+2.4*progress;
  layer.lineStyle(width*2.1,palette.glow,.26*opacity)
   .lineBetween(previous.x,previous.y,next.x,next.y);
  layer.lineStyle(width,palette.light,.85*opacity)
   .lineBetween(previous.x,previous.y,next.x,next.y);
  layer.lineStyle(width*.34,palette.core,.88*opacity)
   .lineBetween(previous.x,previous.y,next.x,next.y);
  previous=next;angle=nextAngle;
 }
}

export function createCelestialAura(scene:Phaser.Scene){
 const back=scene.add.graphics().setVisible(false);
 const front=scene.add.graphics().setVisible(false);
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 let lastColor:CelestialAuraColor|undefined,lastFrame=-1;
 const setVisible=(show:boolean)=>{back.setVisible(show);front.setVisible(show);};

 return {update(color:CelestialAuraColor|undefined,x:number,y:number,depth:number,time:number,visible=true){
  const camera=scene.cameras.main.worldView;
  const show=!!color&&visible&&x>=camera.left-40&&x<=camera.right+40&&y>=camera.top-10&&y<=camera.bottom+35;
  setVisible(show);
  if(!show||!color)return;
  back.setPosition(x,y);front.setPosition(x,y);
  if(back.depth!==depth-.025)back.setDepth(depth-.025);
  if(front.depth!==depth+.045)front.setDepth(depth+.045);
  const frame=reduced?18:Math.floor(time/25);
  if(frame!==lastFrame||color!==lastColor){
   const phase=(frame*25%REVOLUTION_MS)/REVOLUTION_MS*Math.PI*2;
   back.clear();front.clear();
   for(const orbit of orbits)paintOrbit(back,front,color,phase+orbit.phaseOffset,orbit);
   lastFrame=frame;lastColor=color;
  }
 },hide(){setVisible(false);},destroy(){back.destroy();front.destroy();}};
}
