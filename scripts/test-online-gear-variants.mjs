import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {makeHousingDb} from './housing-test-db.mjs';

const {db,login,rpc}=await makeHousingDb();
try{
 const uid='11111111-1111-4111-8111-111111111111';
 await db.query('insert into auth.users values($1)',[uid]);
 await login(uid);
 let state=await rpc('create_character',{name:'Variant test',gender:'female'});
 const cid=state.characters[0].id;
 await rpc('join',{character_id:cid});
 await db.query("update online_profiles set super_account=true where user_id=$1",[uid]);
 await db.query("update online_characters set gold=10000 where id=$1",[cid]);
 await rpc('redeem_code',{code:'19960711'});
 const selections=[
  ['armor','leather','armor_leather'],['shield','s_iron_round','s_iron_round'],
  ['gloves','gloves_aqua','gloves_aqua'],['boots','boots_aqua','boots_aqua'],
  ['necklace','n_celestial','n_celestial'],
 ];
 for(const [slot,base,key] of selections){
  state=await rpc('claim_item',{key,starred:true});
  const item=state.active.instances[slot].find(i=>i.key==='star_'+base);
  assert(item,slot);
  state=await rpc('equip',{slot,key:item.key,instanceId:item.id,equipped:true});
  assert.equal(state.active.gear[slot+'_key'],item.key);
 }
 assert.equal(state.active.hpMax,355);
 const result=(await db.query('select online_move_step_ms($1) move,online_character_attack_ms($1) attack,online_necklace_skill($1) skill,online_adventure_defence($1) defence',[cid])).rows[0];
 assert.deepEqual([result.move,result.attack,+result.skill,result.defence],[146,248,1.2,5]);
 await rpc('redeem_code',{code:'11111111'});
 state=await rpc('poll');
 assert.equal(state.active.hp,355);
 const self=state.players.find(player=>player.character_id===cid);
 for(const [slot,base] of selections)assert.equal(self[slot],'star_'+base);
 if(process.argv[2])await writeFile(process.argv[2],JSON.stringify(state));

 const item=state.active.instances.armor.find(i=>i.key==='star_leather');
 state=await rpc('drop_equipment',{slot:'armor',key:item.key,instanceId:item.id});
 const loot=state.drops.find(d=>d.kind==='star_armor_leather');
 assert(loot);
 state=await rpc('pickup_item',{drop_id:loot.id});
 assert(state.active.instances.armor.some(i=>i.key===item.key&&i.id===item.id));
 assert.equal(state.active.hp,300);

 await db.exec("update online_presence set x=22,y=4,seen_at=now() where user_id=auth.uid()");
 await rpc('warehouse_enter');
 const boots=state.active.instances.boots.find(i=>i.key==='star_boots_aqua');
 state=await rpc('warehouse_deposit',{category:'boots',key:boots.key,instanceId:boots.id});
 assert.equal(state.active.hpMax,250);
 assert(state.active.warehouse.instances.boots.some(i=>i.id===boots.id&&i.key===boots.key));
 state=await rpc('warehouse_withdraw',{category:'boots',key:boots.key,instanceId:boots.id});
 assert(state.active.instances.boots.some(i=>i.id===boots.id&&i.key===boots.key));
 await rpc('warehouse_exit');

 const definition=(await db.query("select pg_get_functiondef('public.online_world_equipment(text,jsonb)'::regprocedure) as source")).rows[0].source;
 assert(definition.includes("cat.category<>'item' and random()<.01"));
 // Force a roll in the local-only database to exercise the purchase and gacha entry points.
 await db.exec(definition.replace('random()<.01','random()<1'));
 const place=(x,y)=>db.query('update online_presence set x=$1,y=$2,seen_at=now() where user_id=auth.uid()',[x,y]);
 await place(18,4);
 state=await rpc('buy',{key:'gloves_leather'});
 assert(state.active.instances.gloves.some(i=>i.key==='star_gloves_leather'));
 await place(2,13);
 state=await rpc('gacha');
 const category=(await db.query('select category from online_catalog where key=$1',[state.reward])).rows[0].category;
 assert(state.active.instances[category].some(i=>i.key==='star_'+(category==='armor'?state.reward.slice(6):state.reward)));
 console.log('PASS: five variant slots, natural roll routing, max HP, equipment effects and loot/warehouse round trips');
}catch(error){
 console.error(error.message);
 process.exitCode=1;
}finally{
 await db.close();
}
