import assert from 'node:assert/strict';
import {makeHousingDb} from './housing-test-db.mjs';
const {db,login,rpc}=await makeHousingDb();
try {
 const users=[1,2,3,4].map(n=>`${n}1111111-1111-4111-8111-111111111111`),ids=[];let room;
 for(let i=0;i<4;i++){
  await db.query('insert into auth.users values($1)',[users[i]]);await login(users[i]);let s=await rpc('create_character',{name:'Shared'+i,gender:i?'female':'male'});ids.push(s.characters[0].id);await rpc('join',{character_id:ids[i]});await db.exec("update online_presence set x=3,y=9,moved_at='epoch'");s=await rpc(i?'room_join':'room_create',i?{room_id:room}:{name:'Shared'});room=s.adventure.id;
 }
 const place=async(i,x,y)=>{await db.query("update online_adventure_members set x=$2,y=$3,attack_at='epoch'where character_id=$1",[ids[i],x,y]);await db.query("update online_presence set seen_at=clock_timestamp(),moved_at='epoch',location='dungeon'where character_id=$1",[ids[i]]);};
 for(let i=0;i<4;i++)await place(i,47+i*2,15);await rpc('poll');await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{bossEncounter,at}',to_jsonb(online_adventure_now_ms()-15000))where id=$1",[room]);await rpc('poll');
 await db.exec('create schema test;create table test.clock(t bigint);insert into test.clock select online_adventure_now_ms();create or replace function online_adventure_now_ms()returns bigint language sql volatile as $$select t from test.clock$$;');
 const advance=ms=>db.query('update test.clock set t=t+$1',[ms]);
 const boss=s=>s.enemies.find(e=>e.boss);
 await place(0,50,11);await place(1,51,11);await place(2,43,18);await place(3,54,18);
 await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{enemies}',(select jsonb_agg(case when(e->>'boss')::boolean then e||jsonb_build_object('hp',480,'max',480,'x',50,'y',10,'atk',0,'turnNo',2)else e end)from jsonb_array_elements(snapshot->'enemies')e))where id=$1",[room]);
 await login(users[0]);let s=await rpc('poll');assert.equal(s.adventure.snapshot.turn.deadline,0);await advance(10000);s=await rpc('poll');assert.equal(boss(s.adventure.snapshot).turnNo,2,'no input freezes the boss');
 s=await rpc('attack',{dir:'up'});assert.equal(boss(s.adventure.snapshot).hp,480,'choice is queued');assert.equal(s.adventure.snapshot.turn.ready,1);assert.equal(s.adventure.intent.action,'attack');
 await login(users[1]);s=await rpc('wait');assert.equal(s.adventure.snapshot.turn.ready,2);for(let i=2;i<4;i++){await login(users[i]);await rpc('wait');}await advance(268);s=await rpc('poll');assert.equal(s.adventure.snapshot.turn.number,2);assert(boss(s.adventure.snapshot).hp<480);assert.equal(boss(s.adventure.snapshot).turnNo,3,'one enemy turn for four actions');assert.equal(s.adventure.intents.length,0);
 // Both moves use the starting positions; a swap succeeds atomically. The
 // warning remains on its original tile and hits only the arriving player.
 await place(0,50,11);await place(1,51,11);await db.exec('update online_characters set hp=100,gear=gear||\'{"armor":false,"shield":false}\'::jsonb');
 await db.query("update online_adventure_rooms set snapshot=snapshot||jsonb_build_object('telegraphs',jsonb_build_array(jsonb_build_object('source','vesper','remaining',1,'mode','turn','damage',30,'tiles',jsonb_build_array(jsonb_build_object('x',50,'y',11)))))where id=$1",[room]);
 await login(users[0]);await rpc('move',{x:51,y:11});await login(users[1]);await rpc('move',{x:50,y:11});for(let i=2;i<4;i++){await login(users[i]);await rpc('wait');}await advance(268);s=await rpc('poll');
 const positions=(await db.query('select character_id,x,y from online_adventure_members where room_id=$1',[room])).rows;
 assert.equal(positions.find(p=>p.character_id===ids[0]).x,51);assert.equal(positions.find(p=>p.character_id===ids[1]).x,50);
 const health=(await db.query('select id,hp from online_characters')).rows;assert.equal(health.find(p=>p.id===ids[0]).hp,100,'move escapes warning before damage');assert(health.find(p=>p.id===ids[1]).hp<=70,'warning hits its fixed tile');assert.equal(boss(s.adventure.snapshot).turnNo,4);
 // A stationary player blocks a selected destination. Nobody stacks.
 await login(users[0]);await rpc('move',{x:50,y:11});await advance(1800);s=await rpc('poll');assert.equal(s.adventure.x,51);assert.equal(s.adventure.snapshot.turn.number,4,'timeout advances once with the other player waiting');
 const n=boss(s.adventure.snapshot).turnNo;await advance(30000);s=await rpc('poll');assert.equal(boss(s.adventure.snapshot).turnNo,n,'no offline catch-up');
 // Equipment/item paths are still authoritative, and use_item consumes one turn.
 await db.query("update online_characters set hp=30,inventory=jsonb_set(inventory,'{potion}','2')where id=$1",[ids[0]]);await rpc('use_item',{kind:'potion'});await advance(1800);s=await rpc('poll');assert.equal(s.active.inventory.potion,1);assert(s.active.hp>30);assert.equal(boss(s.adventure.snapshot).turnNo,n+1);
 // Attack speed selects initiative even in a four-player shared turn.
 for(const type of ['greatsword','dagger']){
  await place(0,50,11);await place(1,52,14);await login(users[0]);
  const key=(await db.query('select key from online_catalog where weapon_type=$1 limit 1',[type])).rows[0].key;
  await db.query("update online_characters set hp=1,equipment=jsonb_set(equipment,'{weapon}',jsonb_build_array($2::text)),instances=jsonb_set(instances,'{weapon,0,key}',to_jsonb($2::text)),gear=gear||jsonb_build_object('weapon',true,'weapon_key',$2::text)where id=$1",[ids[0],key]);
  await db.query("update online_adventure_rooms set snapshot=(snapshot-'turn')||jsonb_build_object('telegraphs','[]'::jsonb,'bossEncounter',jsonb_build_object('phase','battle','at',online_adventure_now_ms(),'participants',$2::jsonb,'smashCount',2),'enemies',(select jsonb_agg(case when(e->>'boss')::boolean then e||jsonb_build_object('hp',480,'x',50,'y',10,'atk',150,'turnNo',2)else e end)from jsonb_array_elements(snapshot->'enemies')e))where id=$1",[room,JSON.stringify(ids)]);
  await rpc('attack',{dir:'up'});for(let i=1;i<4;i++){await login(users[i]);await rpc('wait');}await advance(268);await login(users[0]);s=await rpc('poll');
  if(type==='greatsword')assert.equal(boss(s.adventure.snapshot).hp,480,'lethal first strike cancels slower player attack');else assert(boss(s.adventure.snapshot).hp<480,'faster player hits before lethal boss strike');
  assert.equal(s.active.hp,50);assert(!s.adventure.snapshot.turnResults.some(r=>r.message));
 }
 await place(0,50,11);await place(1,52,14);await login(users[0]);
 // Cinematics cancel all queued actions, preserving their action lock.
 await rpc('wait');await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{bossEncounter,smash}',jsonb_build_object('at',online_adventure_now_ms(),'duration',3800,'tiles','[]'::jsonb,'applied',true))where id=$1",[room]);await rpc('poll');assert.equal((await db.query('select count(*)::int n from online_boss_intents')).rows[0].n,0);await assert.rejects(rpc('attack',{dir:'up'}),/演出中/);
 assert.equal((await db.query("select has_function_privilege('authenticated','online_boss_actor_action(uuid,text,jsonb)','execute') allowed")).rows[0].allowed,false);
 console.log('PASS queued shared turns, all-ready early resolution, frozen idle rounds, one enemy action, swaps, stationary collisions, post-move fixed AoE, timeout wait, no catch-up, potion, cinematic cancellation and private helpers');
}finally{await db.close();}
