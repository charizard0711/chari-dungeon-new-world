import assert from 'node:assert/strict';
import {partyCanSee,terrainVisibility}from '../src/online/adventure/visibility';
const ground=(x:number,y:number)=>x===4||x===5;
for(const px of [4,5]){
 const sources=[{x:px,y:6}],sight=(x:number,y:number)=>partyCanSee(x,y,sources,3,(x,y)=>!ground(x,y));
 const terrain=terrainVisibility(12,13,sight,ground);
 for(let y=3;y<=9;y++){assert(terrain(3,y),'left wall follows the visible corridor');assert(terrain(6,y),'right wall follows the visible corridor');}
 for(let y=0;y<13;y++)for(let x=0;x<12;x++)if(ground(x,y))assert.equal(terrain(x,y),sight(x,y),'floor sight must never expand');
 assert(!terrain(2,6),'no propagation through wall thickness');assert(!sight(7,6),'enemy behind wall remains hidden');
}
// Adjacent hidden chamber is not disclosed by the decorative wall reveal.
const rooms=(x:number,y:number)=>x>=1&&x<=3&&y>=1&&y<=8||x>=5&&x<=8&&y>=1&&y<=8;
const sight=(x:number,y:number)=>partyCanSee(x,y,[{x:3,y:4}],3,(x,y)=>!rooms(x,y));
const terrain=terrainVisibility(10,10,sight,rooms);assert(terrain(4,4));assert(!terrain(5,4));assert(!terrain(6,4));
// A second ally still contributes their own floor and adjoining wall visibility.
const party=(x:number,y:number)=>partyCanSee(x,y,[{x:4,y:2},{x:5,y:9}],3,(x,y)=>!ground(x,y));
const shared=terrainVisibility(12,13,party,ground);assert(shared(3,11));assert(shared(6,11));
console.log('PASS symmetric corridor walls, unchanged floor/entity sight, no wall propagation, shared ally sight');
