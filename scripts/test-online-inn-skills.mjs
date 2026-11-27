import assert from 'node:assert/strict';
import {makeHousingDb} from './housing-test-db.mjs';

const {db,login,rpc}=await makeHousingDb();
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
await db.query('insert into auth.users values ($1),($2)',[a,b]);
async function player(uid,name){
 await login(uid);
 const state=await rpc('create_character',{name,gender:'male'});
 const id=state.characters[0].id;
 await rpc('join',{character_id:id});
 return id;
}
const place=(x,y)=>db.query("update online_presence set x=$1,y=$2,moved_at='epoch' where user_id=auth.uid()",[x,y]);
const hp=(id,value)=>db.query('update online_characters set hp=$2 where id=$1',[id,value]);

try{
 const alice=await player(a,'旅人アル');
 await assert.rejects(()=>rpc('inn_enter'),/宿の扉/);
 await assert.rejects(()=>rpc('set_character_skill',{key:'heal',slot:0}),/レベル/);
 await assert.rejects(()=>rpc('party_create'),/終了/);
 await assert.rejects(()=>rpc('channel_chat',{channel:'party',message:'test'}),/終了/);
 await assert.rejects(()=>rpc('map_pin',{scope:'party',x:3,y:4}),/終了/);

 const bob=await player(b,'旅人ベル');
 await place(7,8);
 await login(a);await place(3,4);
 let state=await rpc('inn_enter');
 assert.equal(state.active.location,'inn');
 assert.equal(state.house.id,'adventurers-inn');
 assert.equal(state.house.x,7);
 assert.equal(state.house.y,8);
 assert.deepEqual(state.players.map(p=>p.character_id),[alice]);
 assert.deepEqual(state.drops,[]);
 assert.deepEqual(state.trainingHits,[]);
 await rpc('chat',{message:'酒場だけ'});
 await rpc('move',{x:7,y:7});
 await assert.rejects(()=>rpc('move',{x:10,y:7}),/移動/);
 await assert.rejects(()=>rpc('inn_exit'),/出口/);
 await assert.rejects(()=>rpc('room_create',{name:'wrong space'}),/酒場/);
 await rpc('set_quick_slot',{index:5,ref:{category:'item',key:'potion'}});
 state=await rpc('swap_quick_slots',{from:5,to:10});
 assert.equal(state.active.quickSlots[10].key,'potion');
 assert.equal(state.active.location,'inn');

 await login(b);
 state=await rpc('poll');
 assert.ok(!state.players.some(p=>p.character_id===alice));
 assert.ok(!state.messages.some(m=>m.message==='酒場だけ'));
 await place(3,4);
 state=await rpc('inn_enter');
 assert.equal(state.players.length,2);
 assert.ok(state.messages.some(m=>m.message==='酒場だけ'));
 await hp(bob,42);
 await login(a);
 await db.query('update online_characters set adventure_xp=80 where id=$1',[alice]);
 state=await rpc('set_character_skill',{key:'heal',slot:0});
 assert.equal(state.active.level,5);
 state=await rpc('set_character_skill',{key:'area_heal',slot:1});
 assert.deepEqual(state.active.skillLoadout,['heal','area_heal']);
 await hp(alice,40);
 state=await rpc('cast_character_skill',{key:'heal'});
 assert.equal(state.active.hp,75);
 await assert.rejects(()=>rpc('cast_character_skill',{key:'heal'}),/再使用/);
 state=await rpc('cast_character_skill',{key:'area_heal'});
 assert.equal(state.active.hp,100);
 assert.equal((await db.query('select hp from online_characters where id=$1',[bob])).rows[0].hp,67);

 await place(7,8);
 state=await rpc('inn_exit');
 assert.equal(state.active.location,'town');
 assert.ok(!state.house);
 assert.ok(!state.players.some(p=>p.character_id===bob));
 await place(3,10);
 state=await rpc('room_create',{name:'技能試験'});
 const room=state.adventure.id;
 assert.ok(room);
 const {rows:[{snapshot}]}=await db.query('select snapshot from online_adventure_rooms where id=$1',[room]);
 const enemy=snapshot.enemies.find(e=>e.hp>0);
 await db.query('update online_adventure_members set x=$1,y=$2 where character_id=$3',[enemy.x-1,enemy.y,alice]);
 await db.query('update online_adventure_rooms set snapshot=$2 where id=$1',[room,JSON.stringify({...snapshot,enemies:snapshot.enemies.map(e=>e.id===enemy.id?{...e,hp:0}:e)})]);
 assert.equal((await db.query('select adventure_xp from online_characters where id=$1',[alice])).rows[0].adventure_xp,88);
 const outside=(await db.query('select adventure_xp from online_characters where id=$1',[bob])).rows[0];
 assert.equal(outside.adventure_xp,0);
 console.log('PASS: tavern occupancy, chat isolation, exit, shortcuts, party retirement, healing and combat XP');
}finally{
 await db.close();
}
