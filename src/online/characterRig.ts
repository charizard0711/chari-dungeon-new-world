import type Phaser from 'phaser';
import assets from '../motionLab/wardrobe-assets.json';
import weapons from '../motionLab/weapons.json';
import {wardrobeAtlas,type CostumeAsset,COSTUMES} from '../motionLab/wardrobe';
import {drawOriginalRig,parseLimbParts,type LimbParts} from '../motionLab/originalWeaponRig';
import {registerVerticalRanged} from '../motionLab/verticalRanged';
import type {Atlas,Point} from '../motionLab/motion';
import {playerAction} from '../playerAnimation';
import {PLAYER_WALK_FRAMES,type PlayerVisualFrame,type PlayerGender} from '../playerAppearance';
import type {Dir,Weapon,Shield} from '../types';
import {isTwoHanded} from '../equipmentRules';

const images=new Map<string,Promise<HTMLImageElement>>(),looks=new Map<string,Promise<{body:Atlas;arms:LimbParts}>>();
const catalog=assets as Record<string,CostumeAsset>;
export function rigArtOptions(sheet:typeof weapons[number]|undefined,star:boolean){
 const type=sheet?.weaponType??'dagger',directional=star?sheet?.starDirectional:sheet?.directional;
 let grip:Point|undefined,basis:number|undefined;
 if(star&&!directional){grip=type==='bow'?[.5,.5]:[.8,.8];basis=type==='bow'?0:-Math.PI*3/4;}
 else if(directional&&type==='katana'){grip=[.5,.8];basis=-Math.PI/2;}
 else if(directional&&type==='handgun'){grip=[.25,.5];basis=0;}
 else if(sheet?.key==='w_hw_coffin'){grip=[.5,.16];basis=Math.PI/2;}
 return {grip,basis,verticalArt:!star&&(sheet?.key==='w_secret_tide'||sheet?.key==='w_secret_solar')};
}
export function cropPortrait(canvas:HTMLCanvasElement){const out=document.createElement('canvas');out.width=out.height=176;const pixels=canvas.getContext('2d')!.getImageData(0,0,256,256).data;let x0=256,y0=256,x1=0,y1=0;for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(pixels[(y*256+x)*4+3]>20){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}if(x1>=x0){const w=x1-x0+1,h=y1-y0+1,s=Math.min(160/w,160/h);out.getContext('2d')!.drawImage(canvas,x0,y0,w,h,(176-w*s)/2,(176-h*s)/2,w*s,h*s);}return out;}
export function loadRigImage(path:string){let promise=images.get(path);if(!promise){promise=new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>{images.delete(path);reject(Error('Character asset failed: '+path));};i.src=path;});images.set(path,promise);}return promise;}
export function loadCharacterRig(gender:PlayerGender,armor:string,hair='brown'){
 const selected=armor.startsWith('pumpkin_')?'pumpkin_'+gender:armor,id=selected+'_'+gender,key=id+'_'+hair;
 let promise=looks.get(key);if(!promise){const asset=catalog[id]??catalog['leather_'+gender];promise=Promise.all([loadRigImage(asset.path),loadRigImage(asset.arms)]).then(([body,arms])=>({body:wardrobeAtlas(body,asset,hair,COSTUMES.some(c=>c.key===selected&&'hood'in c&&c.hood)),arms:parseLimbParts(arms)}));looks.set(key,promise);promise.catch(()=>looks.delete(key));if(looks.size>32)looks.delete(looks.keys().next().value!);}return promise;
}
let serial=0,angles:Promise<void>|undefined;
export async function prepareCharacterAppearance(gender:PlayerGender,armor:string,hair:string,weaponKey?:string|null){const starred=!!weaponKey?.startsWith('star_'),sheet=weapons.find(w=>w.key===weaponKey?.replace(/^star_/,'')),path=starred?sheet?.star:sheet?.held;await Promise.all([loadCharacterRig(gender,armor,hair),path?loadRigImage(path):Promise.resolve()]);}
type Args=[Phaser.GameObjects.Image,Weapon|null,Shield|null,Dir,PlayerVisualFrame,PlayerGender,number,boolean];
/** A small isolated texture per actor, uploaded only when its pose changes.
 * The original image remains the interaction/position anchor, with an empty crop.
 * No updates to physics, combat timing, player state, or saved equipment. */
