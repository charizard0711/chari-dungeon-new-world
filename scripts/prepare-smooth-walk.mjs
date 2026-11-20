// Preserve the established sprites and add motion-compensated walk in-betweens.
// No redesign, resizing, or changes to idle/attack/hurt/down artwork.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const sharp=require(process.env.SHARP_MODULE||'C:/Users/masam/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=process.cwd(),N=96,GRID=4,G=25,STEPS=3,OLD=16,NEW=28;
const oldAnchorCode=ts.transpileModule(await fs.readFile('src/playerHandAnchors.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {PLAYER_HAND_ANCHORS}=await import(`data:text/javascript;base64,${Buffer.from(oldAnchorCode).toString('base64')}`);
const armors=['leather','chain','plate','arcane','dragon','dawn','aqua','crimson','pumpkin_male','pumpkin_female'];
const output=path.join(root,'public/assets/characters/smooth-walk-v1');await fs.mkdir(output,{recursive:true});
const anchors={},report=[];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function premult(raw){const p=new Float32Array(raw.length);for(let i=0;i<raw.length;i+=4){const a=raw[i+3]/255;p[i]=raw[i]*a;p[i+1]=raw[i+1]*a;p[i+2]=raw[i+2]*a;p[i+3]=raw[i+3];}return p;}
function field(a,b,ha,hb){
 const f=new Float32Array(G*G*2);
 for(let gy=0;gy<G;gy++)for(let gx=0;gx<G;gx++){
  const x=Math.min(95,gx*GRID),y=Math.min(95,gy*GRID);let visible=false;
  for(const oy of [-2,0,2])for(const ox of [-2,0,2])if(a[(clamp(y+oy,0,95)*N+clamp(x+ox,0,95))*4+3]>20)visible=true;
  if(!visible)continue;
  let best=Infinity,dxBest=0,dyBest=0;
  for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){
   let cost=(dx*dx+dy*dy)*5;
   for(const oy of [-2,0,2])for(const ox of [-2,0,2]){
    const i=(clamp(y+oy,0,95)*N+clamp(x+ox,0,95))*4,j=(clamp(y+oy+dy,0,95)*N+clamp(x+ox+dx,0,95))*4;
    cost+=Math.abs(a[i]-b[j])*.5+Math.abs(a[i+1]-b[j+1])*.5+Math.abs(a[i+2]-b[j+2])*.5+Math.abs(a[i+3]-b[j+3]);
   }
   if(cost<best){best=cost;dxBest=dx;dyBest=dy;}
  }
  const index=(gy*G+gx)*2;f[index]=dxBest;f[index+1]=dyBest;
 }
 // Smooth local correspondence noise without smearing colors across silhouettes.
 const smooth=new Float32Array(f.length);
 for(let gy=0;gy<G;gy++)for(let gx=0;gx<G;gx++)for(let channel=0;channel<2;channel++){
  let sum=0,total=0;
  for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const weight=ox===0&&oy===0?4:1;sum+=f[(clamp(gy+oy,0,G-1)*G+clamp(gx+ox,0,G-1))*2+channel]*weight;total+=weight;}
  smooth[(gy*G+gx)*2+channel]=sum/total;
 }
 // Pin each grip to its recorded counterpart; equipment uses the same anchors.
 for(let hand=0;hand<2;hand++){
  const ax=ha[hand*2]*2.4,ay=ha[hand*2+1]*2.4,dx=(hb[hand*2]-ha[hand*2])*2.4,dy=(hb[hand*2+1]-ha[hand*2+1])*2.4;
  for(let gy=0;gy<G;gy++)for(let gx=0;gx<G;gx++){
   const blend=Math.exp(-((gx*GRID-ax)**2+(gy*GRID-ay)**2)/55),i=(gy*G+gx)*2;
   smooth[i]=smooth[i]*(1-blend)+dx*blend;smooth[i+1]=smooth[i+1]*(1-blend)+dy*blend;
  }
 }
 return smooth;
}
function bilinear(data,width,height,x,y,channels,channel){
 x=clamp(x,0,width-1);y=clamp(y,0,height-1);const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1),tx=x-x0,ty=y-y0;
 return (data[(y0*width+x0)*channels+channel]*(1-tx)+data[(y0*width+x1)*channels+channel]*tx)*(1-ty)+(data[(y1*width+x0)*channels+channel]*(1-tx)+data[(y1*width+x1)*channels+channel]*tx)*ty;
}
function intermediate(a,b,ab,ba,t){
 const out=Buffer.alloc(N*N*4);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  let ax=x,ay=y,bx=x,by=y;
  for(let it=0;it<3;it++){
   const adx=bilinear(ab,G,G,ax/GRID,ay/GRID,2,0),ady=bilinear(ab,G,G,ax/GRID,ay/GRID,2,1);ax=x-t*adx;ay=y-t*ady;
   const bdx=bilinear(ba,G,G,bx/GRID,by/GRID,2,0),bdy=bilinear(ba,G,G,bx/GRID,by/GRID,2,1);bx=x-(1-t)*bdx;by=y-(1-t)*bdy;
  }
  const i=(y*N+x)*4,alpha=bilinear(a,N,N,ax,ay,4,3)*(1-t)+bilinear(b,N,N,bx,by,4,3)*t;out[i+3]=Math.round(alpha);
  if(alpha>0)for(let ch=0;ch<3;ch++)out[i+ch]=Math.round(clamp((bilinear(a,N,N,ax,ay,4,ch)*(1-t)+bilinear(b,N,N,bx,by,4,ch)*t)*255/alpha,0,255));
 }return out;
}
function put(atlas,width,frame,pixels){const left=frame%8*N,top=Math.floor(frame/8)*N;for(let y=0;y<N;y++)pixels.copy(atlas,((top+y)*width+left)*4,y*N*4,(y+1)*N*4);}
for(const gender of ['male','female'])for(const armor of armors){
 if(armor.startsWith('pumpkin_')&&armor!==`pumpkin_${gender}`)continue;
 const id=`${gender}-${armor}`,source=armor.startsWith('pumpkin_')?`assets/characters/halloween-v1/${id}.png`:gender==='male'&&['aqua','crimson'].includes(armor)?`assets/characters/hooded-back-v2/${id}.png`:`assets/characters/player-painted-v1/${id}.png`;
 const {data,info}=await sharp(path.join(root,'public',source)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const frames=Array.from({length:64},(_,index)=>{const image=Buffer.alloc(N*N*4),x=index%(info.width/N)*N,y=Math.floor(index/(info.width/N))*N;for(let line=0;line<N;line++)data.copy(image,line*N*4,((y+line)*info.width+x)*4,((y+line)*info.width+x+N)*4);return image;});
 const oldHands=PLAYER_HAND_ANCHORS[`player_${gender}_${armor}`]??PLAYER_HAND_ANCHORS[`player_${gender}_${armor.startsWith('pumpkin_')?'arcane':'leather'}`];
 const width=8*N,height=14*N,atlas=Buffer.alloc(width*height*4),newHands=[];
 for(let direction=0;direction<4;direction++){
  const base=direction*OLD,outBase=direction*NEW;
  for(const i of [0,1]){put(atlas,width,outBase+i,frames[base+i]);newHands[outBase+i]=oldHands[base+i];}
  for(let walk=0;walk<6;walk++){
   const from=base+2+walk,to=base+2+(walk+1)%6,a=premult(frames[from]),b=premult(frames[to]),ha=oldHands[from],hb=oldHands[to];
   const ab=field(a,b,ha,hb),ba=field(b,a,hb,ha);
   for(let part=0;part<STEPS;part++){
    const t=part/STEPS,index=outBase+2+walk*STEPS+part;
    put(atlas,width,index,part===0?frames[from]:intermediate(a,b,ab,ba,t));
    newHands[index]=ha.map((v,k)=>Math.round((v+(hb[k]-v)*t)*1000)/1000);
   }
  }
  for(let i=8;i<OLD;i++){const index=outBase+20+i-8;put(atlas,width,index,frames[base+i]);newHands[index]=oldHands[base+i];}
 }
 await sharp(atlas,{raw:{width,height,channels:4}}).webp({lossless:true,effort:6}).toFile(path.join(output,id+'.webp'));
 anchors[`player_${gender}_${armor}`]=newHands;report.push({id,source,walkFrames:18,totalFrames:112});console.log('Prepared '+id);
}
await fs.writeFile('src/smoothWalkHandAnchors.ts','// Generated by scripts/prepare-smooth-walk.mjs. Same rig, 18 walking poses.\nexport const SMOOTH_WALK_HAND_ANCHORS: Record<string, number[][]> = '+JSON.stringify(anchors)+';\n');
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify({version:1,frameSize:96,framesPerDirection:28,walkFrames:18,files:report},null,2)+'\n');
console.log('Prepared '+report.length+' appearance sets; original keyframes preserved.');
