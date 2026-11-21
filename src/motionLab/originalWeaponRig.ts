import {verticalAttack} from './verticalAttack';
import {rangedPose,drawVerticalRanged} from './verticalRanged';
import {ROW,type Atlas,type Facing,type Point} from './motion';
export const ORIGINAL_GRIPS:Record<string,{grip:Point;basis:number;height:number;second?:number}>={
 greatsword:{grip:[.5,.825],basis:-Math.PI/2,height:46,second:-3.6},
 longsword:{grip:[.5,.81],basis:-Math.PI/2,height:36},
 katana:{grip:[.25,.78],basis:-Math.PI/4,height:38},
 dagger:{grip:[.5,.81],basis:-Math.PI/2,height:23},
 lance:{grip:[.505,.75],basis:-Math.PI/2,height:62,second:11},
 dual_sword:{grip:[.5,.82],basis:-Math.PI/2,height:26},
 bow:{grip:[.49,.51],basis:0,height:42},
 handgun:{grip:[.23,.60],basis:0,height:26},
};
type Pose={hand:Point;angle:number;off:Point;lean:number};
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const smooth=(t:number)=>t*t*(3-2*t);
export function rigPose(type:string,t:number,attack:boolean,walk:boolean):Pose{
 const table:Record<string,number[][]>={
  greatsword:[[5,-22,-1.1,0],[2,-25,-1.7,-.04],[-3,-31,-2.3,-.1],[-2,-35,-1.6,-.12],[13,-17,.65,.12],[11,-12,1.05,.16],[7,-19,-.3,.04],[5,-22,-1.1,0]],
  longsword:[[7,-21,-1.1,0],[2,-25,-2,-.06],[-2,-29,-2.8,-.1],[4,-29,-1.6,-.05],[14,-21,.2,.1],[11,-15,.95,.12],[8,-19,-.4,.05],[7,-21,-1.1,0]],
  katana:[[0,-19,2.8,0],[-2,-20,2.8,-.05],[-3,-21,2.8,-.08],[4,-22,-2.8,0],[14,-22,-.15,.1],[12,-18,.5,.12],[4,-20,2.4,.03],[0,-19,2.8,0]],
  dagger:[[6,-21,-.8,0],[2,-22,-1.2,-.03],[0,-23,-1,-.06],[9,-22,-.2,.04],[14,-22,0,.1],[11,-21,.15,.08],[7,-21,-.5,.02],[6,-21,-.8,0]],
  lance:[[1,-21,-.35,0],[-3,-21,-.2,-.03],[-6,-22,-.08,-.07],[1,-22,0,0],[6,-22,0,.11],[4,-22,0,.09],[2,-21,-.2,.02],[1,-21,-.35,0]],
  dual_sword:[[6,-22,-1,0],[1,-25,-2,-.04],[-2,-28,-2.4,-.06],[13,-21,.3,.1],[5,-23,-.8,0],[9,-18,.7,.08],[7,-20,-.5,.02],[6,-22,-1,0]],
  bow:[[9,-22,0,0],[11,-24,0,0],[13,-26,0,-.02],[14,-26,0,-.03],[14,-26,0,-.03],[13,-25,0,0],[10,-23,0,0],[9,-22,0,0]],
  handgun:[[8,-22,0,0],[10,-24,0,0],[12,-25,0,0],[13,-25,0,-.02],[11,-27,-.13,-.04],[12,-25,-.03,0],[10,-24,0,0],[8,-22,0,0]],
 };
 const rows=table[type],f=attack?Math.min(7,t*7):0,i=Math.floor(f),u=smooth(f-i),a=rows[i],b=rows[Math.min(7,i+1)];
 let hand:Point=[mix(a[0],b[0],u),mix(a[1],b[1],u)+(walk?Math.sin(t*Math.PI*2)*.55:0)],angle=mix(a[2],b[2],u),lean=mix(a[3],b[3],u);
 if(attack){
  const heavy=type==='greatsword',ms=t*(heavy?460:268),windup=heavy?200:58,elapsed=Math.max(0,ms-windup),ranged=type==='bow'||type==='handgun';
  hand=[rows[0][0],rows[0][1]];lean=0;
  if(!ranged){
   const raised=heavy?-.5:-.7,target=heavy?1.65:Math.PI/2;
   const progress=Math.min(1,ms<windup?ms/(heavy?180:58):elapsed/(heavy?140:85));
   const ease=heavy&&ms>=windup?progress*progress:smooth(progress);
   angle=-Math.PI/2+(ms<windup?mix(.3,raised,ease):mix(raised,target,ease));
   if(heavy&&elapsed>170)angle=mix(-Math.PI/2+target,-Math.PI/2+.3,Math.min(1,(elapsed-170)/90));
   if(type==='lance'){angle=0;hand=[1+Math.sin(Math.min(1,elapsed/104)*Math.PI)*5,-22];}
   if(type==='katana'){const sweep=Math.min(1,elapsed/130),recover=Math.max(0,Math.min(1,(elapsed-145)/65));angle=-.85+sweep*1.7;hand=[3+9*Math.sin(sweep*Math.PI/2)*(1-recover),-22];}
  }else{hand=[12,-25];angle=type==='handgun'&&elapsed<70?-.08*Math.sin(elapsed/70*Math.PI):0;}
 }
 let off:Point=[-3,-15];const second=ORIGINAL_GRIPS[type].second;
 if(second!==undefined)off=[hand[0]+Math.cos(angle)*second,hand[1]+Math.sin(angle)*second];
 if(type==='bow')off=[attack?mix(8,-3,Math.sin(Math.min(1,t/.58)*Math.PI/2)):4,-25];
 if(type==='handgun')off=[hand[0]-2,hand[1]+1.5];
 if(type==='dual_sword')off=[attack?4+Math.sin(t*Math.PI*2)*7:-4,attack?-22+Math.sin(t*Math.PI*2)*3:-21];
 return {hand,off,angle,lean};
}
export function solveElbow(shoulder:Point,hand:Point,bend:number):Point{
 const dx=hand[0]-shoulder[0],dy=hand[1]-shoulder[1],distance=Math.hypot(dx,dy),length=Math.max(6.2,distance*.51),h=Math.min(2.4,Math.sqrt(Math.max(0,length*length-distance*distance/4)));
 return [(shoulder[0]+hand[0])/2-dy/Math.max(.001,distance)*h*bend,(shoulder[1]+hand[1])/2+dx/Math.max(.001,distance)*h*bend];
}
export function originalMuzzle(type:string,dir:Facing,t:number):Point{
 if((dir==='down'||dir==='up')&&(type==='bow'||type==='handgun')){const p=rangedPose(type,dir==='up',t,true);return [p.hand[0],p.hand[1]+(dir==='up'?-1:1)*(type==='bow'?3:13)];}
 const p=rigPose(type,t,true,false),side=dir==='left'?-1:1;
 if(dir==='down'||dir==='up')return [p.hand[0]*.55-2,p.hand[1]+(dir==='up'?-8:8)];
 if(type==='bow')return [side*p.hand[0],p.hand[1]];
 return [side*(p.hand[0]+20*Math.cos(p.angle)+5*Math.sin(p.angle)),p.hand[1]+20*Math.sin(p.angle)-5*Math.cos(p.angle)];
}
export type LimbParts=HTMLCanvasElement[];
export function parseLimbParts(image:HTMLImageElement):LimbParts{
 const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d',{willReadFrequently:true})!;g.drawImage(image,0,0);const pixels=g.getImageData(0,0,c.width,c.height),d=pixels.data,parts:LimbParts=[];
 // Discard low-opacity matte noise before measuring and drawing each limb.
 for(let i=3;i<d.length;i+=4)if(d[i]<128)d[i]=0;
 g.putImageData(pixels,0,0);
 for(let r=0;r<3;r++)for(let col=0;col<4;col++){const sx=Math.floor(col*c.width/4),sy=Math.floor(r*c.height/3),cw=Math.floor(c.width/4),ch=Math.floor(c.height/3);let x0=cw,y0=ch,x1=0,y1=0;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(d[((sy+y)*c.width+sx+x)*4+3]>30){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  const out=document.createElement('canvas');out.width=x1-x0+1;out.height=y1-y0+1;out.getContext('2d')!.drawImage(c,sx+x0,sy+y0,out.width,out.height,0,0,out.width,out.height);parts.push(out);
 }return parts;
}
export function drawOriginalRig(g:CanvasRenderingContext2D,body:Atlas,parts:LimbParts,weapon:HTMLImageElement,type:string,directional:boolean,dir:Facing,t:number,attack:boolean,walk:boolean,magnify:number,debug:boolean,options:{grip?:Point;basis?:number;verticalArt?:boolean;shield?:HTMLImageElement}={}){
 const row=ROW[dir],frame=walk?Math.floor(t*8)%8:attack?[0,0,2,2,4,4,2,0][Math.min(7,Math.floor(t*8))]:0,f=body.frames[row*8+frame],scale=body.scale;
 const pose=rigPose(type,t,attack,walk),side=dir==='left'?-1:1,profile=dir==='left'||dir==='right';
 const map=(p:Point):Point=>profile?[p[0]*side,p[1]]:[p[0]*.55-2,p[1]+(dir==='up'?-3:3)];
 const vertical=!profile&&type!=='lance'?(['bow','handgun'].includes(type)?rangedPose(type,dir==='up',t,attack):verticalAttack(type,dir==='up',t,attack)):undefined;
 const hand=vertical?.hand??map(pose.hand),shoulder:Point=profile?[side*2,-26]:[dir==='up'?5:-5,-26],farShoulder:Point=profile?[side*4,-27]:[dir==='up'?-5:5,-26];
 let off=vertical?.off??map(pose.off);
 const angle=vertical?.angle??(profile?(dir==='left'?Math.PI-pose.angle:pose.angle):(dir==='up'?-Math.PI/2:Math.PI/2)+pose.angle*.35);
 const config={...ORIGINAL_GRIPS[type],...(options.grip?{grip:options.grip}:{}),...(options.basis!==undefined?{basis:options.basis}:{})};
 if(config.second!==undefined){const separation=config.second*(profile?1:.8);off=[hand[0]+Math.cos(angle)*separation,hand[1]+Math.sin(angle)*separation];}
 const drawWeapon=(at:Point,a:number)=>{const sw=directional?weapon.width/2:weapon.width,sh=directional?weapon.height/2:weapon.height,s=config.height/sh,sourceY=directional&&type==='handgun'?sh:0;
  if(!profile&&options.verticalArt!==false&&drawVerticalRanged(g,type,dir==='up',at))return;
  g.save();g.translate(...at);if(type==='bow'){if(dir!=='left')g.scale(-1,1);if(!profile)g.scale(.55,1);}else if(type==='handgun'&&dir==='left'){g.scale(-1,1);g.rotate(Math.PI-a-config.basis);}else{g.rotate(a-config.basis);if(!profile&&type==='lance')g.scale(1,.8);}
  g.drawImage(weapon,0,sourceY,sw,sh,-config.grip[0]*sw*s,-config.grip[1]*sh*s,sw*s,sh*s);g.restore();};
 const segment=(a:Point,b:Point,img:HTMLCanvasElement,width:number)=>{g.save();g.translate(...a);g.rotate(Math.atan2(b[1]-a[1],b[0]-a[0])-Math.PI/2);g.drawImage(img,-width/2,-1,width,Math.hypot(b[0]-a[0],b[1]-a[1])+2);g.restore();};
 const arm=(s:Point,h:Point,far:boolean)=>{const elbow=solveElbow(s,h,Math.sign(h[0]-s[0])||side);g.save();if(far)g.globalAlpha=.88;segment(s,elbow,parts[row],3.8);segment(elbow,h,parts[4+row],3.2);g.restore();if(debug){g.strokeStyle=far?'#ffb87b':'#78e8d5';g.lineWidth=.5;g.beginPath();g.moveTo(...s);g.lineTo(...elbow);g.lineTo(...h);g.stroke();}};
 const glove=(h:Point)=>{g.save();g.translate(...h);g.rotate(angle+Math.PI/2);g.drawImage(parts[8+row],-1.6,-1.6,3.2,3.2);g.restore();};
 g.save();g.scale(magnify,magnify);
 if(dir!=='down'){arm(farShoulder,off,true);glove(off);}
 if(dir==='up'){arm(shoulder,hand,false);drawWeapon(hand,angle);glove(hand);}
 g.save();g.translate(0,-12);g.rotate(profile?pose.lean*side:0);g.translate(0,12);g.drawImage(body.image,f.sx,f.sy,f.cw,f.ch,-f.root[0]*scale,-f.root[1]*scale,f.cw*scale,f.ch*scale);g.restore();
 if(dir==='down'){arm(farShoulder,off,true);glove(off);}
 if(dir!=='up'){arm(shoulder,hand,false);drawWeapon(hand,angle);glove(hand);}
 if(type==='dual_sword')drawWeapon(off,vertical?Math.PI-angle:angle+.8);
 if(config.second!==undefined||['bow','handgun','dual_sword'].includes(type)){arm(farShoulder,off,true);glove(off);}
 if(options.shield){const s=options.shield,size=22;g.drawImage(s,off[0]-size/2,off[1]-size*.45,size,size);}
 g.restore();
}
