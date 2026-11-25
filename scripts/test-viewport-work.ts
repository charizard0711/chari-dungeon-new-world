import assert from 'node:assert/strict';import {terrainVisibility,lineOfSight}from '../src/online/adventure/visibility';import {townPath}from '../src/online/gridPath';
const w=115,h=108,clip={x:40,y:30,r:64,b:50},wall=(x:number,y:number)=>x===55&&y!==40;
let fullCalls=0,clippedCalls=0;
const visible=(x:number,y:number)=>x>=clip.x&&x<=clip.r&&y>=clip.y&&y<=clip.b&&lineOfSight(48,40,x,y,wall);
const full=terrainVisibility(w,h,(x,y)=>{fullCalls++;return visible(x,y);},(x,y)=>!wall(x,y));
const clipped=terrainVisibility(w,h,(x,y)=>{clippedCalls++;return visible(x,y);},(x,y)=>!wall(x,y),clip);
for(let y=clip.y;y<=clip.b;y++)for(let x=clip.x;x<=clip.r;x++)assert.equal(clipped(x,y),full(x,y),`${x},${y}`);
assert(clippedCalls<fullCalls*.06);let checks=0;assert.deepEqual(townPath({x:3,y:3},{x:4,y:3},[],()=>{checks++;return false;}),[{x:4,y:3}]);assert.equal(checks,1);
console.log(`PASS identical viewport wall sight; tile checks ${fullCalls} -> ${clippedCalls}; adjacent walking avoids BFS`);
