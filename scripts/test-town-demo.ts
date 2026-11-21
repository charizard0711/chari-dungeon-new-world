import assert from 'node:assert/strict';
import {houses,blocked,props,MIN_X,MAX_X,MIN_Y,MAX_Y} from '../src/townDemo/map';
import {townPath} from '../src/online/gridPath';
import {plazaObjects} from '../src/townDemo/plaza';
assert.equal(houses.length,12);assert.equal(new Set(houses.map(h=>h.id)).size,12);
for(const h of houses){
 assert(!blocked(h.doorX,h.doorY+1),h.id+' approach');
 assert(!blocked(h.doorX,h.plotY+12),h.id+' gate');
 const route=townPath({x:12,y:14},{x:h.doorX,y:h.doorY+1},[],blocked);
 assert(route.length>0,h.id+' must be reachable from plaza');
 assert(route.every(p=>!blocked(p.x,p.y)));assert(blocked(h.x,h.y));
}
for(const p of props.filter(p=>p.solid))assert(blocked(p.x,p.y),p.kind);
for(const p of [{x:12,y:MIN_Y},{x:12,y:MAX_Y},{x:MIN_X,y:9},{x:MAX_X,y:9}])assert(townPath({x:12,y:14},p,[],blocked).length>0,'cardinal exit');
console.log('PASS: 12 doors, 12 garden gates, 4 cardinal exits reachable; all solid props block movement.');
for(const p of [{x:12,y:0},{x:12,y:18},{x:0,y:9},{x:24,y:9}])assert(townPath({x:12,y:14},p,[],blocked).length>0,'plaza entrance');
for(const o of plazaObjects.filter(o=>o.label&&o.key!=='npcs')){
 const p={x:o.x+Math.floor(o.w/2),y:o.y+o.h};
 assert(!blocked(p.x,p.y),o.label+' approach');assert(townPath({x:12,y:14},p,[],blocked).length>0,o.label+' reachable');
}
console.log('PASS: all four plaza entrances and shop approaches remain open.');
