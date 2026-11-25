import type Phaser from 'phaser';
import type {WorldState} from '../worldApi';
import {townSoundLevel} from '../presentation';

export const PANEL_SOUNDS=['heal','attack_up','defense_up','attack_down','defense_down','paralysis'] as const;
export type PanelSound=typeof PANEL_SOUNDS[number];
export function preloadPanelAudio(scene:Phaser.Scene){
 for(const kind of PANEL_SOUNDS)if(!scene.cache.audio.exists(`panel_${kind}`))scene.load.audio(`panel_${kind}`,`assets/online/panel-audio-v1/${kind}.wav`);
}

/** Compare authoritative packets only: prediction, polling and joining must not replay effects. */
export function panelSoundsForChange(before:WorldState|undefined,after:WorldState):PanelSound[]{
 if(before?.active?.id&&before.active.id===after.active?.id&&after.active?.location==='town'&&(after.townHeal??0)>(before.townHeal??0))return ['heal'];
 const a=before?.adventure,b=after.adventure,cid=after.active?.id;
 if(!a?.inside||!b?.inside||!cid||cid!==before?.active?.id||a.id!==b.id||a.floor!==b.floor)return [];
 const old=a.snapshot,next=b.snapshot,result:PanelSound[]=[];
 const used=new Set(old.panelHealUsed?.[cid]??[]);
 if((next.panelHealUsed?.[cid]??[]).some(id=>!used.has(id)))result.push('heal');
 const moved=a.x!==b.x||a.y!==b.y;
 const landing=moved?next.effectPanels?.find(p=>!p.destroyed&&p.x===b.x&&p.y===b.y):undefined;
 for(const kind of ['attack_up','defense_up','attack_down','defense_down'] as const){
  const buff=next.panelBuffs?.[cid]?.[kind],previous=old.panelBuffs?.[cid]?.[kind];
  if(buff&&(!previous||buff.source!==previous.source||landing?.id===buff.source))result.push(kind);
 }
 // The server updates shock time when consuming the lost turn too; that is not another activation.
 if((next.panelParalysis?.[cid]??0)>(old.panelParalysis?.[cid]??0)||landing?.kind==='paralysis'&&(next.panelParalysis?.[cid]??0)>0)result.push('paralysis');
 return result;
}

export function playPanelChanges(scene:Phaser.Scene,before:WorldState|undefined,after:WorldState){
 const effects=panelSoundsForChange(before,after);
 const volume=townSoundLevel(scene.registry.get('onlineAudio'),scene.sound.mute,
  scene.game.config.audio.noAudio||new URLSearchParams(location.search).get('mute')==='1'||document.hidden,'equip');
 if(volume<=0)return;
 for(const kind of effects){const key=`panel_${kind}`;if(scene.cache.audio.exists(key))scene.sound.play(key,{volume:volume*.75});}
}
