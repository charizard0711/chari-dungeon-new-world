import assert from 'node:assert/strict';
import {makeHousingDb} from './housing-test-db.mjs';
const {db,login,rpc}=await makeHousingDb();
try{
 const users=['11111111-1111-4111-8111-111111111111','21111111-1111-4111-8111-111111111111'];const chars:string[]=[];
 for(const uid of users){await db.query('insert into auth.users values($1)',[uid]);await login(uid);const s=await rpc('create_character',{name:'Hair '+chars.length,gender:'female',hair_color:'blue'});chars.push(s.characters[0].id);assert.equal(s.characters[0].hair_color,'blue');await rpc('join',{character_id:chars.at(-1)});}
 await db.exec("update online_presence set x=8,y=16,location='town';update online_characters set gold=7000;");
 await login(users[0]);for(const hair of ['black','silver','gold','red','blue','brown']){const s=await rpc('appearance_hair',{character_id:chars[0],hair_color:hair});assert.equal(s.characters[0].hair_color,hair);assert.equal(s.active.hair_color,hair);assert.equal(s.players.find(p=>p.character_id===chars[0]).hair_color,hair);}
 assert.equal((await db.query('select gold from online_characters where id=$1',[chars[0]])).rows[0].gold,1000);
 await rpc('appearance_hair',{character_id:chars[0],hair_color:'silver'});
 await rpc('appearance_hair',{character_id:chars[0],hair_color:'silver'});
 assert.equal((await db.query('select gold from online_characters where id=$1',[chars[0]])).rows[0].gold,0);
 await assert.rejects(()=>rpc('appearance_hair',{character_id:chars[0],hair_color:'red'}),/1,000G/);
 await db.exec("update online_presence set x=12,y=14;update online_characters set gold=5000;");
 await assert.rejects(()=>rpc('appearance_hair',{character_id:chars[0],hair_color:'red'}),/床屋/);
await login(users[1]);assert.equal((await rpc('poll')).players.find(p=>p.character_id===chars[0]).hair_color,'silver');
 await assert.rejects(()=>rpc('appearance_hair',{character_id:chars[0],hair_color:'red'}));await assert.rejects(()=>rpc('appearance_hair',{character_id:chars[1],hair_color:'invalid'}));await login('');await assert.rejects(()=>rpc('appearance_hair',{character_id:chars[0],hair_color:'blue'}));
 assert.equal((await db.query("select has_function_privilege('authenticated','online_world_pre_character_hair(text,jsonb)','execute')allowed")).rows[0].allowed,false);
 console.log('PASS: free creation color, 1000G atomic debit, no charge for same color, insufficient funds/distance guards, six persistent hair colors, owner-only changes, remote player visibility, active/list parity, invalid/anonymous rejection and private wrapper.');
}finally{await db.close();}
