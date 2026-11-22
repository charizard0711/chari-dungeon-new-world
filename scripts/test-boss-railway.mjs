import assert from 'node:assert/strict';
import {makeHousingDb} from './housing-test-db.mjs';
const {db,login,rpc}=await makeHousingDb();
try{
 const uid='11111111-1111-4111-8111-111111111111';await db.query('insert into auth.users values($1)',[uid]);await login(uid);
 let s=await rpc('create_character',{name:'RailTest',gender:'male'});const cid=s.characters[0].id;await rpc('join',{character_id:cid});await db.exec('update online_presence set x=4,y=10 where user_id=auth.uid()');s=await rpc('room_create',{name:'RailTest'});const rid=s.adventure.id;
 const place=async(x,y)=>{await db.query("update online_adventure_members set x=$1,y=$2,attack_at='epoch' where character_id=$3",[x,y,cid]);await db.exec("update online_presence set seen_at=clock_timestamp(),moved_at='epoch',location='dungeon'");};
 await place(49,79);await assert.rejects(rpc('interact',{id:'rail_entry'}),/ボス/);assert.equal((await rpc('poll')).adventure.railUnlocked,false);
 await place(47,15);s=await rpc('poll');assert.equal(s.adventure.snapshot.bossEncounter.phase,'opening');assert.equal(s.adventure.railUnlocked,false);
 await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{bossEncounter,at}',to_jsonb(online_adventure_now_ms()-3000))where id=$1",[rid]);s=await rpc('poll');assert.equal(s.adventure.snapshot.bossEncounter.phase,'battle');assert.equal(s.adventure.railUnlocked,true);

 await place(49,82);await db.query('update online_characters set gold=2000 where id=$1',[cid]);
 await assert.rejects(rpc('move',{x:49,y:83}),/改札/);
 s=await rpc('interact',{id:'rail_entry'});assert.equal(s.adventure.railGates.entry,true);assert.equal(s.active.gold,2000);assert.equal(s.adventure.x,49);assert.equal(s.adventure.y,82);
 await assert.rejects(rpc('interact',{id:'rail_board_entry'}),/そば/);
 await db.exec("update online_presence set moved_at='epoch'");s=await rpc('move',{x:49,y:83});assert.equal(s.adventure.y,83,'open gate walkable');
 await place(49,86);s=await rpc('move',{x:49,y:87});assert(s.adventure.railTrip);assert.equal(s.active.gold,1500);assert.deepEqual([s.adventure.x,s.adventure.y],[49,88]);
 s=await rpc('interact',{id:'rail_board_entry'});assert.equal(s.active.gold,1500,'double click charged once');
 await assert.rejects(rpc('move',{x:50,y:88}),/乗車中/);await assert.rejects(rpc('attack',{dir:'up'}),/乗車中/);
 await db.query("update online_adventure_members set rail_trip=jsonb_set(rail_trip,'{started}',to_jsonb(online_adventure_now_ms()-10000))where character_id=$1",[cid]);s=await rpc('poll');assert.equal(s.adventure.x,110);assert(s.adventure.y<88&&s.adventure.y>1,'mid-trip authoritative route position');assert(s.players.find(p=>p.character_id===cid).railTrip);
 // Occupied destination must not overlap another member.
 const other='21111111-1111-4111-8111-111111111111';await db.query('insert into auth.users values($1)',[other]);await login(other);s=await rpc('create_character',{name:'RailOther',gender:'female'});const second=s.characters[0].id;await rpc('join',{character_id:second});await db.exec('update online_presence set x=4,y=10 where user_id=auth.uid()');await rpc('room_join',{room_id:rid});await db.query('update online_adventure_members set x=54,y=29 where character_id=$1',[second]);await login(uid);
 await db.query("update online_adventure_members set rail_trip=jsonb_set(rail_trip,'{started}',to_jsonb(online_adventure_now_ms()-21000))where character_id=$1",[cid]);s=await rpc('poll');assert.equal(s.adventure.railTrip,null);assert.notDeepEqual([s.adventure.x,s.adventure.y],[54,29]);assert(Math.abs(s.adventure.x-54)+Math.abs(s.adventure.y-29)<=2);
 await place(54,29);s=await rpc('interact',{id:'rail_board_boss'});assert.equal(s.active.gold,1000);assert.equal(s.adventure.railTrip.reverse,true);
 await db.query("update online_adventure_members set rail_trip=jsonb_set(rail_trip,'{started}',to_jsonb(online_adventure_now_ms()-21000))where character_id=$1",[cid]);s=await rpc('poll');assert.deepEqual([s.adventure.x,s.adventure.y],[49,87]);assert.equal(s.adventure.railTrip,null);
 await db.query('update online_characters set gold=499 where id=$1',[cid]);await assert.rejects(rpc('interact',{id:'rail_board_entry'}),/500G/);s=await rpc('poll');assert.equal(s.active.gold,499);assert.equal(s.adventure.railTrip,null);
 await login(other);assert.equal((await rpc('poll')).adventure.railUnlocked,false,'unlock is character-specific');
 await db.exec('set role authenticated');await assert.rejects(db.query('insert into online_rail_unlocks(character_id,floor)values($1,1)',[second]));await db.exec('reset role');
 console.log('PASS boss unlock, gate/free opening/walking, automatic boarding, 500G single charge, insufficient funds, ride action lock, server route positions, collision-free arrival, return trip and permissions');
}catch(e){console.error(e.message,e.where??'');process.exitCode=1;}finally{await db.close();}
