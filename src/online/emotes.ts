export const EMOTES=[
 {id:'morning',label:'おはよう！',icon:'☀'}, {id:'hello',label:'こんにちは！',icon:'✋'},
 {id:'evening',label:'こんばんは！',icon:'☾'}, {id:'thanks',label:'ありがとう！',icon:'♡'},
 {id:'please',label:'よろしくね！',icon:'✧'}, {id:'goodjob',label:'おつかれさま！',icon:'☕'},
 {id:'sorry',label:'ごめんね！',icon:'🙏'}, {id:'yes',label:'了解！',icon:'✓'},
 {id:'wait',label:'ちょっと待ってね！',icon:'⌛'}, {id:'go',label:'行こう！',icon:'➜'},
 {id:'nice',label:'やったー！',icon:'★'}, {id:'bye',label:'またね！',icon:'✋'},
] as const;
export function emoteFromMessage(message:string){return EMOTES.find(e=>message===`【エモート】${e.label}`);}
export function emoteText(message:string){return emoteFromMessage(message)?.label??message;}
export function emoteVoiceEnabled(){return localStorage.getItem('zero-emote-voice')!=='off';}
export function setEmoteVoice(enabled:boolean){localStorage.setItem('zero-emote-voice',enabled?'on':'off');if(!enabled)stopEmoteVoice();}
export const EMOTE_VOICE_CREDIT='VOICEVOX:春日部つむぎ';
export const emoteVoiceKey=(id:string)=>'online_emote_voice_'+id;
export const emoteVoicePath=(id:string)=>`assets/online/emotes-voice-v1/${id}.wav`;
let lastSpoken=-Infinity;
let currentVoice:{scene:any;sound:any}|undefined;
function stopEmoteVoice(scene?:any){if(currentVoice&&(!scene||currentVoice.scene===scene)){const voice=currentVoice;currentVoice=undefined;voice.sound.stop();voice.sound.destroy();}}
function canSpeak(scene:any){const audio=scene.registry.get('onlineAudio');return emoteVoiceEnabled()&&audio?.seOn&&audio.seVolume>0&&!scene.sound.mute&&!scene.game.config.audio.noAudio&&new URLSearchParams(location.search).get('mute')!=='1'&&!document.hidden;}
export function preloadEmoteVoices(scene:any){for(const e of EMOTES)if(!scene.cache.audio.exists(emoteVoiceKey(e.id)))scene.load.audio(emoteVoiceKey(e.id),emoteVoicePath(e.id));}
/** Stop a clip immediately on mute, voice-off, hidden tab, or leaving the scene. */
export function installEmoteVoice(scene:any){
 const sync=()=>{const voice=currentVoice;if(!voice||voice.scene!==scene)return;if(!canSpeak(scene))stopEmoteVoice(scene);else voice.sound.setVolume(Math.min(1,scene.registry.get('onlineAudio').seVolume*2));};
 document.addEventListener('visibilitychange',sync);scene.events.on('update',sync);
 scene.events.once('shutdown',()=>{stopEmoteVoice(scene);scene.events.off('update',sync);document.removeEventListener('visibilitychange',sync);});
}
/** Play only fixed, locally hosted greeting clips. Never speak chat text or queue voices. */
export function speakEmote(scene:any,message:string){
 const emote=emoteFromMessage(message);if(!emote||!canSpeak(scene)||currentVoice)return;
 const now=Date.now(),key=emoteVoiceKey(emote.id);if(now-lastSpoken<1800||!scene.cache.audio.exists(key))return;
 const sound=scene.sound.add(key,{volume:Math.min(1,scene.registry.get('onlineAudio').seVolume*2)}),voice={scene,sound};currentVoice=voice;
 sound.once('complete',()=>{if(currentVoice===voice)currentVoice=undefined;sound.destroy();});
 if(sound.play())lastSpoken=now;else stopEmoteVoice(scene);
}

export const EMOTE_ART='assets/online/emotes-v1/greetings.png';
export function emoteById(id:string){return EMOTES.find(e=>e.id===id);}
export function emoteFrame(id:string){return EMOTES.findIndex(e=>e.id===id);}
export const EMOTE_ICON_ART='assets/online/emotes-icons-v2/portraits.png';
/** Menu portraits are separate from the original in-world speech bubbles. */
export function emoteArt(id:string){const i=emoteFrame(id);const art=document.createElement('span');art.className='zero-emote-art';art.setAttribute('aria-hidden','true');art.style.backgroundImage=`url('${new URL(EMOTE_ICON_ART,document.baseURI).href}')`;art.style.backgroundPosition=`${(i%4)*100/3}% ${Math.floor(i/4)*50}%`;return art;}
export function prepareEmoteArt(scene:any){const texture=scene.textures.get('online_emotes_v1');if(!texture||texture.has('emote-0'))return;const source=texture.getSourceImage();for(let i=0;i<12;i++){const x=Math.round(i%4*source.width/4),y=Math.round(Math.floor(i/4)*source.height/3),right=Math.round((i%4+1)*source.width/4),bottom=Math.round((Math.floor(i/4)+1)*source.height/3);texture.add('emote-'+i,0,x,y,right-x,bottom-y);}}
