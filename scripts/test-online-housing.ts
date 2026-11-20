import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {makeHousingDb} from './housing-test-db.mjs';
import {HOUSES,houseBlocked} from '../src/online/housingCatalog';
import {townBlocked} from '../src/online/townLayout';import {townPath} from '../src/online/gridPath';
const{db,login,rpc}=await makeHousingDb();const users=[1,2,3].map(n=>`${n}1111111-1111-4111-8111-111111111111`),chars:string[]=[];
try{
 for(const uid of users){await db.query('insert into auth.users values($1)',[uid]);await login(uid);let s=await rpc('create_character',{name:'House '+chars.length,gender:'male'});chars.push(s.characters[0].id);await rpc('join',{character_id:chars.at(-1)});}
 assert.equal(HOUSES.length,36);for(const region of ['north','east','south','west'])assert.equal(HOUSES.filter(h=>h.district===region).length,9);
 const cells=(await db.query('select x,y,online_town_blocked(x,y)blocked from generate_series(-35,59)gx(x)cross join generate_series(-35,53)gy(y)')).rows;
 for(const c of cells)assert.equal(townBlocked(c.x,c.y),c.blocked,`collision parity ${c.x},${c.y}`);
 for(const h of HOUSES)assert.ok(townPath({x:12,y:14},{x:h.doorX,y:h.doorY+1},[],townBlocked).length,`${h.id} entrance reachable`);
 await login(users[0]);await db.query('update online_characters set gold=20000000 where id=$1',[chars[0]]);
 await assert.rejects(()=>rpc('house_buy',{house_id:'north-1'}));await db.query('update online_presence set x=16,y=3 where user_id=$1',[users[0]]);
 let s=await rpc('house_buy',{house_id:'north-1'});assert.equal(s.active.gold,19500000);assert.equal(s.houses.find(h=>h.id==='north-1').mine,true);await assert.rejects(()=>rpc('house_buy',{house_id:'north-2'}));
 await login(users[1]);await db.query('update online_presence set x=16,y=3 where user_id=$1',[users[1]]);await assert.rejects(()=>rpc('house_buy',{house_id:'north-1'}));await assert.rejects(()=>rpc('house_buy',{house_id:'north-2'}));
 const h=HOUSES[0];await db.query('update online_presence set x=$1,y=$2 where user_id=$3',[h.doorX,h.doorY+1,users[1]]);await assert.rejects(()=>rpc('house_enter',{house_id:h.id}));
 s=await rpc('drop_item',{kind:'potion'});assert.ok(s.drops.some(item=>item.x===h.doorX&&item.y===h.doorY+1),'items remain in expanded district');
 await login(users[0]);await db.query('update online_presence set x=$1,y=$2 where user_id=$3',[h.doorX,h.doorY+1,users[0]]);s=await rpc('house_enter',{house_id:h.id});assert.equal(s.active.location,'house');assert.equal(s.house.mine,true);assert.ok(!houseBlocked(s.house.x,s.house.y,s.house));
 await login(users[2]);s=await rpc('poll');assert.ok(!s.players.some(p=>p.character_id===chars[0]),'owner disappears outdoors');
 await login(users[0]);await db.query('update online_house_visits set x=$1,y=3 where character_id=$2',[h.width-3,chars[0]]);s=await rpc('house_settings',{allow_friends:true,allow_guild:false});assert.equal(s.house.allowFriends,true);
 await db.query("insert into online_friendships(requester,recipient,status)values($1,$2,'accepted')",[users[0],users[1]]);await login(users[1]);s=await rpc('house_enter',{house_id:h.id});assert.equal(s.house.mine,false);assert.ok(s.players.some(p=>p.character_id===chars[0]));await assert.rejects(()=>rpc('house_settings',{allow_friends:true}));await assert.rejects(()=>rpc('drop_gold',{amount:1}));
 s=await rpc('chat',{message:'House private chat'});assert.ok(s.messages.some(m=>m.message==='House private chat'));await login(users[2]);assert.ok(!(await rpc('poll')).messages.some(m=>m.message==='House private chat'));
 await login(users[0]);await rpc('house_settings',{allow_friends:false,allow_guild:false});await login(users[1]);s=await rpc('poll');assert.equal(s.house,null);assert.equal(s.active.location,'town');
 await login(users[0]);s=await rpc('guild_create',{name:'Housing guild'});await db.query('insert into online_guild_members(character_id,guild_id)values($1,$2)',[chars[2],s.guild.id]);await rpc('house_settings',{allow_friends:false,allow_guild:true});
 await login(users[2]);await db.query('update online_presence set x=$1,y=$2 where user_id=$3',[h.doorX,h.doorY+1,users[2]]);assert.ok((await rpc('house_enter',{house_id:h.id})).house);s=await rpc('house_exit');assert.equal(s.active.location,'town');assert.ok(!townBlocked(s.players.find(p=>p.character_id===chars[2]).x,s.players.find(p=>p.character_id===chars[2]).y));
 await db.query("update online_presence set x=16,y=1,location='town'where user_id=$1",[users[2]]);await db.query("insert into online_ground_items(kind,x,y,dropped_by)values('potion',16,1,$1)",[users[2]]);
 const relocation=await fs.readFile('supabase/migrations/202611210005_online_housing_relocation.sql','utf8');await db.exec(relocation);await db.exec(relocation);s=await rpc('poll');const after=s.players.find(p=>p.character_id===chars[2]);assert.ok(!townBlocked(after.x,after.y));assert.equal((await db.query('select count(*)n from online_ground_items where online_town_blocked(x,y)')).rows[0].n,0);
 const rights=(await db.query("select has_table_privilege('authenticated','online_house_owners','SELECT')allowed")).rows[0];assert.equal(rights.allowed,false);
 console.log('PASS: 36 reachable houses, complete client/server collision parity, prices and debit, unique ownership, insufficient funds, exterior disappearance, owner-only crystal settings, private/friend/guild access, revocation, private chat, exit placement and RLS.');
}finally{await db.close();}
