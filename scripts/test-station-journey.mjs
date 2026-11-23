import assert from 'node:assert/strict';import {makeHousingDb} from './housing-test-db.mjs';
process.on('uncaughtException',e=>{console.error(e.message,e.where);process.exit(1);});
const {db,login,rpc}=await makeHousingDb();try{
const uid='11111111-1111-4111-8111-111111111111';await db.query('insert into auth.users values($1)',[uid]);await login(uid);let s=await rpc('create_character',{name:'RailTest',gender:'male'});const cid=s.characters[0].id;await rpc('join',{character_id:cid});await db.exec('update online_presence set x=3,y=9');s=await rpc('room_create',{name:'Rail test'});const rid=s.adventure.id;
await db.query('update online_characters set gold=2000 where id=$1',[cid]);
await assert.rejects(rpc('interact',{id:'rail_entry'}),/ボス/);
await db.query('insert into online_rail_unlocks(character_id,floor)values($1,1)',[cid]);await db.query('update online_adventure_members set x=49,y=82 where character_id=$1',[cid]);s=await rpc('interact',{id:'rail_entry'});assert.equal(s.adventure.railGates.entry,true);
await db.query('update online_adventure_members set x=51,y=100 where character_id=$1',[cid]);s=await rpc('move',{x:51,y:101});assert.equal(s.active.gold,1500);assert.ok(s.adventure.railTrip);assert.equal(s.adventure.railTrip.reverse,false);
await db.query("update online_adventure_members set rail_trip=jsonb_set(rail_trip,'{started}',to_jsonb(online_adventure_now_ms()-21000))where character_id=$1",[cid]);s=await rpc('poll');assert.equal(s.adventure.railTrip,null);assert.deepEqual([s.adventure.x,s.adventure.y],[50,39]);
s=await rpc('interact',{id:'rail_board_boss'});assert.equal(s.active.gold,1000);assert.equal(s.adventure.railTrip.reverse,true);
await db.query("update online_adventure_members set rail_trip=jsonb_set(rail_trip,'{started}',to_jsonb(online_adventure_now_ms()-21000))where character_id=$1",[cid]);s=await rpc('poll');assert.deepEqual([s.adventure.x,s.adventure.y],[51,101]);assert.equal(s.adventure.railTrip,null);
assert.equal((await db.query("select (data->>'height')::int h from online_adventure_config where id='floor1'")).rows[0].h,108);
console.log('PASS station unlock, gate, automatic panel boarding, 500G each trip, authoritative round-trip arrival, retained room and expanded map');
}finally{await db.close();}
