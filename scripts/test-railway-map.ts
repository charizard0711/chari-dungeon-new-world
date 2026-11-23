import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ADVENTURE_CONFIG as C,adventureBlocked}from '../src/online/adventure/layout';
const state={keys:['amber','violet'],bridge:{phase:'up'},railGates:{entry:true,boss:true}};
const seen=new Set<string>(),queue=[C.spawn];
for(let i=0;i<queue.length;i++){const p=queue[i],key=p.x+','+p.y;if(seen.has(key)||adventureBlocked(p.x,p.y,state))continue;seen.add(key);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])queue.push({x:p.x+dx,y:p.y+dy});}
for(const p of [{x:51,y:101},{x:50,y:39}])assert(seen.has(p.x+','+p.y),'station landing is connected to maze '+JSON.stringify(p));
assert(adventureBlocked(49,83,{railGates:{}}));assert(!adventureBlocked(49,83,state));
const sql=fs.readFileSync('supabase/migrations/202611230003_online_station_architecture.sql','utf8');
const json=JSON.parse(sql.split('$station$')[1]);assert.deepEqual(json.rows,C.rows);assert.deepEqual(json.props,C.props);
assert.equal(C.rows.length,C.height);assert(C.rows.every(row=>row.length===C.width));
console.log('PASS connected stations, solid turnstiles, shared server/client map and dimensions');

import {RAIL_ROUTE,railPose}from '../src/online/adventure/railRoute';
for(let i=1;i<RAIL_ROUTE.length;i++)assert.equal(Math.abs(RAIL_ROUTE[i].x-RAIL_ROUTE[i-1].x)+Math.abs(RAIL_ROUTE[i].y-RAIL_ROUTE[i-1].y),1);
assert.deepEqual([railPose({started:0,duration:20000,reverse:false},0).x,railPose({started:0,duration:20000,reverse:false},20000).y],[52,39]);
console.log('PASS contiguous actual-map route and trip endpoints');
