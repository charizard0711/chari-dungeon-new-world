import assert from 'node:assert/strict';import {makeHousingDb} from './housing-test-db.mjs';
const{db,login,rpc}=await makeHousingDb();const users=[1,2,3,4].map(n=>`${n}1111111-1111-4111-8111-111111111111`),chars=[];let time=1800000000000,room;
await db.exec("create or replace function public.online_adventure_now_ms()returns bigint language sql volatile security definer set search_path=public,pg_temp as $$select current_setting('test.clock')::bigint$$");
const clock=async n=>{time=n;await db.query("select set_config('test.clock',$1,false)",[String(time)]);};await clock(time);
try{
 for(const uid of users){await db.query('insert into auth.users values($1)',[uid]);await login(uid);let s=await rpc('create_character',{name:'Turn '+chars.length,gender:'male'});chars.push(s.characters[0].id);await rpc('join',{character_id:chars.at(-1)});await db.query('update online_presence set x=4,y=10 where user_id=$1',[uid]);if(!room)room=(await rpc('room_create',{name:'Boss round test'})).adventure.id;else await rpc('room_join',{room_id:room});}
 await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{enemies}',(select jsonb_agg(case when e->>'id'='vesper'then e||'{\"x\":120,\"y\":23}'::jsonb else e||'{\"hp\":0}'::jsonb end)from jsonb_array_elements(snapshot->'enemies')e)) where id=$1",[room]);
 for(let i=0;i<4;i++)await db.query('update online_adventure_members set x=$1,y=35 where character_id=$2',[114+i,chars[i]]);
 await login(users[0]);let s=await rpc('poll');const first=s.adventure.snapshot.turn;
 await rpc('move',{x:114,y:34});await rpc('move',{x:114,y:36});s=await rpc('poll');assert.equal(s.adventure.y,35,'movement is selected, not predicted as completed');assert.equal(s.adventure.intent.payload.y,36,'last selection replaces first');
 for(const uid of users){await login(uid);await rpc('wait');}s=await rpc('poll');assert.equal(s.adventure.snapshot.turn.number,first.number,'four players cannot accelerate round');
 await login(users[0]);await rpc('move',{x:114,y:36});await clock(first.deadline);s=await rpc('poll');assert.equal(s.adventure.y,36);assert.equal(s.adventure.snapshot.turn.number,2);for(let i=0;i<4;i++)assert.equal((await rpc('poll')).adventure.snapshot.turn.number,2);
 // Positions swap together without blocking each other's escape route.
 for(let i=2;i<4;i++)await db.query('update online_adventure_members set x=$1,y=38 where character_id=$2',[116+i,chars[i]]);
 await db.query('update online_adventure_members set x=115,y=35 where character_id=$1',[chars[0]]);await db.query('update online_adventure_members set x=116,y=35 where character_id=$1',[chars[1]]);
 await rpc('move',{x:116,y:35});await login(users[1]);await rpc('move',{x:115,y:35});await clock(time+1200);s=await rpc('poll');assert.equal(s.adventure.x,115);await login(users[0]);assert.equal((await rpc('poll')).adventure.x,116);
 // The area attack is resolved after the selected move, on the new square.
 await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{telegraphs}',$1::jsonb)where id=$2",[JSON.stringify([{id:'dodge',source:'vesper',mode:'turn',remaining:1,damage:25,tiles:[{x:116,y:35}]}]),room]);await rpc('move',{x:116,y:36});await db.query('update online_characters set hp=100');await clock(time+1200);s=await rpc('poll');assert.equal(s.adventure.y,36);assert.equal(s.active.hp,100,'escape move happens before AoE damage');assert.ok(!s.adventure.snapshot.telegraphs.some(t=>t.id==='dodge'));
 // Destination reservation is visible and conflicts are rejected at selection time.
 await db.query('update online_adventure_members set x=115,y=35 where character_id=$1',[chars[0]]);await db.query('update online_adventure_members set x=117,y=35 where character_id=$1',[chars[1]]);await rpc('move',{x:116,y:35});await login(users[1]);await assert.rejects(()=>rpc('move',{x:116,y:35}));
 // Server executes queued attacks with the correct actor identity, once per round.
 await db.query('delete from online_boss_intents where room_id=$1',[room]);await db.query('update online_adventure_members set x=119,y=23 where character_id=$1',[chars[1]]);await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{enemies}',(select jsonb_agg(case when e->>'id'='vesper'then e||'{\"hp\":1,\"x\":120,\"y\":23}'::jsonb else e end)from jsonb_array_elements(snapshot->'enemies')e))where id=$1",[room]);
 s=await rpc('attack',{dir:'right'});assert.equal(s.adventure.status,'active');await login(users[0]);await clock(time+1200);s=await rpc('poll');assert.equal(s.adventure.status,'cleared');assert.equal(s.adventure.snapshot.stairs,true);assert.equal((await db.query('select count(*)n from online_adventure_rewards where room_id=$1',[room])).rows[0].n,4);
 for(const table of ['online_boss_rounds','online_boss_intents'])assert.equal((await db.query("select has_table_privilege('authenticated',$1,'SELECT')p",[table])).rows[0].p,false);
 console.log('PASS: common 1.2s rounds, latest input selection, no action/poll multiplier, simultaneous swaps, movement-before-AoE dodge, destination reservations, correct actor execution, one-time clear/rewards and private tables.');
}finally{await db.close();}
