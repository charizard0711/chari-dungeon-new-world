import type Phaser from 'phaser';
import {townSoundLevel} from './presentation';

// Desktop CHARIA (GridWeaponSoundProfiles), not the legacy action prototype.
export const IMPACT_TYPES=['longsword','dagger','katana','greatsword','lance','bow','crossbow','handgun','dual_sword','dual-second'] as const;
export const impactPath=(type:string)=>`assets/online/weapon-impact-v2/hit-c-${type}.wav`;
export function impactType(type?:string){
  if(type==='twin_daggers')return 'dual_sword';
  return IMPACT_TYPES.some(t=>t===type)?type!:'longsword';
}
export function playWeaponImpact(scene:Phaser.Scene,type?:string){
  const selected=impactType(type);
  const play=(cue:string)=>{
    const volume=townSoundLevel(scene.registry.get('onlineAudio'),scene.sound.mute,
      scene.game.config.audio.noAudio||new URLSearchParams(location.search).get('mute')==='1','hit')*(.47/.5);
    const key=`online_impact_${cue}`;
    if(volume>0&&scene.cache.audio.exists(key))scene.sound.play(key,{volume,rate:1});
  };
  play(selected);
  if(selected==='dual_sword')scene.time.delayedCall(140,()=>play('dual-second'));
}
