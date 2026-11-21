import assert from 'node:assert/strict';
import {makeHousingDb} from './housing-test-db.mjs';
const{db,login,rpc}=await makeHousingDb();
const users=['11111111-1111-4111-8111-111111111111','21111111-1111-4111-8111-111111111111'],ids:string[]=[];
const stall=async(uid:string)=>db.query("update online_presence set location='town',x=16,y=3 where user_id=$1",[uid]);
try{
 for(const uid of users){await db.query('insert into auth.users values($1)',[uid]);await login(uid);const s=await rpc('create_character',{name:'Resale '+ids.length,gender:'male'});ids.push(s.characters[0].id);await rpc('join',{character_id:ids.at(-1)});await db.query('update online_characters set gold=2000000 where id=$1',[ids.at(-1)]);}
 await login(users[0]);await stall(users[0]);let s=await rpc('house_buy',{house_id:'north-1'});assert.equal(s.active.gold,1500000);assert.equal(s.houses.find(h=>h.mine).resalePrice,350000);
 const data=(await db.query("select data from online_house_catalog where id='north-1'")).rows[0].data;
 await db.query("update online_house_catalog set data=jsonb_set(data,'{price}','1000000')where id='north-1'");
 await login(users[1]);await stall(users[1]);await assert.rejects(()=>rpc('house_sell',{house_id:'north-1'}));
 await login(users[0]);await db.query('update online_presence set x=$1,y=$2 where user_id=$3',[data.doorX,data.doorY+1,users[0]]);await assert.rejects(()=>rpc('house_sell',{house_id:'north-1'}));
 await rpc('house_enter',{house_id:'north-1'});await rpc('chat',{message:'Previous owner private chat'});
 await db.query("update online_house_owners set allow_friends=true where house_id='north-1'");await db.query("insert into online_friendships(requester,recipient,status)values($1,$2,'accepted')",users);await rpc('house_exit');await stall(users[0]);
 await login(users[1]);await db.query('update online_presence set x=$1,y=$2 where user_id=$3',[data.doorX,data.doorY+1,users[1]]);await rpc('house_enter',{house_id:'north-1'});
 await login(users[0]);s=await rpc('house_sell',{house_id:'north-1',refund:999999999});assert.equal(s.active.gold,1850000,'refund from purchase price, ignores client amount/current catalog');assert.equal(s.houses.find(h=>h.id==='north-1').ownerId,null);await assert.rejects(()=>rpc('house_sell',{house_id:'north-1'}));assert.equal((await rpc('poll')).active.gold,1850000);
 assert.equal((await db.query('select count(*)n from online_house_sales')).rows[0].n,1);assert.equal((await db.query('select count(*)n from online_house_visits')).rows[0].n,0);
 await login(users[1]);s=await rpc('poll');assert.equal(s.house,null);assert.equal(s.active.location,'town');await stall(users[1]);s=await rpc('house_buy',{house_id:'north-1'});assert.equal(s.houses.find(h=>h.mine).resalePrice,700000);
 await db.query('update online_presence set x=$1,y=$2 where user_id=$3',[data.doorX,data.doorY+1,users[1]]);s=await rpc('house_enter',{house_id:'north-1'});assert.ok(!s.messages.some(m=>m.message==='Previous owner private chat'));assert.equal(s.house.allowFriends,false);await assert.rejects(()=>rpc('house_sell',{house_id:'north-1'}));
 await login('');await assert.rejects(()=>rpc('house_sell',{house_id:'north-1'}));
 assert.equal((await db.query("select has_table_privilege('authenticated','online_house_sales','select')allowed")).rows[0].allowed,false);
 console.log('PASS: owner and stall checks, original price ×70%, ignored forged refund, duplicate sale rejection, visitor ejection, resale/rebuy, reset permissions, private chat isolation and audit RLS.');
}finally{await db.close();}
