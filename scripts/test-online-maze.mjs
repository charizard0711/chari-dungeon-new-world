import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {makeHousingDb}from './housing-test-db.mjs';
const migration='202611220001_online_maze_cooperation.sql';const {db,login,rpc}=await makeHousingDb({before:migration});let now=1800000000000;
const users=[1,2].map(n=>`${n}1111111-1111-4111-8111-111111111111`),chars=[];let rid;
try{
for(const uid of users){await db.query('insert into auth.users values($1)',[uid]);await login(uid);const s=await rpc('create_character',{name:'Maze'+chars.length,gender:'male'});const id=s.characters[0].id;chars.push(id);await rpc('join',{character_id:id});await db.exec('update online_presence set x=4,y=10 where user_id=auth.uid()');if(!rid)rid=(await rpc('room_create',{name:'移行テスト'})).adventure.id;else await rpc('room_join',{room_id:rid});}
const old=(await db.query('select id,gold,equipment,instances from online_characters order by id')).rows;
await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{opened}','[\"shrine\"]')where id=$1",[rid]);
await db.exec(await fs.readFile('supabase/migrations/'+migration,'utf8'));
assert.deepEqual((await db.query('select id,gold,equipment,instances from online_characters order by id')).rows,old);
await db.exec("create or replace function online_adventure_now_ms()returns bigint language sql volatile as $$select current_setting('test.clock')::bigint$$");
async function clock(delta=0){now+=delta;await db.query("select set_config('test.clock',$1,false)",[String(now)]);await db.exec('update online_presence set seen_at=clock_timestamp(),moved_at=\'epoch\'');}await clock();
async function at(i,x,y){await login(users[i]);await db.query('update online_adventure_members set x=$1,y=$2,floor=1 where character_id=$3',[x,y,chars[i]]);await clock();}
async function state(){await clock();return (await rpc('poll')).adventure.snapshot;}
let s=await state();assert.equal(s.mapVersion,5);assert(s.opened.includes('shrine'));assert.equal(s.goldChests.length,7);assert(s.goldChests.includes('coop_gold'));assert.equal(new Set(s.goldChests).size,7);const gold=s.goldChests;assert.deepEqual((await state()).goldChests,gold);
// Normal fountain: full heal, one entitlement per character, persistent through polls.
await at(0,5,36);await db.query("update online_adventure_rooms set snapshot=snapshot||'{\"fountainKind\":\"normal\"}'where id=$1",[rid]);await db.query('update online_characters set hp=20 where id=$1',[chars[0]]);let packet=await rpc('interact',{id:'blessing'});assert.equal(packet.active.hp,100);assert.equal(packet.adventure.snapshot.fountainBuffs[chars[0]],1.1);await assert.rejects(()=>rpc('interact',{id:'blessing'}));
// Gold repairs carried weapons. Silver leaves spare weapons alone.
await at(1,5,36);await db.query("select online_give_equipment($1,'w_iron_dagger',false)",[chars[1]]);await db.query("update online_characters set instances=jsonb_set(instances,'{weapon}',(select jsonb_agg(e||'{\"dur\":1}')from jsonb_array_elements(instances->'weapon')e))where id=$1",[chars[1]]);
await db.query("update online_adventure_rooms set snapshot=snapshot||'{\"fountainKind\":\"gold\"}'where id=$1",[rid]);packet=await rpc('interact',{id:'blessing'});assert(packet.active.instances.weapon.every(e=>e.dur===e.max));assert.equal(packet.adventure.snapshot.fountainBuffs[chars[1]],1.5);
// Cooperative bridge: one player cannot leave the panel and cross; second player can.
await at(0,92,39);s=await state();assert.equal(s.bridge.phase,'rising');await clock(1300);s=await state();assert.equal(s.bridge.phase,'up');await at(0,93,36);await at(1,80,36);s=await state();assert.equal(s.bridge.phase,'down');await at(0,93,36);await assert.rejects(()=>rpc('move',{x:94,y:36}));
await at(0,92,39);await state();await clock(1300);await state();await at(1,93,36);packet=await rpc('move',{x:94,y:36});assert.equal(packet.adventure.x,94);assert(packet.adventure.snapshot.bridge.latched);
await at(0,91,39);assert.equal((await state()).bridge.phase,'up');await at(1,101,35);packet=await rpc('interact',{id:'coop_gold'});assert(packet.adventure.snapshot.opened.includes('coop_gold'));await assert.rejects(()=>rpc('interact',{id:'coop_gold'}));await at(1,94,36);await clock();packet=await rpc('move',{x:93,y:36});assert.equal(packet.adventure.snapshot.bridge.phase,'down');
// Boss stays absent until two distinct pads, blocks escape, resets after all respawn.
await at(0,47,15);await at(1,51,17);s=await state();assert.equal(s.bossEncounter.phase,'waiting');assert.equal(s.enemies.find(e=>e.boss).hp,0);await at(1,49,15);s=await state();assert.equal(s.bossEncounter.phase,'opening');await assert.rejects(()=>rpc('room_return'));await clock(3000);s=await state();assert.equal(s.bossEncounter.phase,'battle');assert.equal(s.enemies.find(e=>e.boss).hp,480);
await db.query('update online_characters set hp=0 where id=$1',[chars[0]]);await clock(1500);await state();assert.equal((await state()).bossEncounter.phase,'battle');await db.query('update online_characters set hp=0 where id=$1',[chars[1]]);await clock(1500);s=await state();assert.equal(s.bossEncounter.phase,'returning');await clock(2000);s=await state();assert.equal(s.bossEncounter.phase,'waiting');assert.equal(s.enemies.find(e=>e.boss).hp,0);assert(s.fountainUsed.includes(chars[0]));
await db.query("update online_adventure_rooms set status='cleared'where id=$1",[rid]);s=await state();assert.deepEqual(s.fountainBuffs,{});assert.equal(s.bossEncounter.phase,'cleared');
for(const fn of ['online_maze_sync(uuid)','online_maze_buff(uuid)','online_world_pre_maze(text,jsonb)'])assert.equal((await db.query("select has_function_privilege('authenticated',$1,'EXECUTE')p",[fn])).rows[0].p,false);
console.log('PASS: save migration, random gold persistence, fountain entitlements/repair, cooperation/solo rejection/latch/last-exit, boss pads/seal/deaths/reset, buff expiry, private helpers.');
}finally{await db.close();}
