import weapons from './weapons.json';
import directions from './weapon-directions.json';
import {ORIGINAL_GRIPS} from './originalWeaponRig';
import type {Point} from './motion';
export type WeaponDefinition=typeof weapons[number];
export type WeaponVisual={image:HTMLImageElement;directional:boolean;options:{grip?:Point;basis?:number;height?:number;verticalArt?:boolean;verticalFrames?:HTMLCanvasElement[]}};
const cache=new Map<string,Promise<WeaponVisual>>();
const representatives=new Set(Object.keys(ORIGINAL_GRIPS).map(type=>weapons.find(w=>w.weaponType===type)!.key));
const canvas=(w:number,h:number)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};

/** Read only the opaque weapon, not the transparent cell padding or glow. */
function cut(image:HTMLImageElement,sx=0,sy=0,sw=image.width,sh=image.height){
 const c=canvas(Math.round(sw),Math.round(sh)),g=c.getContext('2d',{willReadFrequently:true})!;g.drawImage(image,sx,sy,sw,sh,0,0,c.width,c.height);
 const p=g.getImageData(0,0,c.width,c.height);let l=c.width,r=-1,t=c.height,b=-1;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const i=(y*c.width+x)*4;if(p.data[i+3]<160){p.data[i+3]=0;continue;}l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
 if(r<l)throw Error('Weapon sprite is empty');g.putImageData(p,0,0);const out=canvas(r-l+1,b-t+1);out.getContext('2d')!.drawImage(c,l,t,out.width,out.height,0,0,out.width,out.height);return out;
}

/** Per-image handle registration along its own blade/limb axis. */
export function registerWeaponPixels(data:Uint8ClampedArray,width:number,height:number,type:string,crossbow=false){
 const pts:Point[]=[];let mx=0,my=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>=160){pts.push([x,y]);mx+=x;my+=y;}
 if(!pts.length)throw Error('No solid weapon pixels');mx/=pts.length;my/=pts.length;
 let xx=0,yy=0,xy=0;for(const [x,y]of pts){xx+=(x-mx)**2;yy+=(y-my)**2;xy+=(x-mx)*(y-my);}
 let angle=.5*Math.atan2(2*xy,xx-yy);if(Math.sin(angle)>0)angle-=Math.PI;
 const ax=Math.cos(angle),ay=Math.sin(angle),project=(p:Point)=>p[0]*ax+p[1]*ay;
 const sorted=pts.map(project).sort((a,b)=>a-b),min=sorted[Math.floor(sorted.length*.005)],max=sorted[Math.floor(sorted.length*.995)],length=max-min;
 const fraction=type==='bow'&&!crossbow?.5:type==='lance'?.25:type==='handgun'?.16:.17,target=min+length*fraction;
 const band=pts.filter(p=>Math.abs(project(p)-target)<length*.025);
 const grip:Point=band.length?[band.reduce((n,p)=>n+p[0],0)/band.length,band.reduce((n,p)=>n+p[1],0)/band.length]:[mx,my];
 return {grip:[grip[0]/width,grip[1]/height] as Point,basis:angle,height:ORIGINAL_GRIPS[type].height*height/Math.max(1,length)};
}

export function loadWeaponVisual(w:WeaponDefinition,star:boolean,load:(path:string)=>Promise<HTMLImageElement>):Promise<WeaponVisual>{
 const key=w.key+':'+star;let cached=cache.get(key);if(cached)return cached;
 cached=(async()=>{
  const preserve=representatives.has(w.key)&&!star;
  let image:HTMLImageElement,directional=false,options:WeaponVisual['options']={verticalArt:false};
  if(preserve){image=await load(w.held);directional=!!w.directional;options={verticalArt:true};}
  else{
   let trim:HTMLCanvasElement;
   if(w.weaponType==='dual_sword'){
    const col=['w_dual_sword_fire','w_dual_sword_water','w_dual_sword_thunder','w_dual_sword_ice'].indexOf(w.key);
    if(star&&col>=0){const source=await load('/assets/characters/weapon-directions-v7/dual-star.png');trim=cut(source,col*source.width/4,0,source.width/4,source.height);}
    else{const source=await load(star?w.star:w.held);trim=cut(source,0,0,source.width/2,source.height/2);}
   }else trim=cut(await load(star?w.starIcon:w.icon));
   const g=trim.getContext('2d')!;image=trim as unknown as HTMLImageElement;options={...registerWeaponPixels(g.getImageData(0,0,trim.width,trim.height).data,trim.width,trim.height,w.weaponType,w.key==='w_siege_arbalest'),verticalArt:false};
  }
  const spec=(directions as Record<string,{path:string;row:number;rows:number}>)[w.key];
  // Keep the two approved demo views exactly; all other ranged weapons have their own artwork.
  if(spec&&!(preserve&&['w_secret_tide','w_secret_solar'].includes(w.key))){const sheet=await load(spec.path),cw=sheet.width/4,ch=sheet.height/spec.rows;options.verticalFrames=[0,1].map(back=>cut(sheet,(back+(star?2:0))*cw,spec.row*ch,cw,ch));}
  if(preserve&&['w_secret_tide','w_secret_solar'].includes(w.key)){const sheet=await load('/assets/characters/wardrobe-v5/'+(w.weaponType==='bow'?'bow':'gun')+'-vertical.png');options.verticalFrames=[0,1].map(col=>cut(sheet,col*sheet.width/2,0,sheet.width/2,sheet.height));}
  return {image,directional,options};
 })();cache.set(key,cached);cached.catch(()=>cache.delete(key));return cached;
}
