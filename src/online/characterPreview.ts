import type Phaser from 'phaser';
import {EquipmentRenderer} from '../equipmentRenderer';
import {makeWeapon,makeShield} from '../player';
import {isPlayerArmor,playerFrameIndex,playerSheetKey,playerSheetPath,versionedPlayerAssetPath} from '../playerAppearance';
import type {OnlineCharacter} from './worldApi';

const queues=new WeakMap<Phaser.Scene,Promise<void>>();
export function equippedCharacterAppearance(character:OnlineCharacter){
  const armor=character.gear.armor&&isPlayerArmor(character.gear.armor_key)?character.gear.armor_key:'leather';
  const weapon=character.gear.weapon?character.gear.weapon_key??'w_iron_dagger':null;
  const shield=character.gear.shield?character.gear.shield_key??null:null;
  return {armor,weapon,shield,sheet:playerSheetKey(character.gender,armor),path:playerSheetPath(character.gender,armor)};
}

async function loadAppearance(scene:Phaser.Scene,character:OnlineCharacter){
  const look=equippedCharacterAppearance(character),keys=new Set([look.sheet,'w_soldier_blade','s_iron_round','katana_waist_fitting_v3','katana_scabbard_v2','fx_hw_aura_a','fx_hw_aura_b']);
  for(const id of [look.weapon,look.shield])if(id){const key=id.replace(/^star_/,'');for(const art of [id,key,`held_${key}`,`sheath_${id}`])keys.add(art);}
  const manifest=scene.registry.get('assetManifest') as any[]??[];
  let queued=0;
  for(const entry of manifest.filter(e=>keys.has(e.key))){
    const source=scene.textures.exists(entry.key)?scene.textures.get(entry.key).getSourceImage() as HTMLImageElement:undefined;
    if(source?.tagName==='IMG'&&!source.src.startsWith('data:'))continue;
    if(scene.textures.exists(entry.key))scene.textures.remove(entry.key);
    const path=versionedPlayerAssetPath(entry.path);
    if(entry.kind==='spritesheet')scene.load.spritesheet(entry.key,path,entry.config);else scene.load.image(entry.key,path);
    queued++;
  }
  if(look.weapon?.startsWith('star_')&&!(scene.textures.exists(look.weapon)&&(scene.textures.get(look.weapon).getSourceImage() as HTMLImageElement).src?.includes('/star-weapons-v1/'))){if(scene.textures.exists(look.weapon))scene.textures.remove(look.weapon);scene.load.image(look.weapon,`assets/star-weapons-v1/${look.weapon}.webp`);queued++;}
  if(look.weapon?.startsWith('star_w_katana_')){const key=`sheath_${look.weapon}`;if(!scene.textures.exists(key)){scene.load.image(key,`assets/katana-sheaths-v1/${key}.webp`);queued++;}}
  if(queued)await new Promise<void>(resolve=>{const done=()=>{scene.load.off('complete',done);scene.events.off('shutdown',done);resolve();};scene.load.once('complete',done);scene.events.once('shutdown',done);scene.load.start();});
  return look;
}

/** Snapshot the same equipment layers used by the town and the solo paper doll. */
export function mountCharacterPreview(scene:Phaser.Scene,character:OnlineCharacter){
  const root=document.createElement('div');root.className='online-character-preview';root.setAttribute('role','img');root.setAttribute('aria-label',`${character.name}の装備中の見た目`);root.dataset.previewState='loading';
  const status=document.createElement('span');status.textContent='装備を読み込み中…';root.append(status);
  const previous=queues.get(scene)??Promise.resolve();
  const task=previous.catch(()=>{}).then(async()=>{
    if(!root.isConnected||!scene.sys.isActive())return;
    const look=await loadAppearance(scene,character);
    if(!root.isConnected||!scene.sys.isActive())return;
    const before=new Set(scene.children.list),origin=-2000;
    const body=scene.add.image(origin,origin,look.sheet,playerFrameIndex('down','idle')).setDisplaySize(128,128).setDepth(10);
    const layers=new EquipmentRenderer(scene);
    const weapon=look.weapon?makeWeapon(look.weapon.replace(/^star_/,''),[]):null;
    if(weapon)weapon.starred=look.weapon!.startsWith('star_');
    layers.update(body,weapon,look.shield?makeShield(look.shield):null,'down','idle',character.gender);
    const objects=scene.children.list.filter(object=>!before.has(object));
    const texture=scene.add.renderTexture(origin,origin,176,176).setVisible(false);
    let disposed=false;const cleanup=()=>{if(disposed)return;disposed=true;texture.destroy();for(const object of objects)if(object.active)object.destroy();scene.events.off('shutdown',cleanup);};
    scene.events.once('shutdown',cleanup);
    scene.events.once('postupdate',()=>{
      if(!scene.sys.isActive()||!root.isConnected){cleanup();return;}
      const visible=[body,layers.weapon,layers.offhand,layers.scabbard,layers.waistFitting].filter(image=>image.visible).map(image=>image.getBounds());const left=Math.min(...visible.map(b=>b.left)),right=Math.max(...visible.map(b=>b.right)),top=Math.min(...visible.map(b=>b.top)),bottom=Math.max(...visible.map(b=>b.bottom));(texture.texture as Phaser.Textures.DynamicTexture).camera.setZoom(Math.min(1,160/(right-left),160/(bottom-top))).centerOn((left+right)/2,(top+bottom)/2);texture.draw(objects.filter((object:any)=>object.visible).sort((a:any,b:any)=>(a.depth??0)-(b.depth??0)));
      texture.snapshot(image=>{
        if(root.isConnected&&'naturalWidth' in image&&image.naturalWidth>0){
          const canvas=document.createElement('canvas');canvas.width=canvas.height=176;canvas.getContext('2d')!.drawImage(image,0,0);
          root.replaceChildren(canvas);root.dataset.previewState='ready';root.dataset.armor=look.armor;root.dataset.weapon=look.weapon??'';root.dataset.shield=look.shield??'';
        }
        cleanup();
      });
    });
  }).catch(()=>{if(root.isConnected){status.textContent='見た目を読み込めませんでした';root.dataset.previewState='error';}});
  queues.set(scene,task);
  return root;
}
