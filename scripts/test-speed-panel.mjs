import assert from 'node:assert/strict';
import {makeHousingDb} from './housing-test-db.mjs';

const {db,login,rpc}=await makeHousingDb();
try{
 const users=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
 const ids=[];
 let room;
 for(const [i,uid] of users.entries()){
  await db.query('insert into auth.users values($1)',[uid]);
  await login(uid);
  const state=await rpc('create_character',{name:'Speed '+i,gender:'male'});
  const id=state.characters[0].id;ids.push(id);await rpc('join',{character_id:id});
  await db.query("update online_presence set x=4,y=10,moved_at='epoch' where character_id=$1",[id]);
  const entry=await (i===0?rpc('room_create',{name:'Speed panel'}):rpc('room_join',{room_id:room}));
  room=entry.adventure.id;
 }
 const place=async(id,x,y)=>{await db.query('update online_adventure_members set x=$2,y=$3 where character_id=$1',[id,x,y]);await db.query("update online_presence set moved_at='epoch',seen_at=clock_timestamp() where character_id=$1",[id]);};
 await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot-'effectPanels','{enemies}','[]') where id=$1",[room]);
 await place(ids[0],49,77);await place(ids[1],50,76);
 await login(users[0]);await rpc('poll');
 let sequence=0;
 const walk=async(x,y)=> (await db.query('select online_dungeon_walk($1) as s',[JSON.stringify({session:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',sequence:++sequence,roomId:room,floor:1,steps:[{x,y}]})])).rows[0].s;
 const initial=await walk(49,76);
 const until=initial.snapshot.speedPanelUntil[ids[0]];
 assert.equal(initial.ack.accepted,1);
 assert(until-initial.serverTime<=10000&&until-initial.serverTime>9500);
 assert.equal(initial.snapshot.speedPanelUntil[ids[1]],undefined);
 const timings=(await db.query("select online_speed_panel_step(190,snapshot,$2,$3) boosted,online_speed_panel_step(190,snapshot,$2,$4) expired from online_adventure_rooms where id=$1",[room,ids[0],until-1,until])).rows[0];
 assert.deepEqual(timings,{boosted:146,expired:190});
 await place(ids[0],49,77);
 await login(users[1]);
 const second=await rpc('move',{x:49,y:76});
 assert.equal(second.adventure.x,49);
 assert(second.adventure.snapshot.speedPanelUntil[ids[1]]>0,'separate single-step activation');
 await place(ids[1],50,76);
 await db.query("update online_adventure_rooms set snapshot=jsonb_set(snapshot,array['speedPanelUntil',$2::text],'1') where id=$1",[room,ids[0]]);
 await login(users[0]);const repeat=await walk(49,76);
 assert.equal(repeat.snapshot.speedPanelUntil[ids[0]],1,'expired panel remains used');
 console.log('PASS speed panel: batched and single-step activation, two independent players, exact expiry, no repeat.');
}finally{await db.close();}
