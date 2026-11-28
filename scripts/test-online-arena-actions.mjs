import assert from 'node:assert/strict';
import {makeHousingDb} from './housing-test-db.mjs';
const {db,login,rpc}=await makeHousingDb();

try{
 const uid='11111111-1111-4111-8111-111111111111';
 await db.query('insert into auth.users values($1)',[uid]);
 await login(uid);
 let state=await rpc('create_character',{name:'Arena Probe',gender:'male'});
 const id=state.characters[0].id;
 await rpc('join',{character_id:id});
 await db.query("update online_presence set x=3,y=9 where character_id=$1",[id]);
 state=await rpc('room_create',{name:'Arena Probe'});
 const room=state.adventure.id;
 const place=(x,y)=>db.query('update online_adventure_members set x=$1,y=$2 where character_id=$3',[x,y,id]);
 const snapshot=async()=>(await db.query('select snapshot from online_adventure_rooms where id=$1',[room])).rows[0].snapshot;
 await place(47,15);
 await rpc('poll');
 await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{bossEncounter,at}',to_jsonb(online_adventure_now_ms()-15000)) where id=$1",[room]);
 await db.query('select online_maze_sync($1)',[room]);
 await place(50,13);
 const before=await snapshot();
 const retainer=before.enemies.find(e=>e.retainer);
 assert.ok(retainer);
 assert.equal(before.enemies.filter(e=>e.retainer).length,3);
 const cfg=(await db.query("select data from online_adventure_config where id='floor1'")).rows[0].data;
 const step=async(enemy,frame)=>(await db.query('select online_enemy_step_cached($1,$2,$3,$4,$5) as s',
  [room,enemy,id,JSON.stringify(frame),JSON.stringify(cfg)])).rows[0].s;
 let patternFrame={...before,telegraphs:[]};
 const cast=async(enemy,frame)=>{
  frame={...frame,telegraphs:[],enemies:frame.enemies.map(e=>e.id===enemy?{...e,nextAreaAt:0,nextMoveAt:9e12,nextAttackAt:9e12}:e)};
  return step(enemy,frame);
 };
 const shapes=[];
 for(let i=0;i<3;i++){
  patternFrame=await cast('vesper',patternFrame);
  const warning=patternFrame.telegraphs[0];
  assert.equal(warning.pattern,i);
  shapes.push(JSON.stringify(warning.tiles));
 }
 assert.equal(new Set(shapes).size,3);
 for(const e of before.enemies.filter(e=>e.retainer)){
  const warned=await cast(e.id,before);
  assert.equal(warned.telegraphs[0].pattern,e.areaPattern);
 }

 const bossOf=frame=>frame.enemies.find(e=>e.id==='vesper');
 const health=async()=>(await db.query('select hp from online_characters where id=$1',[id])).rows[0].hp;
 const guardFrame={...before,brokenFloors:[],bossEncounter:{...before.bossEncounter,smash:undefined},telegraphs:[],enemies:before.enemies.map(e=>{
  if(e.boss)return {...e,x:50,y:10,nextMoveAt:0,nextAttackAt:0,nextAreaAt:9e12};
  if(e.id===retainer.id)return {...e,x:49,y:11,nextMoveAt:0,nextAttackAt:0,nextAreaAt:9e12};
  return e;
 })};
 let stepResult=await step('vesper',guardFrame);
 assert.deepEqual([bossOf(stepResult).x,bossOf(stepResult).y],[51,10],'the boss patrols behind the guards');
 for(let i=0;i<8;i++){
  stepResult=await step('vesper',stepResult);
  const boss=bossOf(stepResult);
  assert.ok(boss.x>=47&&boss.x<=53&&boss.y<11,'the guarded boss stays behind the front line');
 }
 const behindBoss={...guardFrame,enemies:guardFrame.enemies.map(e=>e.retainer?{...e,x:e.x===50?48:e.x,y:9}:e)};
 assert.equal(bossOf(await step('vesper',behindBoss)).y,9,'the boss steps back toward the cage if guards are behind him');
 const blockedRetreat={...behindBoss,brokenFloors:[{x:50,y:9}]};
 const detour=bossOf(await step('vesper',blockedRetreat));
 assert.deepEqual([detour.x,detour.y],[51,10],'the boss detours around a broken floor');
 await place(50,11);
 const hp=await health();
 await step('vesper',guardFrame);
 assert.equal(await health(),hp,'walking up to the guarded boss does not trigger a normal strike');
 await step(retainer.id,guardFrame);
 assert.ok(await health()<hp,'a retainer attacks before Vesper engages');
 await db.query('update online_characters set hp=$2 where id=$1',[id,hp]);
 const retaliation={...guardFrame,enemies:guardFrame.enemies.map(e=>e.boss?{...e,counterTarget:id,counterUntil:Date.now()+3000}:e)};
 stepResult=await step('vesper',retaliation);
 assert.ok(await health()<hp,'Vesper can counter the player who hit him');
 assert.equal(bossOf(stepResult).counterTarget,undefined,'a counter consumes the hit');
 await db.query('update online_characters set hp=$2 where id=$1',[id,hp]);
 await place(50,13);
 const unguarded={...guardFrame,enemies:guardFrame.enemies.map(e=>e.retainer?{...e,hp:0}:e)};
 assert.equal(bossOf(await step('vesper',unguarded)).y,11,'Vesper resumes pursuit after all guards fall');

 await assert.rejects(()=>rpc('inspect_player',{character_id:id}),/町で/);
 await assert.rejects(()=>rpc('use_item',{kind:'dynamite'}),/持っていません/);
 await place(48,13);
 await db.query("update online_characters set inventory=jsonb_set(inventory,'{dynamite}','1') where id=$1",[id]);
 const mob=before.enemies.find(e=>e.hp>0&&!e.boss&&!e.retainer&&!e.elite);
 const enemies=before.enemies.map(e=>{
  if(e.boss)return {...e,x:49,y:13,nextMoveAt:9e12,nextAttackAt:9e12,nextAreaAt:9e12};
  if(e.id===retainer.id)return {...e,x:48,y:14};
  if(e.id===mob.id)return {...e,x:47,y:13};
  return e;
 });
 await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{enemies}',$2) where id=$1",[room,JSON.stringify(enemies)]);
 await rpc('attack',{dir:'right'});
 assert.ok(bossOf(await snapshot()).hp<480,'a real weapon attack damages the guarded boss');
 assert.equal(bossOf(await snapshot()).counterTarget,id,'normal damage also opens a counter window');
 await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,'{enemies}',$2) where id=$1",[room,JSON.stringify(enemies)]);
 state=await rpc('use_item',{kind:'dynamite'});
 const after=await snapshot(),find=enemy=>after.enemies.find(e=>e.id===enemy);
 assert.equal(find('vesper').hp,432);
 assert.equal(find('vesper').counterTarget,id);
 assert.equal(find(retainer.id).hp,70);
 assert.equal(find(mob.id).hp,0);
 assert.equal(state.active.inventory.dynamite,0);
 assert.equal(after.blasts.length,1);
 assert.deepEqual({x:after.blasts[0].x,y:after.blasts[0].y},{x:48,y:13});
 console.log('PASS: the live cached AI supports guard-first combat, counters, pursuit, all arena patterns, and authoritative dynamite damage');
}catch(error){
 console.error(error.message,error.where??'');process.exitCode=1;
}finally{await db.close();}
