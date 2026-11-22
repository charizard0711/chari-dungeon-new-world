import assert from 'node:assert/strict';
import {makeHousingDb} from './housing-test-db.mjs';
const {db,login,rpc}=await makeHousingDb();const users=['11111111-1111-4111-8111-111111111111','21111111-1111-4111-8111-111111111111'];const ids=[];let rid;
try{
for(const uid of users){await db.query('insert into auth.users values($1)',[uid]);await login(uid);let s=await rpc('create_character',{name:'Turn'+ids.length,gender:'male'});ids.push(s.characters[0].id);await rpc('join',{character_id:ids.at(-1)});await db.exec('update online_presence set x=4,y=10 where user_id=auth.uid()');if(!rid)rid=(await rpc('room_create',{name:'ターン検証'})).adventure.id;else await rpc('room_join',{room_id:rid});}
const mob=(key='m_guard',x=50,y=76,hp=30)=>({id:'test',key,name:key,x,y,hp,max:hp,atk:15,def:0,dir:'down'});
async function reset(e=mob(),pos=[49,77],other=[54,79]){await login(users[0]);await db.query('update online_adventure_rooms set status=\'active\',snapshot=snapshot||$2::jsonb where id=$1',[rid,JSON.stringify({enemies:[e],telegraphs:[],lightTurns:{},actedAt:{},tick:0,bossEncounter:{phase:'waiting',at:0}})]);for(let i=0;i<2;i++)await db.query('update online_adventure_members set x=$2,y=$3,attack_at=\'epoch\',floor=1 where character_id=$1',[ids[i],...(i?other:pos)]);await db.exec("update online_presence set seen_at=clock_timestamp(),moved_at='epoch',location='dungeon';update online_characters set hp=100,gear=gear||'{\"weapon\":true,\"weapon_key\":\"w_iron_dagger\"}'");}
async function read(){return(await rpc('poll')).adventure.snapshot;}
async function move(x,y){await db.exec("update online_presence set moved_at='epoch'");return rpc('move',{x,y});}
await reset();const frozen=(await read()).enemies;await db.exec("select pg_sleep(0.01)");assert.deepEqual((await read()).enemies,frozen);
await move(48,77);assert.equal((await read()).enemies[0].turnNo,1);
await login(users[1]);await move(55,79);assert.equal((await read()).enemies[0].turnNo,1,'other player cannot advance nearest target');
await reset(mob('m_guard',50,76),[49,76],[51,76]);await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{enemies,0,dir}','\"right\"')where id=$1",[rid]);let s=await read();assert.equal((await db.query('select online_turn_target($1,$2) as id',[rid,JSON.stringify(s.enemies[0])])).rows[0].id,ids[1]);
// A fast weapon kills before retaliation; a slow weapon receives the first blow.
await reset(mob('m_bat',50,77,1));let result=await rpc('attack',{dir:'right'});const fastHp=result.active.hp;assert.equal(fastHp,97,'only solo shatter death damage');
await reset(mob('m_bat',50,77,1));const heavy=(await db.query("select key from online_catalog where weapon_type='greatsword' limit 1")).rows[0].key;await db.query("update online_characters set gear=gear||jsonb_build_object('weapon_key',$2::text)where id=$1",[ids[0],heavy]);result=await rpc('attack',{dir:'right'});assert(result.active.hp<fastHp,'fast enemy acts before slow weapon');
await reset(mob('m_jelly',50,77,1));result=await rpc('attack',{dir:'right'});assert.equal(result.adventure.snapshot.enemies.filter(e=>e.fragment).length,2);assert(result.adventure.snapshot.enemies.filter(e=>e.fragment).every(e=>e.hp>0));
await reset(mob('m_mush',50,77,1));result=await rpc('attack',{dir:'right'});assert.equal(result.adventure.snapshot.lightTurns[ids[0]],5);await read();assert.equal((await read()).lightTurns[ids[0]],5);for(let i=0;i<5;i++){await db.exec("update online_presence set moved_at='epoch'");await rpc('wait');}assert.equal((await read()).lightTurns[ids[0]],0);
await reset();await db.query("update online_characters set inventory=inventory||'{\"torch\":1}'where id=$1",[ids[0]]);result=await rpc('use_item',{kind:'torch'});assert.equal(result.active.inventory.torch,0);assert.equal(result.adventure.snapshot.lightTurns[ids[0]],5);
// Idle nearest target can be overridden by a different attacker.
await reset(mob('m_guard',50,77,100),[49,77],[50,78]);await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{enemies,0,dir}','\"down\"')where id=$1",[rid]);result=await rpc('attack',{dir:'right'});assert.equal(result.adventure.snapshot.enemies[0].target,ids[0]);
assert.equal((await db.query("select online_weapon_speed('dagger')>online_weapon_speed('greatsword') as ok")).rows[0].ok,true);
await reset(mob('m_bat',49,74,100),[49,77],[54,79]);result=await rpc('wait');assert(result.active.hp<100);assert.equal(result.adventure.snapshot.enemies[0].rangedAttack,true);
await reset({...mob('m_moss',50,77,10),max:100,turnNo:2});result=await rpc('wait');assert(result.adventure.snapshot.enemies[0].hp>10);
await reset(mob('m_ghost',50,77,100));assert.equal((await db.query("select online_turn_damage(20,$1,'right') as n",[JSON.stringify(mob('m_ghost',50,77,100))])).rows[0].n,10);result=await rpc('wait');assert.equal(result.adventure.snapshot.enemies[0].vulnerable,2);
await reset({...mob('m_spider',50,73,30),turnNo:2},[50,77],[54,79]);result=await rpc('wait');assert.equal(result.adventure.snapshot.webs.length,1);
await reset(mob('m_bat',50,77,1));await db.query("update online_characters set hp=1,gear=gear||jsonb_build_object('weapon_key',$2::text)where id=$1",[ids[0],heavy]);result=await rpc('attack',{dir:'right'});assert.equal(result.adventure.snapshot.enemies[0].hp,1,'lethal first strike cancels player attack');assert.equal(result.active.hp,50);assert(result.adventure.snapshot.deaths[ids[0]]>0);
assert.equal((await db.query("select online_weapon_speed('handgun') as gun,online_weapon_speed('bow') as bow,online_weapon_speed('greatsword') as heavy")).rows[0].gun,135);
await assert.rejects(rpc('claim_gold',{amount:10000000}));
await db.query('update online_profiles set super_account=true where user_id=$1',[users[0]]);await db.query('update online_characters set catalog_unlocked=true,gold=0 where id=$1',[ids[0]]);
await rpc('claim_gold',{amount:1000000});result=await rpc('claim_gold',{amount:10000000});assert.equal(result.active.gold,11000000);await assert.rejects(rpc('claim_gold',{amount:10000001}));
await reset(mob('m_bat',50,77,1000));const gun=(await db.query("select key from online_catalog where weapon_type='handgun' limit 1")).rows[0].key;await db.query('update online_catalog set attack_min=100,attack_max=100 where key=$1',[gun]);await db.query("update online_characters set gear=gear||jsonb_build_object('weapon_key',$2::text,'weapon',true)where id=$1",[ids[0],gun]);result=await rpc('attack',{dir:'right'});assert.equal(result.adventure.snapshot.enemies[0].hp,930,'gun damage is 70%');const duration=Number((await db.query('select online_attack_duration($1)as n',[ids[0]])).rows[0].n);assert(duration>178&&duration<179);await assert.rejects(rpc('attack',{dir:'right'}),'server rejects attack before recovery');
console.log('PASS attack speed balance, privileged 1M/10M gold and amount limit');
console.log('PASS lethal initiative/respawn');
console.log('PASS ranged, regeneration, phase defence/exposure, spider trails');
console.log('PASS migration, frozen polls, nearest actor turns, facing ties, idle retarget, attack initiative, split, lantern 5 turns, torch consumption.');
}catch(e){console.error(e.message,e.where??'',e.actual??'',e.expected??'');process.exitCode=1;}finally{await db.close();}

