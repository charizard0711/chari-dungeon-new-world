import {actionSoundVolume} from './actionAudio';
const NPC_VOICES=['guide','merchant','barber','lottery','housing'];
export function preloadNpcVoices(scene:any){for(const id of NPC_VOICES)if(!scene.cache.audio.exists('npc_voice_'+id))scene.load.audio('npc_voice_'+id,`assets/online/npc-voices-v1/${id}-v2.wav`);}
let current:any,last=0;
export function stopNpcVoice(){current?.stop();current?.destroy();current=undefined;}
export function playNpcVoice(scene:any,id:string){if(!NPC_VOICES.includes(id)||actionSoundVolume(scene)<=0||Date.now()-last<900||!scene.cache.audio.exists('npc_voice_'+id))return;last=Date.now();stopNpcVoice();const sound=scene.sound.add('npc_voice_'+id,{volume:Math.min(.65,(scene.registry.get('onlineAudio')?.seVolume??.2)*2)});current=sound;sound.once('complete',()=>{sound.destroy();if(current===sound)current=undefined;});sound.play();}
export function installNpcVoice(scene:any){const check=()=>{if(actionSoundVolume(scene)<=0)stopNpcVoice();};scene.events.on('update',check);scene.events.once('shutdown',()=>{stopNpcVoice();scene.events.off('update',check);});}
