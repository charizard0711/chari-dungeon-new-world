import fs from 'node:fs/promises';
import ts from 'typescript';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const transpile=async path=>ts.transpileModule(await fs.readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText.replace(/^import .*;\r?$/gm,'');
const code=await transpile('src/online/presentation.ts')+'\n'+await transpile('src/online/adventure/railAudio.ts');
const {createRailAudio,RAIL_AUDIO}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
globalThis.location={search:''};globalThis.document={hidden:false};
const settings={seOn:true,seVolume:.5},sounds=[];
const scene={registry:{get:()=>settings},cache:{audio:{exists:()=>true}},game:{config:{audio:{noAudio:false}}},sound:{mute:false,add(key,options){const s={key,...options,stopped:false,destroyed:false,play(o){this.seek=o?.seek??0;return true;},once(){},setVolume(v){this.volume=v;},setRate(r){this.rate=r;},stop(){this.stopped=true;},destroy(){this.destroyed=true;}};sounds.push(s);return s;}}};
let audio=createRailAudio(scene),trip={started:1000,duration:20000,reverse:false};
audio.update(trip,1000);const loop=sounds[0];assert.equal(loop.key,'rail_run');
for(let now=1100;now<18000;now+=100)audio.update({...trip},now);
assert.equal(sounds.length,1,'poll packets must not restart running loop');assert(loop.volume>0);assert.equal(loop.rate,1);
audio.update(trip,18000);audio.update(trip,19000);assert.equal(sounds.filter(s=>s.key==='rail_brake').length,1);
audio.update(trip,21000);audio.update(trip,22000);audio.update(null,23000);
assert.equal(sounds.filter(s=>s.key==='rail_arrival').length,1);assert(loop.destroyed);
trip={started:30000,duration:20000,reverse:true};audio.update(trip,40000);assert.equal(sounds.at(-1).key,'rail_run');assert.equal(sounds.at(-1).seek,2);
const count=sounds.length;audio.update(null,41000);assert(sounds.at(-1).destroyed);assert.equal(sounds.length,count,'cancel is not an arrival');audio.destroy();
for(const guard of ['url','noAudio','mute','off','zero','hidden']){
 location.search=guard==='url'?'?mute=1':'';scene.game.config.audio.noAudio=guard==='noAudio';scene.sound.mute=guard==='mute';settings.seOn=guard!=='off';settings.seVolume=guard==='zero'?0:.5;document.hidden=guard==='hidden';
 audio=createRailAudio(scene);const before=sounds.length;audio.update(trip,31000);audio.update(trip,48000);audio.update(trip,50000);audio.destroy();assert.equal(sounds.length,before,guard+' must never create sounds');
}
location.search='';scene.game.config.audio.noAudio=false;scene.sound.mute=false;settings.seOn=true;settings.seVolume=.5;document.hidden=false;
audio=createRailAudio(scene);audio.update(trip,32000);const active=sounds.at(-1);settings.seVolume=0;audio.update(trip,33000);assert(active.destroyed,'live mute stops current loop');audio.destroy();
const credits=JSON.parse(await fs.readFile('public/assets/online/railway-audio-v1/CREDITS.json','utf8'));
for(const source of credits.sources){const file=await fs.readFile('public/'+RAIL_AUDIO[source.asset.split('.')[0]]);assert.equal(createHash('sha256').update(file).digest('hex'),source.sha256);assert(file.length<100000);}
console.log('PASS: mock-only train audio: loop deduplication, braking/arrival timing, reverse trip, cancel, late join, all mute guards, teardown and asset hashes.');
