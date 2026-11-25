import fs from 'node:fs/promises';import {makeHousingDb}from './housing-test-db.mjs';
const {db,login,rpc}=await makeHousingDb({before:'202611250003'});
try{
 const uid='11111111-1111-4111-8111-111111111111';await db.query('insert into auth.users values($1)',[uid]);await login(uid);let s=await rpc('create_character',{name:'WalkBench',gender:'male'});const cid=s.characters[0].id;await rpc('join',{character_id:cid});await db.exec("update online_presence set x=4,y=10,moved_at='epoch'");s=await rpc('room_create',{name:'WalkBench'});const rid=s.adventure.id;
 await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{enemies}',(select jsonb_agg(e||jsonb_build_object('x',20,'y',35,'atk',0))from jsonb_array_elements(snapshot->'enemies')e))where id=$1",[rid]);
 const count=(await db.query("select jsonb_array_length(snapshot->'enemies')as n from online_adventure_rooms where id=$1",[rid])).rows[0].n;
 const run=async()=>{await db.query('update online_adventure_members set x=49,y=77 where character_id=$1',[cid]);const samples=[];for(let i=0;i<22;i++){await db.exec("update online_presence set moved_at='epoch'");const start=performance.now();await rpc('move',{x:i%2?49:50,y:77});if(i>1)samples.push(performance.now()-start);}samples.sort((a,b)=>a-b);return Math.round(samples[Math.floor(samples.length/2)]*100)/100;};
 const before=await run();await db.exec(await fs.readFile('supabase/migrations/202611250003_online_walk_performance.sql','utf8'));const after=await run();console.log(JSON.stringify({environment:'local PGlite, no network',monsters:count,medianBeforeMs:before,medianAfterMs:after,improvementPercent:Math.round((1-after/before)*100)}));
}finally{await db.close();}
