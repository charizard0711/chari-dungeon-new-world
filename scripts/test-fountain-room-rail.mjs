import assert from 'node:assert/strict';
import {makeHousingDb}from './housing-test-db.mjs';
const {db,login,rpc}=await makeHousingDb();
try{
 const uid='11111111-1111-4111-8111-111111111111';await db.query('insert into auth.users values($1)',[uid]);await login(uid);
 let s=await rpc('create_character',{name:'SpringRail',gender:'male'});const cid=s.characters[0].id;await rpc('join',{character_id:cid});
 const place=async(x,y)=>db.query("update online_presence set x=$1,y=$2,moved_at='epoch',seen_at=clock_timestamp()where user_id=auth.uid()",[x,y]);
 await place(10,11);await db.query('update online_characters set hp=12 where id=$1',[cid]);
 s=await rpc('move',{x:10,y:10});assert.equal(s.active.hp,100);assert.equal(s.characters.find(c=>c.id===cid).hp,100);const token=s.townHeal;assert(token>0);
 assert.equal((await rpc('poll')).townHeal,token,'poll never heals twice');
 await place(10,10);s=await rpc('move',{x:10,y:9});assert.equal(s.townHeal,token,'full health silent');
 await place(10,12);await db.query('update online_characters set hp=20 where id=$1',[cid]);s=await rpc('move',{x:10,y:11});assert.equal(s.active.hp,20,'outside ring no heal');
 await db.query("update online_characters set gear=gear||'{\"weapon\":true,\"weapon_key\":\"star_w_iron_dagger\"}'::jsonb where id=$1",[cid]);
 await place(10,11);s=await rpc('move',{x:10,y:10});assert.equal(s.active.hp,150,'starred weapon maximum');
 await place(4,10);s=await rpc('room_create',{name:'First'});const first=s.adventure.id;
 await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{bossEncounter}',jsonb_build_object('phase','battle','at',online_adventure_now_ms(),'participants',jsonb_build_array($2::text)))where id=$1",[first,cid]);
 s=await rpc('poll');assert.equal(s.adventure.railUnlocked,true);
 await db.query("update online_adventure_members set finished_at=now()where character_id=$1",[cid]);await db.exec("update online_presence set location='town',x=4,y=10");
 s=await rpc('room_create',{name:'Second'});const second=s.adventure.id;assert.notEqual(first,second);assert.equal(s.adventure.railUnlocked,false,'another room is locked');
 await db.query("update online_adventure_members set x=51,y=96,rail_gates='{}'where character_id=$1 and finished_at is null",[cid]);
 await assert.rejects(rpc('interact',{id:'rail_entry'}),/ボス/);
 assert.equal((await db.query('select count(*)::int as n from online_room_rail_unlocks where room_id=$1',[second])).rows[0].n,0);
 await db.exec('set role authenticated');await assert.rejects(db.query('insert into online_room_rail_unlocks values($1,$2,1)',[second,cid]));await db.exec('reset role');
 console.log('PASS ring full heal, starred maximum, full/outside/poll silence, same-room discovery, other-room rejection and protected unlocks');
}finally{await db.close();}
