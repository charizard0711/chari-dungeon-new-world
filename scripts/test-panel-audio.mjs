import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import assert from 'node:assert/strict';
const transpile=async p=>ts.transpileModule(await fs.readFile(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText.replace(/^import .*;\r?$/gm,'');
const code=await transpile('src/online/presentation.ts')+'\n'+await transpile('src/online/adventure/panelAudio.ts');
const {panelSoundsForChange:change,playPanelChanges,preloadPanelAudio,PANEL_SOUNDS}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const base={active:{id:'me'},adventure:{id:'room',inside:true,floor:1,x:1,y:1,snapshot:{panelHealUsed:{},panelBuffs:{},panelParalysis:{},panelShocks:{},effectPanels:[]}}};
const next=()=>structuredClone(base);
let heal=next();heal.adventure.snapshot.panelHealUsed.me=['h'];
assert.deepEqual(change(base,heal),['heal']);assert.deepEqual(change(heal,structuredClone(heal)),[]);
assert.deepEqual(change(undefined,heal),[]);let join=next();join.adventure.inside=false;assert.deepEqual(change(join,heal),[]);
let other=structuredClone(heal);other.active.id='buddy';assert.deepEqual(change(base,other),[]);
other=structuredClone(heal);other.adventure.id='other';assert.deepEqual(change(base,other),[]);
other=structuredClone(heal);other.adventure.floor=2;assert.deepEqual(change(base,other),[]);
assert.deepEqual(change(base,next()),[],'full HP / unconsumed heal is silent');
for(const kind of PANEL_SOUNDS.filter(k=>k!=='heal'&&k!=='paralysis')){
 const buff=next();buff.adventure.snapshot.panelBuffs.me={[kind]:{source:'p',rate:1.2}};
 assert.deepEqual(change(base,buff),[kind]);assert.deepEqual(change(buff,structuredClone(buff)),[]);
 const again=structuredClone(buff);again.adventure.x=2;again.adventure.snapshot.effectPanels=[{id:'p',kind,x:2,y:1}];assert.deepEqual(change(buff,again),[kind]);
 assert.deepEqual(change(buff,base),[],'expiry/destruction is silent');
}
const stun=next();stun.adventure.snapshot.panelParalysis.me=1;stun.adventure.snapshot.panelShocks.me=100;
assert.deepEqual(change(base,stun),['paralysis']);assert.deepEqual(change(stun,structuredClone(stun)),[]);
const skipped=structuredClone(stun);skipped.adventure.snapshot.panelParalysis.me=0;skipped.adventure.snapshot.panelShocks.me=200;
assert.deepEqual(change(stun,skipped),[],'lost turn does not replay paralysis');
globalThis.location={search:''};globalThis.document={hidden:false};
const settings={seOn:true,seVolume:.5},played=[],loaded=[];
const scene={registry:{get:()=>settings},cache:{audio:{exists:()=>true}},game:{config:{audio:{noAudio:false}}},sound:{mute:false,play:(...args)=>played.push(args)},load:{audio:(...args)=>loaded.push(args)}};
playPanelChanges(scene,base,heal);assert.equal(played.length,1);assert.equal(played[0][0],'panel_heal');
for(const guard of ['url','noAudio','mute','off','zero','hidden']){
 location.search=guard==='url'?'?mute=1':'';scene.game.config.audio.noAudio=guard==='noAudio';scene.sound.mute=guard==='mute';settings.seOn=guard!=='off';settings.seVolume=guard==='zero'?0:.5;document.hidden=guard==='hidden';
 const n=played.length;playPanelChanges(scene,base,heal);assert.equal(played.length,n,guard);
}
scene.cache.audio.exists=()=>false;preloadPanelAudio(scene);assert.equal(loaded.length,6);
for(const [,path]of loaded){const bytes=await fs.readFile('public/'+path);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.readUInt32LE(24),48000);assert.equal(bytes.readUInt16LE(22),2);assert.equal(bytes.readUInt16LE(34),24);}
assert.equal(createHash('sha256').update(await fs.readFile('public/assets/online/panel-audio-v1/heal.wav')).digest('hex'),'85520f8e8e9afec53315dcef9723b48c2e186bb7d0157c7c698dea71d830fbe2','approved preview stays exact');
console.log('PASS mock-only panel audio: confirmed effects, polling/join dedup, reactivation, lost-turn silence, own character, all mute guards, six 48kHz/24-bit assets, exact approved heal.');
