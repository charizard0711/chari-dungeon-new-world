import assert from 'node:assert/strict';
import fs from 'node:fs';
import {adventureBgm} from '../src/online/adventure/music';
import {BGM_DEFS} from '../src/audio/config';
import {ADVENTURE_MONSTERS} from '../src/online/adventure/layout';
import type {AdventureState} from '../src/online/adventure/types';

const state={inside:true,status:'active',floor:1,x:10,y:29,snapshot:{enemies:structuredClone(ADVENTURE_MONSTERS),stairs:false}} as unknown as AdventureState;
assert.equal(adventureBgm(null),'title');
assert.equal(adventureBgm(state),'floor01');
state.x=73;state.y=10;assert.equal(adventureBgm(state),'floor01','key guardian is not the floor boss');
state.x=116;state.y=35;assert.equal(adventureBgm(state),'boss','enter floor boss room');
state.snapshot.enemies.find(e=>e.boss)!.hp=0;
assert.equal(adventureBgm(state),'floor01','another player killing the boss restores exploration music');
state.snapshot.enemies.find(e=>e.boss)!.hp=480;
state.x=93;state.y=28;assert.equal(adventureBgm(state),'floor01','leaving boss room restores exploration music');
state.x=116;state.y=35;state.snapshot.stairs=true;assert.equal(adventureBgm(state),'floor01');
state.inside=false;assert.equal(adventureBgm(state),'title');
for(const name of ['boss','floor01'] as const){
 const asset=fs.readFileSync('public/'+BGM_DEFS[name].path);
 assert.ok(asset.length>1_000_000,`${name} selected audio is packaged`);
 assert.ok(asset.subarray(0,3).toString()==='ID3'||asset[0]===0xff,`${name} MP3 header`);
}
console.log('PASS: town, exploration, key guardians, floor boss entry/exit, shared boss death, clear and return music; packaged MP3. No audio played.');
