import assert from 'node:assert/strict';import {makeHousingDb} from './housing-test-db.mjs';
const {db,login,rpc}=await makeHousingDb();
try{
 const users=Array.from({length:6},(_,i)=>`${i+1}1111111-1111-4111-8111-111111111111`),chars=[];
 for(const [i,uid]of users.entries()){await db.query('insert into auth.users values($1)',[uid]);await login(uid);const s=await rpc('create_character',{name:'Party '+i,gender:'male'});chars.push(s.characters[0].id);await rpc('join',{character_id:chars.at(-1)});}
 await login(users[0]);let s=await rpc('party_create');assert.equal(s.party.members.length,1);assert.equal(s.party.isLeader,true);
 for(let i=1;i<=4;i++){await login(users[0]);if(i===4){await assert.rejects(()=>rpc('party_invite',{character_id:chars[i]}),/4人まで/);break;}await rpc('party_invite',{character_id:chars[i]});if(i<4){await login(users[i]);s=await rpc('poll');s=await rpc('party_accept',{id:s.partyInvites[0].id});assert.equal(s.party.members.length,i+1);}}

 const u=(i)=>`${i+1}1111111-1111-4111-8111-111111111111`;
 await login(u(0));s=await rpc('channel_chat',{channel:'party',message:'private party'});assert.equal(s.channelMessages.at(-1).message,'private party');
 await login(u(1));assert.equal((await rpc('poll')).channelMessages.at(-1).message,'private party');await assert.rejects(()=>rpc('party_kick',{character_id:s.party.members[0].id}));
 await login(u(5));assert.equal((await rpc('poll')).channelMessages.length,0);await assert.rejects(()=>rpc('channel_chat',{channel:'party',message:'intrusion'}));
 await login(u(0));s=await rpc('guild_create',{name:'Chat Test Guild'});await db.exec("update online_channel_messages set created_at=created_at-interval '2 seconds'");s=await rpc('channel_chat',{channel:'guild',message:'green guild'});assert.ok(s.channelMessages.some(m=>m.channel==='guild'));
 await login(u(1));assert.ok(!(await rpc('poll')).channelMessages.some(m=>m.channel==='guild'));s=await rpc('party_leave');assert.equal(s.party,null);assert.equal(s.channelMessages.length,0);
 await login(u(0));await rpc('party_leave');await login(u(2));s=await rpc('poll');assert.equal(s.party.isLeader,true);
 assert.equal((await db.query("select has_function_privilege('authenticated','online_world_pre_parties(text,jsonb)','execute') allowed")).rows[0].allowed,false);
 console.log('PASS party creation/invites/approval/limit/leader handoff; private party and guild chat; outsider and former-member denial; wrapper protection');
}finally{await db.close();}

