import type Phaser from 'phaser';
import {recentRequestTimings} from './requestTiming';
/** Bounded local diagnostics. No accounts, coordinates, chat, inventory or network upload. */
export function mountPerformanceTrace(scene:Phaser.Scene){
 const key='zero.performance.v1',samples:any[]=[];try{const saved=sessionStorage.getItem(key);if(saved&&saved.length<20000){const parsed=JSON.parse(saved);if(Array.isArray(parsed))samples.push(...parsed.slice(-24));}}catch{}let frames=0,elapsed=0,last=performance.now(),slow=0;
 const update=()=>{const now=performance.now(),dt=now-last;last=now;if(document.hidden)return;frames++;elapsed+=dt;if(dt>250)slow++;if(elapsed<5000)return;
 const s=scene as any,a=s.packet?.adventure,snapshot=a?.snapshot,requests=recentRequestTimings().slice(-20).map(r=>r.ms).sort((a,b)=>a-b);
 samples.push({at:Date.now(),dungeon:!!a?.inside,frameMeanMs:Math.round(elapsed/frames*10)/10,slowFrames:slow,objects:scene.children.length,textures:Object.keys(scene.textures.list).length,tweens:scene.tweens.getTweens().length,updateListeners:scene.events.listenerCount('postupdate'),enemies:snapshot?.enemies?.length??0,webs:snapshot?.webs?.length??0,requestP95Ms:requests[Math.floor(requests.length*.95)]??0,heapMB:Math.round(((performance as any).memory?.usedJSHeapSize??0)/1048576)});
 if(samples.length>24)samples.shift();const value=JSON.stringify(samples);scene.game.canvas.dataset.performanceReport=value;try{sessionStorage.setItem(key,value);}catch{}frames=0;elapsed=0;slow=0;
 };const visibility=()=>{last=performance.now();};document.addEventListener('visibilitychange',visibility);scene.events.on('postupdate',update);const destroy=()=>{document.removeEventListener('visibilitychange',visibility);scene.events.off('postupdate',update);scene.events.off('shutdown',destroy);};scene.events.once('shutdown',destroy);return {destroy};
}
