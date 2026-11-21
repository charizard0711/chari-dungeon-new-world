import {loadCharacterRig,loadRigImage,rigArtOptions,cropPortrait} from './characterRig';
import weapons from '../motionLab/weapons.json';
import {drawOriginalRig} from '../motionLab/originalWeaponRig';
import type Phaser from 'phaser';
import {isPlayerArmor,playerSheetKey,playerSheetPath} from '../playerAppearance';
import type {OnlineCharacter} from './worldApi';

export function equippedCharacterAppearance(character:OnlineCharacter){
  const armor=character.gear.armor&&isPlayerArmor(character.gear.armor_key)?character.gear.armor_key:'leather';
  const weapon=character.gear.weapon?character.gear.weapon_key??'w_iron_dagger':null;
  const shield=character.gear.shield?character.gear.shield_key??null:null;
  return {armor,weapon,shield,sheet:playerSheetKey(character.gender,armor),path:playerSheetPath(character.gender,armor)};
}

/** Canvas-only selection portrait: never removes textures used by the live town. */
export function mountCharacterPreview(scene:Phaser.Scene,character:OnlineCharacter){
 const root=document.createElement('div');root.className='online-character-preview';root.setAttribute('role','img');root.setAttribute('aria-label',`${character.name}の装備中の見た目`);root.dataset.previewState='loading';
 const status=document.createElement('span');status.textContent='装備を読み込み中…';root.append(status);
 void(async()=>{
  const look=equippedCharacterAppearance(character),rig=await loadCharacterRig(character.gender,look.armor,character.hair_color??'brown');
  const def=weapons.find(w=>w.key===look.weapon?.replace(/^star_/,'')),star=!!look.weapon?.startsWith('star_'),path=star?def?.star:def?.held;
  const art=path?await loadRigImage(path):document.createElement('canvas');
  const manifest=scene.registry.get('assetManifest') as any[]??[],shieldEntry=manifest.find(e=>e.key===look.shield);
  const shield=shieldEntry?await loadRigImage(shieldEntry.path):undefined;
  const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d')!;g.translate(128,176);
  const type=def?.weaponType??'dagger';
  drawOriginalRig(g,rig.body,rig.arms,art as HTMLImageElement,type,star?!!def?.starDirectional:!!def?.directional,'down',0,false,false,2,false,{...rigArtOptions(def,star),shield:def&&['greatsword','lance','bow','dual_sword'].includes(type)?undefined:shield});
  if(root.isConnected){root.replaceChildren(cropPortrait(c));root.dataset.previewState='ready';root.dataset.armor=look.armor;root.dataset.weapon=look.weapon??'';root.dataset.shield=look.shield??'';}
 })().catch(()=>{if(root.isConnected){status.textContent='見た目を読み込めませんでした';root.dataset.previewState='error';}});
 return root;
}
