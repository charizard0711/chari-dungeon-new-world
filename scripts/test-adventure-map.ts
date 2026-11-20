import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ADVENTURE_CONFIG as C,ADVENTURE_AREAS,ADVENTURE_MONSTERS,adventureBlocked} from '../src/online/adventure/layout';
import {townPath} from '../src/online/gridPath';
const start=C.spawn,blocked=(keys:string[])=>(x:number,y:number)=>adventureBlocked(x,y,{keys});
for(const a of ADVENTURE_AREAS){
 assert.ok(!blocked(['amber','violet'])(a.sx,a.sy),`${a.id} spawn is walkable`);
 assert.ok(a.id==='entry'||townPath(start,{x:a.sx,y:a.sy},[],blocked(['amber','violet'])).length,`${a.id} must be reachable`);
}
for(const id of ['guardian','weaver']){const m=ADVENTURE_MONSTERS.find(m=>m.id===id)!;assert.ok(townPath(start,m,[],blocked([])).length,`${id} key must be obtainable before gates open`);}
assert.equal(townPath(start,{x:116,y:35},[],blocked([])).length,0,'boss sanctum is locked');
assert.equal(townPath(start,{x:95,y:11},[],blocked([])).length,0,'treasury is locked');
const migration=fs.readFileSync('supabase/migrations/202611200009_online_map_a.sql','utf8');
assert.ok(migration.includes(JSON.stringify({...C,enemies:C.enemies.filter(e=>!e.id.startsWith('pop_'))}).replace(/'/g,"''")),'SQL map must match client map');
console.log('PASS: all areas and key guardians reachable, key gates block sanctum/vault, SQL map matches client.');

assert.equal(C.width,128);assert.equal(C.height,60);const approved=JSON.parse(fs.readFileSync('src/online/adventure/floor1-a.json','utf8'));assert.deepEqual(C.rows,approved.rows);assert.deepEqual(C.solids,approved.solids);console.log('PASS: approved A drawing and live floor share exact cells, solid footprints and dimensions.');

const population=fs.readFileSync('supabase/migrations/202611200012_online_mob_population.sql','utf8');assert.ok(population.includes(JSON.stringify(C.enemies).replace(/'/g,"''")));assert.equal(C.enemies.filter(e=>!('boss' in e)&&!('elite' in e)).length,56);for(const e of C.enemies)assert.ok(!blocked(['amber','violet'])(e.x,e.y),e.id+' walkable');assert.equal(new Set(C.enemies.map(e=>e.x+','+e.y)).size,C.enemies.length);
