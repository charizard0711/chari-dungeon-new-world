import type Phaser from 'phaser';

const palettes={
 aqua:{deep:0x1556ed,flame:0x379fff,edge:0x78e4ff,core:0xe6faff},
 crimson:{deep:0xa51928,flame:0xf33c30,edge:0xff875b,core:0xffe6ba}
} as const;
export type CelestialAuraColor=keyof typeof palettes;

export function celestialAuraColor(armor:string):CelestialAuraColor|undefined{
 return armor==='aqua'||armor==='crimson'?armor:undefined;
}

export function createCelestialAura(scene:Phaser.Scene){
 const back=scene.add.graphics();
 const front=scene.add.graphics();
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 let lastTime=-Infinity,lastColor:CelestialAuraColor|undefined;

 function trace(graphics:Phaser.GameObjects.Graphics,points:{x:number;y:number}[],width:number,color:number,alpha:number){
  graphics.lineStyle(width,color,alpha).beginPath();
  graphics.moveTo(points[0].x,points[0].y);
  for(let i=1;i<points.length;i++)graphics.lineTo(points[i].x,points[i].y);
  graphics.strokePath();
 }

 return {update(color:CelestialAuraColor|undefined,x:number,y:number,depth:number,time:number,visible=true){
  const camera=scene.cameras.main.worldView;
  const show=!!color&&visible&&x>=camera.left-50&&x<=camera.right+50&&y>=camera.top-35&&y<=camera.bottom+80;
  back.setVisible(show);front.setVisible(show);
  if(!show||!color)return;
  back.setPosition(x,y);front.setPosition(x,y);
  if(back.depth!==depth-.04)back.setDepth(depth-.04);
  if(front.depth!==depth+.015)front.setDepth(depth+.015);
  if(color===lastColor&&(reduced||time-lastTime<41))return;
  lastTime=time;lastColor=color;
  const phase=reduced?3.5:time/400,c=palettes[color];
  back.clear();front.clear();

  back.fillStyle(c.deep,.19).fillEllipse(0,0,77,24);
  back.fillStyle(c.flame,.075).fillEllipse(0,-22,43,71);
  back.lineStyle(5,c.flame,.22).strokeEllipse(0,0,67,17);
  back.lineStyle(1.4,c.edge,.58).strokeEllipse(0,0,62,15);
  back.lineStyle(1,c.flame,.36).strokeEllipse(0,0,78,22);
  front.lineStyle(1.4,c.core,.58).strokeEllipse(0,0,60,14);

  // Rising ribbons swap layer as they orbit, so the body occludes the back half.
  for(let strand=0;strand<3;strand++){
   let points:{x:number;y:number}[]=[],previousLayer:Phaser.GameObjects.Graphics|undefined;
   const flush=()=>{
    if(points.length<2||!previousLayer)return;
    const alpha=(strand===0?.58:.31)*(previousLayer===back?.76:1);
    trace(previousLayer,points,8,c.deep,alpha*.46);
    trace(previousLayer,points,4,c.flame,alpha*.75);
    trace(previousLayer,points,1.25,c.edge,alpha);
   };
   for(let i=0;i<=24;i++){
    const rise=i/24,angle=phase+strand*Math.PI*2/3-rise*6.3;
    const radius=(34-12*rise)*(1+.11*Math.sin(phase*2.2+rise*13+strand));
    const point={x:Math.cos(angle)*radius+Math.sin(phase*1.8+rise*18+strand)*3*rise,
      y:-rise*(51+strand*8)+Math.sin(angle)*(8-4*rise)};
    const layer=Math.sin(angle)>0?front:back;
    if(previousLayer&&previousLayer!==layer){points.push(point);flush();points=[point];}
    else points.push(point);
    previousLayer=layer;
   }
   flush();
  }

  const count=reduced?7:17;
  for(let i=0;i<count;i++){
   const rise=(phase*.30+i*.391)%1,angle=i*2.39996+phase*.5;
   const radius=(23+i%4*3)*(1-.2*rise),x0=Math.cos(angle)*radius,y0=-rise*(52+i%6*7)+Math.sin(angle)*7;
   const layer=Math.sin(angle)>0?front:back,alpha=Math.sin(Math.PI*rise)*(.35+(i%4)*.12);
   layer.lineStyle(1,i%3===0?c.core:c.edge,alpha).lineBetween(x0,y0,x0+.4*Math.sin(angle),y0+2.3+i%4);
   if(i%4===0)layer.fillStyle(c.flame,alpha*.32).fillCircle(x0,y0+1,3.1);
  }
 },hide(){back.setVisible(false);front.setVisible(false);},destroy(){back.destroy();front.destroy();}};
}
