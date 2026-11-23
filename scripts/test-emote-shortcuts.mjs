import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {makeHousingDb} from './housing-test-db.mjs';
const {db,login,rpc}=await makeHousingDb();
try{
 const uid='11111111-1111-4111-8111-111111111111';await db.query('insert into auth.users values($1)',[uid]);await login(uid);
 let s=await rpc('create_character',{name:'EmoteTest',gender:'female'});const cid=s.characters[0].id;await rpc('join',{character_id:cid});
 s=await rpc('set_quick_slot',{index:3,ref:{category:'emote',key:'hello',extra:'discard'}});
 assert.deepEqual(s.active.quickSlots[3],{category:'emote',key:'hello'});
 s=await rpc('poll');assert.equal(s.active.quickSlots[3].key,'hello','normalization preserves emote');
 await rpc('swap_quick_slots',{from:3,to:0});s=await rpc('poll');assert.equal(s.active.quickSlots[0].key,'hello');assert.equal(s.active.quickSlots[3].key,'potion');
 await rpc('leave');s=await rpc('join',{character_id:cid});assert.equal(s.active.quickSlots[0].key,'hello','saved across re-entry');
 await assert.rejects(rpc('set_quick_slot',{index:1,ref:{category:'emote',key:'unknown'}}),/エモート/);
 await assert.rejects(rpc('set_quick_slot',{index:1,ref:{category:'emote'}}),/エモート/);
 await assert.rejects(rpc('set_quick_slot',{index:20,ref:{category:'emote',key:'hello'}}),/ショートカット/);
 await rpc('set_quick_slot',{index:0,ref:null});assert.equal((await rpc('poll')).active.quickSlots[0],null);
 await db.exec(await fs.readFile('supabase/migrations/202611230001_online_emote_shortcuts.sql','utf8'));
 const other='21111111-1111-4111-8111-111111111111';await db.query('insert into auth.users values($1)',[other]);await login(other);
 await assert.rejects(rpc('set_quick_slot',{index:0,ref:{category:'emote',key:'hello'}}));
 console.log('PASS emote shortcut save/swap/remove, re-entry, unknown ID rejection, ownership and idempotent migration');
}finally{await db.close();}
