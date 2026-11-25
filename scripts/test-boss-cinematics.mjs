import assert from 'node:assert/strict';
import {makeHousingDb}from './housing-test-db.mjs';
const {db,login,rpc}=await makeHousingDb();
try{
 const users=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'],ids=[];let room;
 for(let i=0;i<2;i++){await db.query('insert into auth.users values($1)',[users[i]]);await login(users[i]);let s=await rpc('create_character',{name:'Cinema'+i,gender:i?'female':'male'});const cid=s.characters[0].id;ids.push(cid);await rpc('join',{character_id:cid});await db.exec("update online_presence set x=3,y=9,moved_at='epoch'");s=await rpc(i?'room_join':'room_create',i?{room_id:room}:{name:'Cinema'});room=s.adventure.id;}
 const place=async(i,x,y)=>{await db.query("update online_adventure_members set x=$2,y=$3,attack_at='epoch'where character_id=$1",[ids[i],x,y]);await db.query("update online_presence set seen_at=clock_timestamp(),moved_at='epoch',location='dungeon'where character_id=$1",[ids[i]]);};
 await place(0,47,15);await place(1,49,15);await login(users[0]);let s=await rpc('poll');assert.equal(s.adventure.snapshot.bossEncounter.phase,'opening');
 for(let i=0;i<2;i++){await login(users[i]);for(const a of ['move','attack','skill','use_item','room_return'])await assert.rejects(rpc(a,{x:47,y:14,dir:'up',kind:'potion'}),/演出中/);}
 await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{bossEncounter,at}',to_jsonb(online_adventure_now_ms()-3000))where id=$1",[room]);s=await rpc('poll');assert.equal(s.adventure.snapshot.bossEncounter.phase,'opening','full 14 second intro');
 await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{bossEncounter,at}',to_jsonb(online_adventure_now_ms()-15000))where id=$1",[room]);s=await rpc('poll');assert.equal(s.adventure.snapshot.bossEncounter.phase,'battle');
 const hp=async value=>db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{enemies}',(select jsonb_agg(case when(e->>'boss')::boolean then e||jsonb_build_object('hp',$2::int,'max',480,'x',50,'y',10,'atk',0)else e end)from jsonb_array_elements(snapshot->'enemies')e))where id=$1",[room,value]);
 const stamp=async ms=>db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{bossEncounter,smash,at}',to_jsonb(online_adventure_now_ms()-$2::bigint))where id=$1",[room,ms]);
 await login(users[0]);
 for(let stage=1;stage<=2;stage++){
  await place(0,50,11);await place(1,48,13);await hp(stage===1?321:161);s=await rpc('attack',{dir:'up'});await db.query("update online_boss_rounds set deadline=online_adventure_now_ms()-1 where room_id=$1",[room]);s=await rpc('poll');
  let b=s.adventure.snapshot.bossEncounter;assert.equal(b.smashCount,stage,'one checkpoint per HP third');assert.equal(s.adventure.snapshot.enemies.find(e=>e.boss).hp,stage===1?320:160,'damage capped at mandatory checkpoint');assert.equal(b.smash.tiles.length,3);assert.equal(b.smash.applied,false);
  const before=(await db.query('select character_id,x,y from online_adventure_members where room_id=$1 order by character_id',[room])).rows;
  for(let i=0;i<2;i++){await login(users[i]);await assert.rejects(rpc('attack',{dir:'up'}),/演出中/);await assert.rejects(rpc('move',{x:50,y:12}),/演出中/);}
  await stamp(2100);s=await rpc('poll');assert.equal(s.adventure.snapshot.brokenFloors.length,stage*3);assert(s.adventure.snapshot.bossEncounter.smash.applied);
  const after=(await db.query('select character_id,x,y from online_adventure_members where room_id=$1 order by character_id',[room])).rows;
  for(let i=0;i<before.length;i++)assert.equal(Math.abs(before[i].x-after[i].x)+Math.abs(before[i].y-after[i].y),1,'every arena player knocked one cardinal tile');
  assert.notDeepEqual([after[0].x,after[0].y],[after[1].x,after[1].y]);
  for(const tile of s.adventure.snapshot.brokenFloors){assert((await db.query('select online_adventure_blocked($1,$2,1,$3)as b',[tile.x,tile.y,JSON.stringify(s.adventure.snapshot)])).rows[0].b);assert(!after.some(p=>p.x===tile.x&&p.y===tile.y));}
  await rpc('poll');assert.deepEqual((await db.query('select character_id,x,y from online_adventure_members where room_id=$1 order by character_id',[room])).rows,after,'poll cannot apply knockback twice');
  await stamp(4000);await login(users[0]);s=await rpc('poll');assert.equal(s.adventure.snapshot.bossEncounter.smashCount,stage);
 }
 await db.query("update online_presence set location='town'where character_id=any($1::uuid[])",[ids]);await db.query('select online_maze_sync($1)',[room]);await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{bossEncounter,at}',to_jsonb(online_adventure_now_ms()-2000))where id=$1",[room]);await db.query('select online_maze_sync($1)',[room]);
 const reset=(await db.query('select snapshot from online_adventure_rooms where id=$1',[room])).rows[0].snapshot;assert.equal(reset.bossEncounter.phase,'waiting');assert(!reset.brokenFloors);assert(!reset.bossEncounter.smashCount);
 console.log('PASS shared 14s opening, both players action lock, HP checkpoints, two 3-tile fractures, safe one-cell knockback once, blocked rubble, synchronized polls and wipe reset');
}catch(e){console.error(e.message,e.where??'');process.exitCode=1;}finally{await db.close();}
