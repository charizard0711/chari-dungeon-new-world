import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ADVENTURE_CONFIG as C,adventureBlocked}from '../src/online/adventure/layout';
const state={keys:['amber','violet'],bridge:{phase:'up'}};
const seen=new Set<string>(),queue=[C.spawn];
for(let i=0;i<queue.length;i++){const p=queue[i],key=p.x+','+p.y;if(seen.has(key)||adventureBlocked(p.x,p.y,state))continue;seen.add(key);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])queue.push({x:p.x+dx,y:p.y+dy});}
for(const p of [{x:49,y:79},{x:52,y:26}])assert(seen.has(p.x+','+p.y),'station landing is connected to maze');
assert(adventureBlocked(49,80,state));assert(adventureBlocked(53,26,state));
const sql=fs.readFileSync('supabase/migrations/202611220006_online_boss_railway.sql','utf8');
const json=JSON.parse(sql.match(/set data='(.*)'::jsonb where id='floor1'/)![1].replace(/''/g,"'"));assert.deepEqual(json.rows,C.rows);assert.deepEqual(json.props,C.props);
assert.equal(C.rows.length,C.height);assert(C.rows.every(row=>row.length===C.width));
console.log('PASS connected stations, solid turnstiles, shared server/client map and dimensions');
