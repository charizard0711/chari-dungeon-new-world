import {ROW,type Facing,type Point} from './motion';
export const ARMED_PROFILES=[
 {type:'greatsword',name:'両手大剣',description:'右手を鍔の下、左手を柄頭側へ。重心を落とし、肩から大きく振り下ろす。',duration:1150,impact:[.57],range:1,projectile:false,phase:[0,.12,.25,.39,.57,.65,.8,.92]},
 {type:'longsword',name:'騎士の片手剣',description:'右手で柄を握り、左手はバランスを取る。踏み込みながら斜めに斬り払う。',duration:700,impact:[.47],range:1,projectile:false,phase:[0,.1,.21,.35,.47,.57,.74,.9]},
 {type:'katana',name:'居合の刀',description:'左手で鞘を固定。右手で抜刀し、横に払ってから納刀する。',duration:900,impact:[.43],range:1,projectile:false,phase:[0,.13,.27,.38,.43,.57,.76,.93]},
 {type:'dagger',name:'斥候の短剣',description:'肘を体に寄せた短い構え。小さく踏み込み、近い間合いで素早く返す。',duration:470,impact:[.43],range:1,projectile:false,phase:[0,.1,.22,.34,.43,.57,.73,.9]},
 {type:'lance',name:'衛兵の槍',description:'前の手で柄を支え、後ろの手で押し出す。腰から踏み込んで突き、柄を引き戻す。弾は飛ばない。',duration:880,impact:[.54],range:2,projectile:false,phase:[0,.13,.28,.42,.54,.64,.79,.93]},
 {type:'dual_sword',name:'対の双剣',description:'左右それぞれの手で握る。右手の斬りに左手の斬りが続く、時間差の二連撃。',duration:920,impact:[.35,.63],range:1,projectile:false,phase:[0,.12,.25,.35,.51,.63,.8,.93]},
 {type:'bow',name:'木製の長弓',description:'左手は弓の握り、右手は弦。引き絞り、放ち、腕を下ろす。',duration:1050,impact:[.57],range:5,projectile:true,phase:[0,.11,.25,.39,.57,.66,.79,.92]},
 {type:'handgun',name:'古式拳銃',description:'両手を合わせて構え、銃口を相手へ。小さい反動から照準に戻す。',duration:720,impact:[.48],range:5,projectile:true,phase:[0,.12,.25,.37,.48,.59,.75,.91]}
] as const;
export type ArmedType=typeof ARMED_PROFILES[number]['type'];
export type ArmedProfile={type:ArmedType;name:string;description:string;duration:number;impact:readonly number[];range:number;projectile:boolean;phase:readonly number[]};
export const armedProfile=(type:string):ArmedProfile=>ARMED_PROFILES.find(p=>p.type===type)??ARMED_PROFILES[0];
export function armedFrame(p:ArmedProfile,t:number,walk=false){if(walk)return Math.min(7,Math.floor(Math.max(0,t)*8));let f=0;while(f<7&&t>=p.phase[f+1])f++;return f;}
type Frame={canvas:HTMLCanvasElement;cw:number;ch:number;x:number;y:number};
export type ArmedSheet={frames:Frame[];scale:number};
export function parseArmedSheet(image:HTMLImageElement):ArmedSheet{
 const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d',{willReadFrequently:true})!;g.drawImage(image,0,0);
 const data=g.getImageData(0,0,c.width,c.height).data,w=c.width,h=c.height,seen=new Uint8Array(w*h),components:{pixels:number[];x0:number;y0:number;x1:number;y1:number}[]=[];
 // Extract connected silhouettes, not nominal grid rectangles: polearms cross
 // the generator's cell boundaries. Keep each weapon attached to its own hands.
 for(let seed=0;seed<w*h;seed++){
  if(seen[seed]||data[seed*4+3]<=30)continue;
  const pixels:number[]=[],q=[seed];seen[seed]=1;let x0=w,y0=h,x1=0,y1=0;
  while(q.length){const k=q.pop()!,x=k%w,y=Math.floor(k/w);pixels.push(k);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   for(const j of [k-1,k+1,k-w,k+w])if(j>=0&&j<w*h&&!seen[j]&&Math.abs(j%w-x)<=1&&data[j*4+3]>30){seen[j]=1;q.push(j);}
  }
  if(pixels.length>1000)components.push({pixels,x0,y0,x1,y1});
 }
 if(components.length!==64)throw new Error(`Sprite extraction: expected 64 silhouettes, found ${components.length} (${image.src})`);
 components.sort((a,b)=>a.y0-b.y0);const ordered:typeof components=[];
 for(let row=0;row<8;row++)ordered.push(...components.slice(row*8,row*8+8).sort((a,b)=>a.x0-b.x0));
 const frames=ordered.map(part=>{
  const cw=part.x1-part.x0+1,ch=part.y1-part.y0+1,canvas=document.createElement('canvas');canvas.width=cw;canvas.height=ch;
  const cg=canvas.getContext('2d')!,out=cg.createImageData(cw,ch);let footY=ch-1,lo=cw,hi=0;
  for(const k of part.pixels){const x=k%w-part.x0,y=Math.floor(k/w)-part.y0,j=(y*cw+x)*4;out.data.set(data.subarray(k*4,k*4+4),j);}
  const boot=(x:number,y:number)=>{const i=(y*cw+x)*4,r=out.data[i],gr=out.data[i+1],b=out.data[i+2];return out.data[i+3]>180&&r>45&&r>gr*1.13&&gr>b*1.1;};
  for(let y=Math.floor(ch*.65);y<ch;y++){let n=0;for(let x=0;x<cw;x++)if(boot(x,y))n++;if(n>=3)footY=y;}
  for(let y=Math.max(0,footY-12);y<=footY;y++)for(let x=0;x<cw;x++)if(boot(x,y)){lo=Math.min(lo,x);hi=Math.max(hi,x);}
  cg.putImageData(out,0,0);return {canvas,cw,ch,x:lo<=hi?(lo+hi)/2:cw/2,y:footY};
 });
 return {frames,scale:40/(h/8*.87)};
}
export function drawArmedBody(g:CanvasRenderingContext2D,sheet:ArmedSheet,profile:ArmedProfile,dir:Facing,t:number,attack:boolean,walk:boolean,magnify:number,debug=false){
 // The left-facing archer's original art aimed right. Use the correctly aimed
 // right-facing practice row reflected as a complete body+bow, never just its bow.
 const reflected=profile.type==='bow'&&attack&&dir==='left';
 const row=ROW[reflected?'right':dir]+(attack||!walk?4:0),frame=armedFrame(profile,t,walk),f=sheet.frames[row*8+(attack||walk?frame:0)],scale=sheet.scale*magnify;
 g.save();if(reflected)g.scale(-1,1);
 g.drawImage(f.canvas,-f.x*scale,-f.y*scale,f.cw*scale,f.ch*scale);
 if(debug){g.strokeStyle='#8fe1ca88';g.lineWidth=.5*magnify;g.strokeRect(-f.x*scale,-f.y*scale,f.cw*scale,f.ch*scale);g.fillStyle='#d9c082';g.fillRect(-2*magnify,-.5*magnify,4*magnify,magnify);}
 g.restore();return frame;
}
export function drawArmedEffects(g:CanvasRenderingContext2D,p:ArmedProfile,dir:Facing,t:number,magnify:number,origin?:Point){
 // Melee animation is entirely in the authored frames. In particular a spear
 // never reuses the projectile drawing path from bow or pistol.
 if(!p.projectile)return;
 const elapsed=t-p.impact[0];if(elapsed<0||elapsed>.25)return;
 const v:Point=({right:[1,0],left:[-1,0],down:[0,1],up:[0,-1]} as Record<Facing,Point>)[dir];
 const muzzle:Point=origin??(dir==='right'?[19,-27]:dir==='left'?[-19,-27]:dir==='down'?[0,-17]:[0,-31]);
 g.save();g.translate(muzzle[0]*magnify,muzzle[1]*magnify);g.rotate(Math.atan2(v[1],v[0]));g.globalAlpha=1-elapsed/.25;
 const d=(elapsed/.25)*72*magnify;
 if(p.type==='bow'){g.strokeStyle='#e8d6a2';g.lineWidth=.7*magnify;g.beginPath();g.moveTo(d,0);g.lineTo(d+12*magnify,0);g.lineTo(d+9*magnify,-2*magnify);g.moveTo(d+12*magnify,0);g.lineTo(d+9*magnify,2*magnify);g.stroke();}
 else{if(elapsed<.06){g.fillStyle='#ffe9a9';g.beginPath();g.moveTo(0,-2*magnify);g.lineTo(7*magnify,0);g.lineTo(0,2*magnify);g.fill();}g.fillStyle='#ffe6a7';g.fillRect(d,0,4*magnify,.8*magnify);}
 g.restore();
}
export const PART_ROWS=[0,.167,.276,.421,.501,.668,.768,.914,1];
export function drawWeaponPart(g:CanvasRenderingContext2D,image:HTMLImageElement,type:string,view:number,x:number,y:number,w:number,h:number){
 const index=ARMED_PROFILES.findIndex(p=>p.type===type),sx=view*image.width/4,sy=PART_ROWS[index]*image.height,sw=image.width/4,sh=(PART_ROWS[index+1]-PART_ROWS[index])*image.height,scale=Math.min(w/sw,h/sh);
 g.drawImage(image,sx,sy,sw,sh,x+(w-sw*scale)/2,y+(h-sh*scale)/2,sw*scale,sh*scale);
}
