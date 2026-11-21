import type {Point} from './motion';
const sheets=new Map<string,HTMLCanvasElement[]>();
export function registerVerticalRanged(type:string,image:HTMLImageElement){
 const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d')!;g.drawImage(image,0,0);const pixels=g.getImageData(0,0,c.width,c.height);
 for(let i=3;i<pixels.data.length;i+=4)if(pixels.data[i]<160)pixels.data[i]=0;
 g.putImageData(pixels,0,0);const frames:HTMLCanvasElement[]=[];
 for(let col=0;col<2;col++){
  const start=Math.round(col*c.width/2),end=Math.round((col+1)*c.width/2);let left=end,right=start,top=c.height,bottom=0;
  for(let y=0;y<c.height;y++)for(let x=start;x<end;x++)if(pixels.data[(y*c.width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  const f=document.createElement('canvas');f.width=right-left+1;f.height=bottom-top+1;f.getContext('2d')!.drawImage(c,left,top,f.width,f.height,0,0,f.width,f.height);frames.push(f);
 }sheets.set(type,frames);
}
export function rangedPose(type:string,back:boolean,t:number,attack:boolean){
 const sign=back?-1:1,elapsed=t*268-58,recoil=attack&&elapsed>0&&elapsed<70?Math.sin(elapsed/70*Math.PI):0;
 const hand:Point=[0,(back?-28:-19)-sign*recoil*1.4],off:Point=type==='bow'?[3,hand[1]-sign*(attack?5:2)]:[2,hand[1]+1];
 return {hand,off,angle:sign*Math.PI/2,behind:back};
}
export function drawVerticalRanged(g:CanvasRenderingContext2D,type:string,back:boolean,hand:Point){
 const image=sheets.get(type)?.[back?1:0];if(!image)return false;
 const scale=type==='bow'?36/image.width:20/image.height;
 const gripY=type==='bow'?(back?.34:.56):(back?.77:.24);
 g.drawImage(image,hand[0]-image.width*scale/2,hand[1]-image.height*scale*gripY,image.width*scale,image.height*scale);return true;
}
