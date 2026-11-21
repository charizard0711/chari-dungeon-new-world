export type Facing='down'|'left'|'right'|'up';
export type Motion='walk'|'heavy'|'slash'|'thrust'|'bow';
export const ROW:Record<Facing,number>={down:0,left:1,right:2,up:3};
export const FACINGS:Facing[]=['down','left','up','right'];
export const TYPES:Record<string,string>={greatsword:'大剣',longsword:'片手剣',katana:'刀',dagger:'短剣',lance:'槍',dual_sword:'双剣',twin_daggers:'双短剣',bow:'弓',handgun:'銃'};
export function motionFor(type:string):Motion{return type==='greatsword'?'heavy':type==='bow'?'bow':['lance','handgun','dagger'].includes(type)?'thrust':'slash';}
export function durationFor(type:string){return ({greatsword:1000,longsword:620,katana:650,dagger:390,lance:660,dual_sword:720,twin_daggers:540,bow:900,handgun:540} as Record<string,number>)[type]??600;}
export const TIMING:Record<Motion,number[]>={walk:[0,.125,.25,.375,.5,.625,.75,.875],heavy:[0,.1,.23,.36,.52,.59,.73,.9],slash:[0,.1,.2,.32,.43,.53,.7,.86],thrust:[0,.12,.25,.4,.48,.59,.73,.9],bow:[0,.1,.2,.35,.57,.64,.76,.9]};
export function frameAt(motion:Motion,t:number){const a=TIMING[motion];let i=0;while(i<7&&t>=a[i+1])i++;return i;}
export function continuousFrame(motion:Motion,t:number){const f=frameAt(motion,t),a=TIMING[motion];return f+Math.min(1,Math.max(0,(t-a[f])/((a[f+1]??1)-a[f])));}
export type Point=[number,number];
// Artist-space palm positions for each of the 160 painted poses. Fractions of a cell.
// These are refined against the exposed skin pixels when the atlas loads.
const palms:Record<Motion,Point[][]>={
 walk:[[[.38,.57],[.38,.58],[.38,.55],[.39,.55],[.38,.56],[.38,.56],[.38,.56],[.38,.53]],[[.48,.57],[.45,.56],[.46,.55],[.47,.53],[.48,.56],[.48,.58],[.49,.56],[.47,.54]],[[.46,.56],[.48,.53],[.46,.55],[.42,.56],[.48,.55],[.48,.55],[.45,.53],[.43,.55]],[[.75,.54],[.76,.56],[.72,.55],[.75,.53],[.75,.54],[.73,.55],[.74,.53],[.72,.53]]],
 heavy:[[[.59,.69],[.46,.59],[.39,.46],[.51,.07],[.4,.64],[.47,.82],[.46,.59],[.52,.68]],[[.49,.63],[.39,.61],[.34,.29],[.43,.06],[.23,.62],[.31,.76],[.34,.61],[.42,.64]],[[.64,.62],[.67,.58],[.7,.28],[.57,.06],[.76,.64],[.7,.83],[.72,.59],[.7,.65]],[[.73,.6],[.72,.6],[.68,.26],[.64,.07],[.72,.59],[.71,.76],[.73,.6],[.72,.62]]],
 slash:[[[.38,.55],[.39,.37],[.36,.21],[.31,.24],[.74,.6],[.68,.74],[.39,.48],[.43,.53]],[[.27,.46],[.26,.29],[.22,.23],[.18,.22],[.18,.24],[.5,.62],[.37,.4],[.39,.45]],[[.71,.48],[.43,.31],[.79,.2],[.83,.47],[.8,.43],[.67,.63],[.62,.5],[.63,.54]],[[.76,.58],[.75,.54],[.72,.3],[.74,.3],[.77,.59],[.71,.71],[.76,.57],[.74,.6]]],
 thrust:[[[.42,.57],[.43,.51],[.43,.54],[.52,.46],[.5,.48],[.49,.45],[.48,.5],[.48,.56]],[[.42,.55],[.37,.49],[.37,.47],[.25,.4],[.17,.4],[.24,.41],[.31,.45],[.4,.52]],[[.73,.55],[.75,.43],[.79,.45],[.83,.45],[.93,.43],[.85,.45],[.77,.48],[.73,.55]],[[.73,.56],[.76,.44],[.72,.39],[.74,.36],[.74,.38],[.75,.39],[.76,.46],[.77,.54]]],
 bow:[[[.71,.6],[.71,.54],[.8,.4],[.82,.38],[.83,.39],[.82,.59],[.75,.55],[.74,.58]],[[.48,.56],[.29,.39],[.23,.29],[.17,.28],[.14,.29],[.23,.31],[.35,.41],[.43,.48]],[[.64,.56],[.7,.41],[.83,.3],[.9,.3],[.92,.29],[.83,.35],[.77,.47],[.67,.53]],[[.38,.63],[.25,.44],[.2,.39],[.17,.36],[.16,.37],[.2,.42],[.32,.54],[.39,.6]]]
};
export type Frame={sx:number;sy:number;cw:number;ch:number;root:Point;hand:Point;off:Point;};
export type Atlas={image:HTMLImageElement|HTMLCanvasElement;frames:Frame[];scale:number};
export function makeAtlas(image:HTMLImageElement,motion:Motion):Atlas{
 const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d',{willReadFrequently:true})!;g.drawImage(image,0,0);const data=g.getImageData(0,0,c.width,c.height).data,cw=Math.floor(c.width/8),ch=Math.floor(c.height/4);
 if(!Number.isInteger(cw)||!Number.isInteger(ch))throw Error('Invalid atlas grid');
 const frames:Frame[]=[];
 for(let r=0;r<4;r++)for(let f=0;f<8;f++){
  const sx=Math.round(f*c.width/8),sy=Math.round(r*c.height/4);let bottom=0;
  const alpha=(x:number,y:number)=>data[((sy+y)*c.width+sx+x)*4+3];
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(alpha(x,y)>150)bottom=y;
  let left=cw,right=0;for(let y=Math.max(0,bottom-ch*.1|0);y<=bottom;y++)for(let x=0;x<cw;x++)if(alpha(x,y)>150){left=Math.min(left,x);right=Math.max(right,x);}
  const root:Point=[(left+right)/2,bottom];
  const snap=(p:Point):Point=>{const gx=p[0]*cw,gy=p[1]*ch,rad=cw*.065;let best=Infinity,bx=gx,by=gy;
   for(let y=Math.max(0,Math.floor(gy-rad));y<Math.min(ch,gy+rad);y++)for(let x=Math.max(0,Math.floor(gx-rad));x<Math.min(cw,gx+rad);x++){
    const i=((sy+y)*c.width+sx+x)*4,R=data[i],G=data[i+1],B=data[i+2];
    if(data[i+3]>200&&R>155&&G>95&&R>G*1.09&&G>B*1.15){const score=((x-gx)**2+(y-gy)**2)-G*.025;if(score<best){best=score;bx=x;by=y;}}
   }return [bx,by];};
  const hand=snap(palms[motion][r][f]);
  let off:Point=motion==='heavy'?[hand[0]+(r===1?-4:r===2?4:0),hand[1]+6]:snap(([r===0?.76:r===1?.38:r===2?.72:.38,.57] as Point));
  if(motion==='slash'&&r===0)off=snap([[.79,.55],[.79,.56],[.8,.57],[.83,.4],[.86,.39],[.78,.4],[.78,.53],[.78,.55]][f] as Point);
  frames.push({sx,sy,cw,ch,root,hand,off});
 }
 return {image,frames,scale:40/(ch*.95)};
}
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
export function weaponAngle(type:string,dir:Facing,frame:number,attacking:boolean,off=false){
 const heading={right:0,down:Math.PI/2,left:Math.PI,up:-Math.PI/2}[dir];
 if(type==='handgun')return 0;
 if(type==='bow')return 0;
 const idle=type==='lance'?.1:(dir==='left'?-.8:.8);
 if(!attacking)return idle*(off?-1:1);
 if(type==='lance'||type==='dagger')return heading+Math.PI/2;
 const side=dir==='left'?-1:1;
 const angles=type==='greatsword'?(dir==='down'?[.1,-.35,-.8,-.3,2.1,2.8,1.3,.1]:dir==='up'?[.1,.4,.7,.3,-1.5,-2.1,-.9,.1]:[.2,-.4,-1.15,-.65,1.5,2.2,1.1,.2]):[.15,-.6,-1.1,-1.3,1.7,2.3,1.15,.15];
 const n=Math.min(7,Math.max(0,frame)),i=Math.floor(n);return lerp(angles[i],angles[Math.min(7,i+1)],n-i)*side*(off?-1:1);
}
