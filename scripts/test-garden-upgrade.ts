import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {makeHousingDb} from './housing-test-db.mjs';
import {HOUSES} from '../src/online/housingCatalog';import {townBlocked} from '../src/online/townLayout';
const filename='202611210012_online_garden_town.sql';
const {db,login,rpc}=await makeHousingDb({before:filename});
try{
 const uid='11111111-1111-4111-8111-111111111111';await db.query('insert into auth.users values($1)',[uid]);await login(uid);
 let s=await rpc('create_character',{name:'Garden QA',gender:'male'});const cid=s.characters[0].id;await rpc('join',{character_id:cid});
 await db.query('update online_characters set gold=2000000 where id=$1',[cid]);await db.query('update online_presence set x=16,y=3 where user_id=$1',[uid]);await rpc('house_buy',{house_id:'north-1'});
 const old=(await db.query("select data from online_house_catalog where id='north-1'")).rows[0].data;
 await db.query('update online_presence set x=$1,y=$2 where user_id=$3',[old.doorX,old.doorY+1,uid]);await rpc('house_enter',{house_id:'north-1'});
 const owner=(await db.query('select * from online_house_owners')).rows,character=(await db.query('select * from online_characters where id=$1',[cid])).rows[0],visit=(await db.query('select * from online_house_visits')).rows[0];
 await db.query("insert into online_ground_items(kind,x,y,dropped_by)values('potion',-34,-34,$1)",[uid]);
 await db.exec(await fs.readFile('supabase/migrations/'+filename,'utf8'));
 assert.deepEqual((await db.query('select * from online_house_owners')).rows,owner);
 assert.deepEqual((await db.query('select * from online_characters where id=$1',[cid])).rows[0],character);
 const h=HOUSES.find(h=>h.id==='north-1')!,after=(await db.query('select * from online_house_visits')).rows[0];assert.equal(after.x,visit.x);assert.equal(after.y,visit.y);assert.equal(after.return_x,h.doorX);assert.equal(after.return_y,h.doorY+1);
 s=await rpc('house_exit');assert.equal(s.active.location,'town');assert(!townBlocked(s.players[0].x,s.players[0].y));
 assert.equal((await db.query('select count(*)::int n from online_ground_items where online_town_blocked(x,y)')).rows[0].n,0);
 const place=async(x:number,y:number)=>db.query("update online_presence set x=$1,y=$2,moved_at='epoch' where user_id=$3",[x,y,uid]);
 await place(22,4);s=await rpc('warehouse_enter');assert.equal(s.active.location,'warehouse');s=await rpc('warehouse_exit');assert.equal(s.active.location,'town');assert.equal(s.players[0].x,22);assert.equal(s.players[0].y,4);
 await place(18,5);await rpc('npc_talk',{id:'merchant'});
 await place(22,14);await rpc('attack',{dir:'up'});s=await rpc('poll');assert(s.trainingHits.some(h=>h.hit_target),'barrel at new coordinates takes hits');
 await db.exec("update online_training_hits set created_at=now()-interval '2 seconds'");await place(12,6);await rpc('attack',{dir:'up'});s=await rpc('poll');assert.equal(s.trainingHits.at(-1).hit_target,false,'old barrel tile must not take hits');
 await place(7,4);s=await rpc('house_sell',{house_id:'north-1'});assert.equal(s.active.gold,1850000);
 console.log('PASS: existing owner, gold, gear, warehouse and indoor coordinates preserved; house exit relocated; loot preserved; warehouse, merchant, barrel and resale at new positions.');
}finally{await db.close();}
