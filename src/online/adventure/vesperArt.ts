import type Phaser from 'phaser';

export const VESPER_ART='vesper_greatsword';
export const VESPER_SWING_MS=570;
export const VESPER_STRIKE_MS=170;

export function preloadVesper(scene:Phaser.Scene){
 if(!scene.textures.exists(VESPER_ART)){
  scene.load.spritesheet(VESPER_ART,'assets/online/vesper-greatsword-v1/poses.png',{frameWidth:299,frameHeight:328});
 }
 if(!scene.textures.exists('vesper_stab_floor')){
  scene.load.image('vesper_stab_floor','assets/online/vesper-greatsword-v1/stab-floor.png');
 }
}

export function vesperFrame(direction:number, moving:boolean, time:number, swingAge:number){
 if(swingAge>=0&&swingAge<VESPER_SWING_MS)return direction+(swingAge<VESPER_STRIKE_MS?8:12);
 return direction+(moving&&Math.floor(time/135)%2===1?4:0);
}

export function drawVesperSlash(graphics:Phaser.GameObjects.Graphics,x:number,y:number,direction:number,progress:number){
 const heading=[Math.PI/2,Math.PI,0,-Math.PI/2][direction];
 const end=heading-.85+2.2*Math.min(1,progress*2.2);
 const start=Math.max(heading-1.15,end-1.8);
 const fade=Math.max(0,1-progress);
 for(const [radius,width,color,alpha] of [[53,14,0x7531c8,.38],[52,6,0xb977ff,.82],[50,2,0xffe8ff,1]]){
  graphics.lineStyle(width,color,fade*alpha);
  graphics.beginPath();
  for(let i=0;i<=20;i++){
   const angle=start+(end-start)*i/20,px=x+Math.cos(angle)*radius,py=y+Math.sin(angle)*radius*.65;
   if(i===0)graphics.moveTo(px,py);else graphics.lineTo(px,py);
  }
  graphics.strokePath();
 }
 for(let i=0;i<7;i++){
  const angle=heading+(i-3)*.24,distance=35+progress*(36+i*3);
  graphics.fillStyle(i%2?0xf9c5ff:0x9e6aff,fade*.85).fillCircle(x+Math.cos(angle)*distance,y+Math.sin(angle)*distance*.66,2.3-progress);
 }
}
