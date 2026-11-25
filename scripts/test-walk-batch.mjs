import assert from 'node:assert/strict';import {makeHousingDb}from './housing-test-db.mjs';
const {db,login,rpc}=await makeHousingDb();
try{
 const uid='11111111-1111-4111-8111-111111111111';await db.query('insert into auth.users values($1)',[uid]);await login(uid);let s=await rpc('create_character',{name:'BatchWalk',gender:'male'});const cid=s.characters[0].id;await rpc('join',{character_id:cid});
 const place=async(x,y)=>db.query("update online_presence set x=$1,y=$2,moved_at='epoch',seen_at=clock_timestamp()where user_id=auth.uid()",[x,y]);
 await place(10,12);await db.query('update online_characters set hp=20 where id=$1',[cid]);
 s=await rpc('walk_batch',{steps:[{x:10,y:11},{x:10,y:10},{x:10,y:9}]});assert.equal(s.walkBatch.accepted,3);assert.equal(s.walkBatch.stopped,false);assert.equal(s.active.hp,100,'fountain still heals inside a batch');assert.deepEqual([s.players.find(p=>p.character_id===cid).x,s.players.find(p=>p.character_id===cid).y],[10,9]);
 await assert.rejects(rpc('walk_batch',{steps:Array(4).fill({x:10,y:8})}),/経路/);
 await place(10,12);s=await rpc('walk_batch',{steps:[{x:10,y:11},{x:11,y:10},{x:10,y:10}]});assert.equal(s.walkBatch.accepted,1);assert.equal(s.walkBatch.stopped,true,'diagonal remainder rejected without losing first square');
 await place(10,11);s=await rpc('walk_batch',{steps:[{x:10,y:10},{x:11,y:10}]});assert.equal(s.walkBatch.accepted,1);assert.equal(s.walkBatch.stopped,true,'fountain obstacle remains solid');
 await place(10,12);await db.exec("update online_presence set moved_at=clock_timestamp()-interval '115 milliseconds'");s=await rpc('walk_batch',{steps:[{x:10,y:11},{x:10,y:10},{x:10,y:9}]});assert.equal(s.walkBatch.accepted,1,'insufficient server-time credits cannot apply all buffered steps');
 await assert.rejects(rpc('walk_batch',{steps:[{x:10,y:10}]}),/少し待/);
 await place(4,10);s=await rpc('room_create',{name:'Batch dungeon'});const rid=s.adventure.id;
 await db.query("update online_adventure_members set x=49,y=77 where character_id=$1",[cid]);await db.exec("update online_presence set moved_at='epoch'");
 s=await rpc('walk_batch',{steps:[{x:50,y:77},{x:51,y:77}]});assert.equal(s.walkBatch.accepted,2);assert.equal(s.adventure.x,51);assert.equal(s.adventure.y,77);
 await db.query("update online_adventure_members set x=47,y=15 where character_id=$1",[cid]);await assert.rejects(rpc('walk_batch',{steps:[{x:47,y:14}]}),/ボスエリア/);
 assert.equal((await db.query("select has_function_privilege('authenticated','online_world_pre_walk_batch(text,jsonb)','execute')as ok")).rows[0].ok,false);
 await db.query('update online_adventure_members set x=49,y=77 where character_id=$1',[cid]);
 // Fault-inject busy advisory locks into this isolated DB to verify deferral semantics.
 await db.exec(`create function online_test_try_lock(bigint)returns boolean language plpgsql as $$declare n int:=coalesce(nullif(current_setting('test.lock_calls',true),''),'0')::int+1;begin perform set_config('test.lock_calls',n::text,true);return n<>coalesce(nullif(current_setting('test.busy_lock',true),''),'0')::int;end$$;`);
 const source=(await db.query("select pg_get_functiondef('online_world(text,jsonb)'::regprocedure)as s")).rows[0].s;await db.exec(source.replaceAll('pg_try_advisory_xact_lock','online_test_try_lock'));
 for(const busy of [1,2]){await db.query("select set_config('test.busy_lock',$1,false),set_config('test.lock_calls','0',false)",[String(busy)]);assert.equal((await rpc('poll',{allow_deferred:true})).pollDeferred,true,'busy user/room returns immediately');assert((await rpc('poll')).active,'legacy clients still receive full packets');}
 await db.exec("select set_config('test.busy_lock','0',false),set_config('test.lock_calls','0',false)");assert((await rpc('poll',{allow_deferred:true})).adventure,'uncontended poll still resolves normal state');
 console.log('PASS batched walking, server-time rate limit, bounded input, partial collision, fountain, dungeon steps, boss exclusion and permissions');
}finally{await db.close();}
