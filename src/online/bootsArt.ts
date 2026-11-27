import {BOOTS_DEFS,GLOVES_DEFS} from '../townEquipment';
export function preloadBoots(scene:any){if(!scene.textures.exists(BOOTS_DEFS[0].key))scene.load.image('boots_source','assets/online/boots-v1/boots.png');}
export function prepareBoots(scene:any){if(scene.textures.exists(BOOTS_DEFS[0].key))return;const image=scene.textures.get('boots_source').getSourceImage(),w=image.width/5,h=image.height/2;BOOTS_DEFS.forEach((b,i)=>{const c=document.createElement('canvas');c.width=c.height=128;c.getContext('2d')!.drawImage(image,i%5*w,Math.floor(i/5)*h,w,h,0,0,128,128);scene.textures.addCanvas(b.key,c);});scene.textures.remove('boots_source');}

export function preloadGloves(scene:any){if(!scene.textures.exists(GLOVES_DEFS[0].key))scene.load.image("gloves_source","assets/online/gloves-v1/gloves.png");}
export function prepareGloves(scene:any){
 if(scene.textures.exists(GLOVES_DEFS[0].key))return;
 const image=scene.textures.get('gloves_source').getSourceImage();
 const width=image.width/5,height=image.height/2;
 const cell=document.createElement('canvas');
 cell.width=Math.floor(width);
 cell.height=Math.floor(height);
 const source=cell.getContext('2d',{willReadFrequently:true})!;
 GLOVES_DEFS.forEach((glove,index)=>{
  source.clearRect(0,0,cell.width,cell.height);
  source.drawImage(image,index%5*width,Math.floor(index/5)*height,width,height,0,0,cell.width,cell.height);
  const pixels=source.getImageData(0,0,cell.width,cell.height);
  // The atlas includes a translucent matte outside the glove silhouettes.
  // Remove it before resampling so the matte cannot bleed into the icon edges.
  for(let alpha=3;alpha<pixels.data.length;alpha+=4){
   pixels.data[alpha]=(pixels.data[alpha]-196)*255/(235-196);
  }
  source.putImageData(pixels,0,0);
  const icon=document.createElement('canvas');
  icon.width=icon.height=128;
  icon.getContext('2d')!.drawImage(cell,0,0,128,128);
  scene.textures.addCanvas(glove.key,icon);
 });
 scene.textures.remove('gloves_source');
}
