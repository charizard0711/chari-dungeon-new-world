import type Phaser from 'phaser';
import {interactionAt,canInteract} from './townInteractions';
import {MAP_X,MAP_Y,MAP_W,MAP_H} from '../layout';
import {TOWN_TILE,TRAINING_TARGET} from './townLayout';
import './online.css';

export interface TownAudioSettings {seOn:boolean;seVolume:number;}

/** Read the shared audio settings at playback time, including after opening settings. */
export function townSoundLevel(audio:TownAudioSettings|undefined,muted:boolean,noAudio:boolean,kind:'hit'|'step'|'equip'|'jingle'|'pickup'|'drop') {
  if(!audio?.seOn||muted||noAudio)return 0;
  return Math.max(0,Math.min(1,audio.seVolume))*(kind==='step'?.12:kind==='hit'?.5:.35);
}

export function playTownSound(scene:Phaser.Scene,kind:'hit'|'step'|'equip'|'jingle'|'pickup'|'drop') {
  const volume=townSoundLevel(scene.registry.get('onlineAudio'),scene.sound.mute,
    scene.game.config.audio.noAudio||new URLSearchParams(location.search).get('mute')==='1',kind);
  const key=`online_charia_${kind}`;
  if(volume>0&&scene.cache.audio.exists(key))scene.sound.play(key,{volume,rate:kind==='step'?.96+Math.random()*.08:1});
}

export function entryMessageId(messages:readonly {id:number}[]) {
  return Math.max(0,...messages.map(message=>Number(message.id)));
}
export function messagesAfterEntry<T extends {id:number}>(messages:readonly T[],afterId:number):T[] {
  return messages.filter(message=>Number(message.id)>afterId);
}

/** A canvas-scoped CSS cursor wins over Phaser's built-in hand pointer. */
export function installGamePresentation(game:Phaser.Game,audio?:TownAudioSettings) {
  if(!game.canvas){game.events.once('ready',()=>installGamePresentation(game,audio));return;}
  if(audio)game.registry.set('onlineAudio',audio);
  if(game.registry.get('gamePresentationInstalled'))return;
  game.registry.set('gamePresentationInstalled',true);
  const canvas=game.canvas;
  const preload=canvas.ownerDocument.createElement('link');preload.rel='preload';preload.as='image';preload.href=new URL('assets/new-world/title-world-v1.webp',canvas.ownerDocument.baseURI).href;canvas.ownerDocument.head.append(preload);
  canvas.classList.add('chari-game-cursor');
  const update=()=>{
    let cursor='arrow';
    const town=game.scene.keys.OnlineTownScene as any;
    const solo=game.scene.keys.GameScene as any;
    const scene=town?.sys.isActive()?town:solo?.sys.isActive()?solo:undefined;
    if(scene){
      const pointer=scene.input.activePointer,hud=scene===town?scene.hud:game.scene.keys.UIScene;
      if(hud?.overlayMode==='none'&&pointer.x>=MAP_X&&pointer.x<MAP_X+MAP_W&&pointer.y>=MAP_Y&&pointer.y<MAP_Y+MAP_H&&!hud?.isSkillPointer?.(pointer.x,pointer.y)){
        const point=scene.cameras.main.getWorldPoint(pointer.x,pointer.y),size=scene===town?TOWN_TILE:32;
        const x=Math.floor(point.x/size),y=Math.floor(point.y/size);
        const npc=scene===town&&!scene.inDungeon?(scene.hoverInteraction??interactionAt(x,y)):undefined;
        if(scene.hoverHousing)cursor='interact';else if(scene.inDungeon&&scene.adventureHover)cursor='interact';else if(npc&&canInteract(scene.player,npc))cursor=npc.cursor;
        else if(scene===town&&scene.skillArmed)cursor='skill';
        else if(scene===town?(scene.inDungeon?!!scene.enemyAt(x,y):x===TRAINING_TARGET.x&&y===TRAINING_TARGET.y):!!scene.enemyAt?.(x,y))cursor='attack';
      }
    }
    if(canvas.dataset.gameCursor!==cursor)canvas.dataset.gameCursor=cursor;
  };
  game.events.on('poststep',update);
  game.events.once('destroy',()=>game.events.off('poststep',update));
  update();
}
