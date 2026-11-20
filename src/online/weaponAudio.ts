import type Phaser from 'phaser';
import {townSoundLevel} from './presentation';

export const WEAPON_AUDIO = {
 swing:'assets/online/weapon-audio-v1/sword.wav',
 heavy:'assets/online/weapon-audio-v1/greatsword.wav',
 bow:'assets/online/weapon-audio-v1/bow.wav',
 handgun:'assets/online/weapon-audio-v1/handgun.wav'
} as const;
export function weaponSound(type?:string){
 return type==='greatsword'?'heavy':type==='bow'?'bow':type==='handgun'?'handgun':type&&type!=='unarmed'?'swing':undefined;
}
export function playTownWeaponSound(scene:Phaser.Scene,type?:string){
 const kind=weaponSound(type);if(!kind)return;
 const volume=townSoundLevel(scene.registry.get('onlineAudio'),scene.sound.mute,
  scene.game.config.audio.noAudio||new URLSearchParams(location.search).get('mute')==='1','equip')*(.18/.35);
 const key=`online_weapon_${kind}`;
 if(volume>0&&scene.cache.audio.exists(key))scene.sound.play(key,{volume});
}
