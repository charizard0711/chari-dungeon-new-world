import {isEquipmentVariant,variantPalette,variantSlot,paintVariant} from '../equipmentVariants';
import type {Atlas, Frame} from './motion';

const colors: Record<string, readonly [number, number, number]> = {
 leather:[158,90,46], chain:[160,177,188], plate:[104,155,206],
 arcane:[157,103,223], dragon:[218,65,48], dawn:[243,211,137],
 aqua:[141,231,248], crimson:[183,59,80],
 pumpkin_knight:[244,151,37], pumpkin_witch:[199,103,211],
};

export function wornGearColor(key?:string){
 const slot=key&&isEquipmentVariant(key)?variantSlot(key):undefined;
 if(slot==='boots'||slot==='gloves')return variantPalette(slot)[1];
 return key ? colors[key.replace(/^(gloves|boots)_/,'')] : undefined;
}

type Material = NonNullable<ReturnType<typeof wornGearColor>>;
const bootFrames = new Map<Frame, Map<Material, HTMLCanvasElement>>();
export function coloredBootFrame(body:Atlas, frame:Frame, color:Material){
 let variants=bootFrames.get(frame);
 const cached=variants?.get(color);
 if(cached)return cached;
 if(!variants){
  if(bootFrames.size>=160)bootFrames.delete(bootFrames.keys().next().value!);
  variants=new Map();
  bootFrames.set(frame,variants);
 }
 if(variants.size>=4)variants.delete(variants.keys().next().value!);
 const canvas=document.createElement('canvas');
 const top=Math.min(frame.ch-1,Math.max(0,Math.floor(frame.root[1]-9/body.scale)));
 canvas.width=frame.cw;
 canvas.height=frame.ch-top;
 const ctx=canvas.getContext('2d')!;
 ctx.drawImage(body.image,frame.sx,frame.sy+top,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
  const i=(y*canvas.width+x)*4;
  if(!pixels.data[i+3])continue;
  const light=(pixels.data[i]*.25+pixels.data[i+1]*.6+pixels.data[i+2]*.15)/145;
  const welt=Math.abs(y-2/body.scale)<.35/body.scale;
  for(let channel=0;channel<3;channel++){
   pixels.data[i+channel]=Math.min(255,color[channel]*(.24+light*.82)+(welt?24:0));
  }
 }
 ctx.putImageData(pixels,0,0);
 variants.set(color,canvas);
 return canvas;
}

const armorFrames=new WeakMap<Frame,{canvas:HTMLCanvasElement;top:number}>();
const armorSleeves=new WeakMap<HTMLCanvasElement,HTMLCanvasElement>();

export function recoloredGear(source:CanvasImageSource,slot:Parameters<typeof paintVariant>[1],width:number,height:number,sx=0,sy=0){
 const canvas=document.createElement('canvas');
 canvas.width=width;canvas.height=height;
 const g=canvas.getContext('2d')!;
 g.drawImage(source,sx,sy,width,height,0,0,width,height);
 const pixels=g.getImageData(0,0,width,height);
 paintVariant(pixels,slot);g.putImageData(pixels,0,0);
 return canvas;
}

export function coloredArmorFrame(body:Atlas,frame:Frame){
 let armor=armorFrames.get(frame);
 if(!armor){
  const top=Math.max(0,Math.floor(frame.root[1]-24/body.scale));
  const bottom=Math.min(frame.ch,Math.max(top+1,Math.ceil(frame.root[1]-10/body.scale)));
  armor={canvas:recoloredGear(body.image,'armor',frame.cw,bottom-top,frame.sx,frame.sy+top),top};
  armorFrames.set(frame,armor);
 }
 return armor;
}

export function coloredArmorSleeve(source:HTMLCanvasElement){
 let canvas=armorSleeves.get(source);
 if(!canvas){canvas=recoloredGear(source,'armor',source.width,source.height);armorSleeves.set(source,canvas);}
 return canvas;
}
