import type Phaser from 'phaser';
import {expansionEquipmentKey} from './townEquipment';
let game:Phaser.Game|undefined;
const pending=new Set<string>();
const failedUntil=new Map<string,number>();
export function configureLazyEquipmentArt(value:Phaser.Game){game=value;pending.clear();failedUntil.clear();}
/** Swap a fully loaded texture atomically, preserving atlas frames and sprite sizes. */
export function requestEquipmentArt(key:string):string {
 if(!game||pending.has(key)||(failedUntil.get(key)??0)>Date.now())return key;
 if(game.textures.exists(key)){
  const source=game.textures.get(key).getSourceImage() as HTMLImageElement;
  if(source?.tagName==='IMG'&&!source.src.startsWith('data:'))return key;
 }
 const scene=game.scene.getScenes(true).find(s=>s.sys.settings.key==='OnlineTownScene')??game.scene.getScenes(true)[0];
 if(!scene)return key;
 const manifest=game.registry.get('assetManifest') as {key:string;kind:string;path:string;config?:any}[]|undefined;
 const entry=manifest?.find(e=>e.key===key);
 const starred=key.startsWith('star_w_')||key.startsWith('sheath_star_');
 if(!entry&&!starred)return key;
 const folder=expansionEquipmentKey(key.replace(/^sheath_/, '').replace(/^star_/,''))?'online/equipment-v2':key.startsWith('sheath_')?'katana-sheaths-v1':'star-weapons-v1';
 const path=entry?.path??`assets/${folder}/${key}.webp`,kind=entry?.kind==='spritesheet'?'spritesheet':'image',temporary=`lazy_${key}`;
 pending.add(key);
 const stopped=()=>{pending.delete(key);scene.load.off('loaderror',failed);scene.load.off(`filecomplete-${kind}-${temporary}`,complete);};
 const failed=(file:any)=>{if(file.key!==temporary)return;scene.events.off('shutdown',stopped);pending.delete(key);failedUntil.set(key,Date.now()+10000);scene.load.off('loaderror',failed);scene.load.off(`filecomplete-${kind}-${temporary}`,complete);};
 const complete=()=>{
  scene.events.off('shutdown',stopped);scene.load.off('loaderror',failed);
  if(!game?.textures.exists(temporary)){pending.delete(key);return;}
  const images:Phaser.GameObjects.Image[]=[];
  const visit=(objects:Phaser.GameObjects.GameObject[])=>{for(const object of objects){const image=object as Phaser.GameObjects.Image;if(image.texture?.key===key)images.push(image);const children=(object as Phaser.GameObjects.Container).list;if(Array.isArray(children))visit(children);}};
  for(const active of game.scene.getScenes(true))visit(active.children.list);
  const replacements=images.map(image=>({image,width:image.displayWidth,height:image.displayHeight,frame:image.frame.name}));
  if(game.textures.exists(key))game.textures.remove(key);
  game.textures.renameTexture(temporary,key);
  const texture=game.textures.get(key);
  for(const {image,width,height,frame} of replacements)if(image.active)image.setTexture(key,texture.has(frame)?frame:undefined).setDisplaySize(width,height);
  pending.delete(key);game.textures.emit('addtexture',key,texture);scene.events.emit('refresh');
 };
 scene.events.once('shutdown',stopped);scene.load.once(`filecomplete-${kind}-${temporary}`,complete);scene.load.on('loaderror',failed);
 if(kind==='spritesheet')scene.load.spritesheet(temporary,path,entry!.config);else scene.load.image(temporary,path);
 scene.load.start();return key;
}
