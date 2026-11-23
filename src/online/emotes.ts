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
export function setEmoteVoice(enabled:boolean){localStorage.setItem('zero-emote-voice',enabled?'on':'off');if(!enabled&&'speechSynthesis' in window)window.speechSynthesis.cancel();}
let lastSpoken=0;
/** Only fixed emotes are spoken; history, arbitrary chat and muted tests are never read aloud. */
export function speakEmote(scene:any,message:string){
 const emote=emoteFromMessage(message),audio=scene.registry.get('onlineAudio');
 if(!emote||!emoteVoiceEnabled()||!audio?.seOn||audio.seVolume<=0||scene.sound.mute||scene.game.config.audio.noAudio||new URLSearchParams(location.search).get('mute')==='1'||document.hidden||!('speechSynthesis' in window))return;
 const now=Date.now();if(now-lastSpoken<1800)return;lastSpoken=now;
 const synth=window.speechSynthesis;if(synth.speaking||synth.pending)return;
 const voices=synth.getVoices().filter(v=>/^ja(?:-|_)/i.test(v.lang));
 const voice=voices.find(v=>/Nanami|Haruka|Kyoko|O-Ren|女性|female/i.test(v.name))??voices[0];
 // No Japanese voice installed: retain the bubble rather than use another language's pronunciation.
 if(!voice)return;
 const u=new SpeechSynthesisUtterance(emote.label);u.voice=voice;u.lang='ja-JP';u.pitch=1.13;u.rate=1.04;u.volume=Math.min(1,audio.seVolume*2);synth.speak(u);
}
