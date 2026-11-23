import assert from 'node:assert/strict';
import {makeHousingDb} from './housing-test-db.mjs';
process.on('uncaughtException',e=>{console.error(e.message);process.exit(1);});
const {db,login,rpc}=await makeHousingDb();
try{const ids=['11111111-1111-4111-8111-111111111111','21111111-1111-4111-8111-111111111111'];const chars=[];
for(const [i,id]of ids.entries()){await db.query('insert into auth.users values($1)',[id]);await login(id);const s=await rpc('create_character',{name:'Pin'+i,gender:'male'});chars.push(s.characters[0].id);await rpc('join',{character_id:chars[i]});}
await db.exec('update online_presence set x=3,y=9');await login(ids[0]);await assert.rejects(rpc('map_pin',{scope:'room',x:1,y:1}),/ダンジョン/);
let s=await rpc('room_create',{name:'Latency Test'});const room=s.adventure.id;
s=await rpc('map_pin',{scope:'room',x:49,y:77});assert.equal(s.mapPins.length,1);assert.equal(s.mapPins[0].scope,'room');
await assert.rejects(rpc('map_pin',{scope:'party',x:49,y:77}),/共有先/);
await login(ids[1]);assert.equal((await rpc('poll')).mapPins.length,0);await rpc('room_join',{room_id:room});assert.equal((await rpc('poll')).mapPins.length,1);
await login(ids[0]);await rpc('party_create');await rpc('party_invite',{character_id:chars[1]});await login(ids[1]);s=await rpc('poll');await rpc('party_accept',{id:s.partyInvites[0].id});
s=await rpc('map_pin',{scope:'party',x:50,y:76});assert.equal(s.mapPins.filter(p=>p.scope==='party').length,1);
await login(ids[0]);assert.equal((await rpc('poll')).mapPins.filter(p=>p.scope==='party').length,1);
await db.query('update online_adventure_members set x=50,y=23 where character_id=$1',[chars[0]]);
const enemy=JSON.stringify({x:50,y:21,hp:100,dir:'down'});assert.equal((await db.query('select online_turn_target($1,$2)target',[room,enemy])).rows[0].target,null,'outside arena players cannot trigger boss targets');
await db.exec("update online_map_pins set created_at=clock_timestamp()-interval '31 seconds'");assert.equal((await rpc('poll')).mapPins.length,0);
const f=(await db.query("select prosrc from pg_proc where proname='online_world_pre_target_turns'")).rows[0].prosrc;assert.ok(!f.includes('pg_advisory_xact_lock(71390119)'));
console.log('PASS shared room pin, isolation, expiry, membership and scoped nested locks');
}finally{await db.close();}
