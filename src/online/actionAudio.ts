import type Phaser from 'phaser';
import {townSoundLevel}from './presentation';
export const BOSS_STAB_PATH='assets/online/action-audio-v1/boss-sword-stab-deep.wav';
export function actionSoundVolume(scene:Phaser.Scene){return townSoundLevel(scene.registry.get('onlineAudio'),scene.sound.mute,scene.game.config.audio.noAudio||new URLSearchParams(location.search).get('mute')==='1'||document.hidden,'hit');}
export function playBossStab(scene:Phaser.Scene){const volume=actionSoundVolume(scene);if(volume>0&&scene.cache.audio.exists('boss_sword_stab'))scene.sound.play('boss_sword_stab',{volume});}
/** The loop belongs to one presentation and is destroyed on skip, close and scene shutdown. */
export function createGachaRattle(scene:Phaser.Scene){let loop:Phaser.Sound.BaseSound|undefined;const stop=()=>{loop?.stop();loop?.destroy();loop=undefined;};const check=()=>{if(loop&&actionSoundVolume(scene)<=0)stop();};scene.events.on('update',check);scene.events.once('shutdown',stop);return{stop,phase(value:string){stop();if(value!=='spinning'||actionSoundVolume(scene)<=0||!scene.cache.audio.exists('gacha_rattle'))return;loop=scene.sound.add('gacha_rattle',{loop:true,volume:actionSoundVolume(scene)*.75});loop.play();},destroy(){stop();scene.events.off('update',check);scene.events.off('shutdown',stop);}};}
