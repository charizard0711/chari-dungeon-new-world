import type Phaser from 'phaser';

export const baseEquipmentKey=(key?:string|null)=>key?.replace(/^star_/,'').replace(/^((?:armor_)?pumpkin)_(?:male|female)$/,'$1')??'';
export const isEquipmentVariant=(key?:string|null)=>!!key?.startsWith('star_');
const newSlots=['armor','shield','gloves','boots','necklace'] as const;
type VariantSlot=typeof newSlots[number];
type RGB=readonly [number,number,number];
type Palette=readonly [RGB,RGB,RGB];
const palettes:Record<VariantSlot,Palette>={
 armor:[[79,14,124],[247,52,153],[255,220,91]],
 shield:[[9,74,92],[20,223,184],[227,255,99]],
 gloves:[[93,12,69],[243,57,78],[255,201,83]],
 boots:[[53,25,132],[140,70,255],[112,250,255]],
 necklace:[[83,20,148],[233,67,205],[117,255,228]],
};
export function variantSlot(key:string):VariantSlot|undefined{
 const base=baseEquipmentKey(key);
 return base.startsWith('s_')?'shield':base.startsWith('n_')?'necklace':newSlots.find(slot=>base.startsWith(slot+'_'));
}
export const variantPalette=(slot:VariantSlot)=>palettes[slot];
export function equipmentCatalogKey(slot:string,key:string){
 return (slot==='armor'?'armor_':'')+baseEquipmentKey(key);
}
export function equippedExtraHp(gear:Record<string,unknown>){
 return 50*newSlots.filter(slot=>gear[slot]===true&&isEquipmentVariant(String(gear[slot+'_key']??''))).length;
}
/** Recolors the original shading and keeps every original alpha value. */
export function paintVariant(pixels:ImageData,slot:VariantSlot){
 const [shadow,main,light]=palettes[slot],d=pixels.data,w=pixels.width,h=pixels.height;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4;if(d[i+3]===0)continue;
  const value=(Math.max(d[i],d[i+1],d[i+2])*.58+(d[i]*.25+d[i+1]*.58+d[i+2]*.17)*.42)/255;
  const split=.49+.12*Math.sin(5*x/w+4*y/h);
  const a=value<split?shadow:main,b=value<split?main:light;
  const t=value<split?value/split:(value-split)/(1-split);
  for(let channel=0;channel<3;channel++)d[i+channel]=a[channel]+(b[channel]-a[channel])*t;
 }
}

export function ensureEquipmentVariantTexture(scene:Phaser.Scene,key:string){
 const slot=isEquipmentVariant(key)?variantSlot(key):undefined;
 if(!slot||scene.textures.exists(key))return;
 const frame=scene.textures.getFrame(baseEquipmentKey(key));
 if(!frame||frame.cutWidth<8||frame.cutHeight<8)return;
 const source=frame.source.image as CanvasImageSource;
 if(source instanceof HTMLImageElement&&source.src.startsWith('data:'))return;
 const canvas=document.createElement('canvas');
 canvas.width=128;canvas.height=128;
 const g=canvas.getContext('2d')!;
 g.drawImage(source,frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,0,0,128,128);
 const pixels=g.getImageData(0,0,128,128);paintVariant(pixels,slot);g.putImageData(pixels,0,0);
 scene.textures.addCanvas(key,canvas);
}
