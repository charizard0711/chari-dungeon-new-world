import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ADVENTURE_CONFIG as C,ADVENTURE_AREAS,ADVENTURE_MONSTERS,adventureBlocked} from '../src/online/adventure/layout';
import {townPath} from '../src/online/gridPath';
const start={x:5,y:14},blocked=(keys:string[])=>(x:number,y:number)=>adventureBlocked(x,y,{keys});
for(const a of ADVENTURE_AREAS){
 assert.ok(!blocked(['amber','violet'])(a.sx,a.sy),`${a.id} spawn is walkable`);
 assert.ok(a.id==='entry'||townPath(start,{x:a.sx,y:a.sy},[],blocked(['amber','violet'])).length,`${a.id} must be reachable`);
}
for(const id of ['guardian','weaver']){const m=ADVENTURE_MONSTERS.find(m=>m.id===id)!;assert.ok(townPath(start,m,[],blocked([])).length,`${id} key must be obtainable before gates open`);}
assert.equal(townPath(start,{x:78,y:17},[],blocked([])).length,0,'boss sanctum is locked');
assert.equal(townPath(start,{x:66,y:6},[],blocked([])).length,0,'treasury is locked');
const migration=fs.readFileSync('supabase/migrations/202611200007_online_dungeon_rebuild.sql','utf8');
assert.ok(migration.includes(JSON.stringify(C).replace(/'/g,"''")),'SQL map must match client map');
console.log('PASS: all areas and key guardians reachable, key gates block sanctum/vault, SQL map matches client.');
