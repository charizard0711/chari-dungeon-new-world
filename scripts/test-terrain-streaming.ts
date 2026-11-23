import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {terrainChunks,streamTerrain} from '../src/online/adventure/terrainChunks';
let max=0;for(let y=0;y<94*48;y+=48)for(let x=0;x<115*48;x+=48){const list=terrainChunks({x,y,width:374,height:428},115,94);max=Math.max(max,list.length);assert(list.every(p=>p.x>=0&&p.y>=0&&p.x<115&&p.y<94));}assert(max<=9);
const events=new EventEmitter(),camera={scrollX:2200,scrollY:3500,width:374,height:428,zoom:1};let live=0,peak=0,created=0;
streamTerrain({events,cameras:{main:camera}},115,94,()=>{live++;created++;peak=Math.max(peak,live);let disposed=false;return{destroy(){assert(!disposed);disposed=true;live--;}}});
events.emit('postupdate');const initial=created;events.emit('postupdate');assert.equal(created,initial);for(let i=0;i<30;i++){camera.scrollX=i%2?200:4700;camera.scrollY=i%2?300:3500;events.emit('postupdate');assert(live<=9);}assert(peak<=9);events.emit('shutdown');assert.equal(live,0);assert.equal(events.listenerCount('postupdate'),0);
const before=48*768*768*4/1024/1024,after=max*384*384*4/1024/1024;console.log(`PASS bounded residency, eviction before teleport allocations, shutdown cleanup; floor RGBA bound ${before.toFixed(1)} -> ${after.toFixed(1)} MiB (mobile)`);
