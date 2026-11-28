import assert from 'node:assert/strict';
import {makeHousingDb} from './housing-test-db.mjs';
const {db,login,rpc}=await makeHousingDb();
try {
 const a='10000000-0000-4000-8000-000000000001',b='10000000-0000-4000-8000-000000000002',c='10000000-0000-4000-8000-000000000003';
 const rpcIcons=async(action,icon=null)=>(await db.query('select online_friend_icons($1,$2) result',[action,icon])).rows[0].result;
 for (const [index,user] of [a,b,c].entries()){
  await db.query('insert into auth.users values($1)',[user]);await login(user);
  const id=(await rpc('create_character',{name:'Probe '+index,gender:'male'})).characters[0].id;
  await rpc('join',{character_id:id});
 }
 await login(a);
 await assert.rejects(()=>rpcIcons('save','w_unowned'));
 const mine=await rpcIcons('save','leather');assert.equal(mine.selected,'leather');
 await rpc('friend_request',{name:'Probe 1'});
 await login(b);
 const link=(await rpc('poll')).friends[0].id;
 assert.equal((await rpcIcons('list')).friends[link],'leather');
 await rpc('friend_accept',{id:link});
 assert.equal((await rpcIcons('list')).friends[link],'leather');
 await login(c);assert.deepEqual((await rpcIcons('list')).friends,{});
 await login(a);await rpcIcons('save',null);
 await login(b);assert.equal((await rpcIcons('list')).friends[link],undefined);
 console.log('PASS owned equipment icons, account relationship visibility, acceptance and reset');
} finally{await db.close();}
