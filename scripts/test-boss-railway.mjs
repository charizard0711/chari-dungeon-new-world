import assert from 'node:assert/strict';
import {makeHousingDb} from './housing-test-db.mjs';
const {db,login,rpc}=await makeHousingDb();
try{
 const uid='11111111-1111-4111-8111-111111111111';await db.query('insert into auth.users values($1)',[uid]);await login(uid);
 let s=await rpc('create_character',{name:'RailTest',gender:'male'});const cid=s.characters[0].id;await rpc('join',{character_id:cid});await db.exec('update online_presence set x=4,y=10 where user_id=auth.uid()');s=await rpc('room_create',{name:'RailTest'});const rid=s.adventure.id;
 const place=async(x,y)=>{await db.query("update online_adventure_members set x=$1,y=$2,attack_at='epoch' where character_id=$3",[x,y,cid]);await db.exec("update online_presence set seen_at=clock_timestamp(),location='dungeon'");};
 await place(49,79);await assert.rejects(rpc('interact',{id:'rail_entry'}),/ボス/);assert.equal((await rpc('poll')).adventure.railUnlocked,false);
 await place(47,15);s=await rpc('poll');assert.equal(s.adventure.snapshot.bossEncounter.phase,'opening');assert.equal(s.adventure.railUnlocked,false);
 await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{bossEncounter,at}',to_jsonb(online_adventure_now_ms()-3000))where id=$1",[rid]);s=await rpc('poll');assert.equal(s.adventure.snapshot.bossEncounter.phase,'battle');assert.equal(s.adventure.railUnlocked,true);
 await place(49,79);s=await rpc('poll');assert.equal(s.adventure.railUnlocked,true,'unlock survives wipe');s=await rpc('interact',{id:'rail_entry'});assert.equal(s.adventure.x,52);assert.equal(s.adventure.y,26);assert.equal(s.adventure.id,rid);
 await assert.rejects(rpc('interact',{id:'rail_entry'}),/近く/);
 await place(52,26);s=await rpc('interact',{id:'rail_boss'});assert.equal(s.adventure.x,49);assert.equal(s.adventure.y,79);
 // An occupied landing square must not be used.
 const other='21111111-1111-4111-8111-111111111111';await db.query('insert into auth.users values($1)',[other]);await login(other);s=await rpc('create_character',{name:'RailOther',gender:'female'});const second=s.characters[0].id;await rpc('join',{character_id:second});await db.exec('update online_presence set x=4,y=10 where user_id=auth.uid()');await rpc('room_join',{room_id:rid});await db.query('update online_adventure_members set x=52,y=26 where character_id=$1',[second]);await login(uid);await place(49,79);s=await rpc('interact',{id:'rail_entry'});assert.notDeepEqual([s.adventure.x,s.adventure.y],[52,26]);
 await login(other);assert.equal((await rpc('poll')).adventure.railUnlocked,false,'unlock is character-specific');
 await db.exec('set role authenticated');await assert.rejects(db.query('insert into online_rail_unlocks(character_id,floor)values($1,1)',[second]));await db.exec('reset role');
 console.log('PASS boss participation unlock, opening locked, wipe persistence, both stations, distance validation, collision and character permissions');
}catch(e){console.error(e.message,e.where??'');process.exitCode=1;}finally{await db.close();}