export class CharacterRig {
 readonly image:Phaser.GameObjects.Image;
 private texture:Phaser.Textures.CanvasTexture;
 private args?:Args;private bound?:Phaser.GameObjects.Image;
 private look?:{body:Atlas;arms:LimbParts};private art?:HTMLImageElement;private sheet?:typeof weapons[number];private lookKey='';private artKey='';private signature='';private nextDraw=0;private disposed=false;
 constructor(private scene:Phaser.Scene,private onReady:()=>void=()=>{}){
  const key='character-rig-v6-'+(++serial);this.texture=scene.textures.createCanvas(key,256,256)!;this.image=scene.add.image(0,0,key).setVisible(false);
  scene.events.on('postupdate',this.refresh,this);scene.events.once('shutdown',this.destroy,this);
  angles??=Promise.all([['handgun','gun'],['bow','bow']].map(async([type,file])=>registerVerticalRanged(type,await loadRigImage('/assets/characters/wardrobe-v5/'+file+'-vertical.png')))).then(()=>{}).catch(()=>{angles=undefined;});
 }
 update(...args:Args){this.args=args;if(this.bound!==args[0]){this.bound=args[0];this.bound.once('destroy',this.destroy,this);}return this.refresh();}
 private refresh(){
  if(this.disposed||!this.args)return false;
  const [body,weapon,shield,dir,frame,gender,elapsed,enabled]=this.args;
  if(!body.active){this.destroy();return false;}
  const armor=body.texture.key.replace(/^player_(male|female)_/,'');
  const hair=String(body.getData('hairColor')??'brown'),lookKey=gender+':'+armor+':'+hair;
  if(lookKey!==this.lookKey){this.lookKey=lookKey;this.look=undefined;loadCharacterRig(gender,armor,hair).then(look=>{if(!this.disposed&&this.lookKey===lookKey){this.look=look;this.signature='';}}).catch(()=>{});}
  const sheet=weapons.find(w=>w.key===weapon?.key),artKey=weapon?(weapon.starred?sheet?.star:sheet?.held)??'':'';
  if(artKey!==this.artKey){this.artKey=artKey;this.art=undefined;this.sheet=sheet;if(artKey)loadRigImage(artKey).then(art=>{if(!this.disposed&&this.artKey===artKey){this.art=art;this.signature='';}}).catch(()=>{});}
  if(!this.look||(weapon&&!this.art)||weapon&&!sheet){body.setCrop();this.image.setVisible(false);return false;}
  const action=playerAction(frame),attack=action==='attack'||action==='windup',walk=action==='walk',heavy=weapon?.key==='w_hero_sword',windup=heavy?200:58,duration=heavy?460:268;
  const t=attack?Math.min(1,(elapsed+(action==='attack'?windup:0))/duration):walk?Number(body.getData('walkPhase')??Math.max(0,PLAYER_WALK_FRAMES.indexOf(frame as typeof PLAYER_WALK_FRAMES[number]))/PLAYER_WALK_FRAMES.length):0;
  const phase=attack?Math.round(t*24):walk?Math.floor(t*8):0;
  const signature=[lookKey,artKey,shield?.key,dir,action,phase].join('|');
  if(signature!==this.signature&&(this.scene.time.now>=this.nextDraw||!this.signature)){
   this.nextDraw=this.scene.time.now+1000/30;this.signature=signature;
   const g=this.texture.context;g.clearRect(0,0,256,256);g.save();g.translate(128,176);
   const type=weapon?.weaponType??'dagger',blank=document.createElement('canvas');blank.width=blank.height=1;
   let shieldArt:HTMLImageElement|undefined;
   if(shield&&!isTwoHanded(weapon)&&this.scene.textures.exists(shield.key)){const source=this.scene.textures.get(shield.key).getSourceImage() as HTMLImageElement;if(source?.tagName==='IMG')shieldArt=source;}
   drawOriginalRig(g,this.look.body,this.look.arms,this.art??blank as unknown as HTMLImageElement,type,weapon?.starred?!!sheet?.starDirectional:!!sheet?.directional,dir,t,attack,walk,2,false,{...rigArtOptions(sheet,!!weapon?.starred),shield:shieldArt});
   g.restore();this.texture.refresh();
  }
  body.setCrop(0,0,0,0);this.onReady();
  const scale=body.displayWidth/43.52/2;
  const offset=body.displayHeight*.41;
  this.image.setPosition(body.x-Math.sin(body.rotation)*offset,body.y+Math.cos(body.rotation)*offset).setOrigin(.5,176/256).setScale(scale).setRotation(body.rotation).setDepth(body.depth+.01).setAlpha(body.alpha).setVisible(enabled&&body.visible&&frame!=='down');
  return true;
 }
 destroy(){if(this.disposed)return;this.disposed=true;this.scene.events.off('postupdate',this.refresh,this);this.scene.events.off('shutdown',this.destroy,this);this.bound?.off('destroy',this.destroy,this);this.image.destroy();this.scene.textures.remove(this.texture.key);}
}
