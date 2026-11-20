import {PGlite} from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select '{"is_anonymous":false}'::jsonb$$;`);
for(const file of (await fs.readdir('supabase/migrations')).filter(f=>f.includes('_online_')||f.includes('_town_equipment_')).sort())await db.exec(await fs.readFile('supabase/migrations/'+file,'utf8'));
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
await db.query('insert into auth.users values($1),($2)',[a,b]);
const identity=uid=>db.query("select set_config('test.uid',$1,false)",[uid]);
const rpc=async(action,payload={})=>(await db.query('select online_world($1,$2) as state',[action,JSON.stringify(payload)])).rows[0].state;
await assert.rejects(()=>rpc('list'));await identity(a);
let state=await rpc('list');assert.equal(state.characters.length,0);assert.equal(state.superAccount,false);
state=await rpc('create_character',{name:'勇者一号',gender:'male'});const first=state.characters[0].id;
state=await rpc('create_character',{name:'勇者二号',gender:'female'});assert.equal(state.characters.length,2);
await assert.rejects(()=>rpc('create_character',{name:'三人目',gender:'male'}));
state=await rpc('join',{character_id:first});assert.equal(state.active.name,'勇者一号');assert.equal(state.players[0].x,12);assert.equal(state.active.inventory.potion,3);
state=await rpc('move',{x:12,y:13});assert.equal(state.players[0].y,13);
await assert.rejects(()=>rpc('move',{x:12,y:11}));
state=await rpc('equip',{slot:'weapon',equipped:false});assert.equal(state.active.gear.weapon,false);
await assert.rejects(()=>rpc('equip',{slot:'admin',equipped:true}));
await assert.rejects(()=>rpc('use_item',{kind:'potion'}));assert.equal((await rpc('poll')).active.inventory.potion,3);
state=await rpc('chat',{message:'<b>こんにちは</b>'});assert.equal(state.messages[0].name,'勇者一号');
await identity(b);state=await rpc('list');assert.equal(state.characters.length,0);
await assert.rejects(()=>rpc('join',{character_id:first}));
state=await rpc('create_character',{name:'別の旅人',gender:'female'});const other=state.characters[0].id;
state=await rpc('join',{character_id:other});assert.equal(state.players.length,2);
await db.exec('set role authenticated');await assert.rejects(()=>db.exec('update online_characters set inventory=\'{"potion":999}\''));await assert.rejects(()=>db.exec('select online_town(\'join\')'));await db.exec('reset role');
await identity(a);await rpc('leave');state=await rpc('join',{character_id:first});assert.equal(state.active.gear.weapon,false);assert.equal(state.active.inventory.potion,3);
// Client/server use exactly the same collision grid, including all lamps and tree trunks.
const ts=await import('typescript');const layout=ts.default.transpileModule((await fs.readFile('src/online/housingCatalog.ts','utf8'))+'\n'+(await fs.readFile('src/online/townLayout.ts','utf8')).replace(/^import .*;\r?$/gm,''),{compilerOptions:{module:ts.default.ModuleKind.ESNext}}).outputText;
const {townBlocked}=await import(`data:text/javascript;base64,${Buffer.from(layout).toString('base64')}`);
const grid=(await db.query('select x,y,online_town_blocked(x,y) blocked from generate_series(0,24)x cross join generate_series(0,18)y')).rows;
for(const cell of grid)assert.equal(townBlocked(cell.x,cell.y),cell.blocked,`collision ${cell.x},${cell.y}`);
for(const [x,y]of [[9,6],[15,6],[9,12],[15,12]]){await db.query("update online_presence set x=$1,y=$2,moved_at='epoch' where user_id=$3",[x,y+1,a]);await assert.rejects(()=>rpc('move',{x,y}));}
await db.query('update online_presence set x=22,y=16 where user_id=$1',[b]);
await db.query("update online_presence set x=12,y=14,moved_at='epoch' where user_id=$1",[a]);
state=await rpc('drop_item',{kind:'potion',quantity:999});assert.equal(state.active.inventory.potion,2);assert.equal(state.drops.length,1);const drop=state.drops[0];assert.equal(drop.x,12);assert.equal(drop.y,14);
await assert.rejects(()=>rpc('drop_item',{kind:'weapon'}));
await identity(b);await db.query('update online_presence set x=22,y=16 where user_id=$1',[b]);await assert.rejects(()=>rpc('pickup_item',{drop_id:drop.id}));
await db.query('update online_presence set x=12,y=15 where user_id=$1',[b]);state=await rpc('pickup_item',{drop_id:drop.id});assert.equal(state.active.inventory.potion,4);assert.equal(state.drops.length,0);
await identity(a);await assert.rejects(()=>rpc('pickup_item',{drop_id:drop.id}));assert.equal((await rpc('poll')).active.inventory.potion,2);
await db.query(`update online_characters set inventory='{"potion":0}' where id=$1`,[first]);await assert.rejects(()=>rpc('drop_item',{kind:'potion'}));assert.equal((await rpc('poll')).drops.length,0);
await db.exec('set role authenticated');await assert.rejects(()=>db.exec("insert into online_ground_items(kind,x,y,dropped_by) values('potion',12,14,'11111111-1111-4111-8111-111111111111')"));await assert.rejects(()=>db.exec('select * from online_ground_items'));await db.exec('reset role');
// Super commands must use the protected DB flag and the server catalog.
await assert.rejects(()=>rpc('redeem_code',{code:'19960711',superAccount:true}));await assert.rejects(()=>rpc('claim_item',{key:'potion'}));
await db.query('update online_profiles set super_account=true where user_id=$1',[a]);
await assert.rejects(()=>rpc('claim_item',{key:'potion'}));await assert.rejects(()=>rpc('redeem_code',{code:'0000'}));
state=await rpc('redeem_code',{code:'19960711'});assert.equal(state.superAccount,true);assert.equal(state.active.catalogUnlocked,true);
state=await rpc('claim_item',{key:'potion'});assert.equal(state.active.inventory.potion,1);await assert.rejects(()=>rpc('claim_item',{key:'nonexistent',quantity:999}));
const weapon=(await db.query("select key from online_catalog where category='weapon' and key<>'w_iron_dagger' order by key limit 1")).rows[0].key;
await assert.rejects(()=>rpc('equip',{slot:'weapon',equipped:true,key:weapon}));
state=await rpc('claim_item',{key:weapon,starred:true});assert.ok(state.active.equipment.weapon.includes('star_'+weapon));
state=await rpc('equip',{slot:'weapon',equipped:true,key:'star_'+weapon});assert.equal(state.active.gear.weapon_key,'star_'+weapon);
state=await rpc('redeem_code',{code:'11111111'});assert.equal(state.active.hp,150);
state=await rpc('equip',{slot:'weapon',equipped:false});assert.equal(state.active.hp,100);
for(const category of ['armor','shield']){const key=(await db.query("select key from online_catalog where category=$1 and key<>'armor_leather' order by key limit 1",[category])).rows[0].key;state=await rpc('claim_item',{key});const owned=category==='armor'?key.slice(6):key;assert.ok(state.active.equipment[category].includes(owned));state=await rpc('equip',{slot:category,equipped:true,key:owned});assert.equal(state.active.gear[category+'_key'],owned);}
await rpc('leave');state=await rpc('join',{character_id:first});assert.ok(state.active.equipment.weapon.includes('star_'+weapon));
await db.query('update online_profiles set super_account=false where user_id=$1',[a]);await assert.rejects(()=>rpc('claim_item',{key:'potion'}));state=await rpc('poll');assert.equal(state.active.catalogUnlocked,false);
await identity(b);await assert.rejects(()=>rpc('redeem_code',{code:'19960711'}));await assert.rejects(()=>rpc('claim_item',{key:weapon,superAccount:true}));
await db.exec('set role authenticated');await assert.rejects(()=>db.exec('update online_profiles set super_account=true'));await assert.rejects(()=>db.exec("insert into online_catalog values('forged','weapon')"));await db.exec('reset role');
// Equipped and starred weapons transfer atomically without requiring a super account.
const initialWeaponTotal=Number((await db.query("select sum(jsonb_array_length(equipment->'weapon')) total from online_characters")).rows[0].total);
await identity(a);const star='star_'+weapon;state=await rpc('equip',{slot:'weapon',equipped:true,key:star});const weaponIndex=state.active.equipment.weapon.indexOf(star);
await assert.rejects(()=>rpc('drop_weapon',{index:weaponIndex,key:'w_iron_dagger'}));await assert.rejects(()=>rpc('drop_weapon',{index:-1,key:star}));
state=await rpc('drop_equipment',{slot:'weapon',index:weaponIndex,key:star});assert.equal(state.active.gear.weapon,false);assert.equal(state.active.hp,100);assert.ok(!state.active.equipment.weapon.includes(star));const weaponDrop=state.drops.find(d=>d.category==='weapon');assert.equal(weaponDrop.kind,star);
await assert.rejects(()=>rpc('drop_weapon',{index:weaponIndex,key:star}));
await identity(b);await db.query('update online_presence set x=22,y=16 where user_id=$1',[b]);await assert.rejects(()=>rpc('pickup_item',{drop_id:weaponDrop.id}));await db.query('update online_presence set x=12,y=15 where user_id=$1',[b]);state=await rpc('pickup_item',{drop_id:weaponDrop.id});assert.ok(state.active.equipment.weapon.includes(star));assert.equal(state.superAccount,false);await assert.rejects(()=>rpc('pickup_item',{drop_id:weaponDrop.id}));
state=await rpc('drop_weapon',{index:state.active.equipment.weapon.indexOf(star),key:star});const returned=state.drops.find(d=>d.category==='weapon');
await identity(a);state=await rpc('pickup_item',{drop_id:returned.id});assert.ok(state.active.equipment.weapon.includes(star));
await identity(b);state=await rpc('drop_weapon',{index:0,key:'w_iron_dagger'});const starterDrop=state.drops.find(d=>d.category==='weapon');
await identity(a);state=await rpc('pickup_item',{drop_id:starterDrop.id});assert.equal(state.active.equipment.weapon.filter(k=>k==='w_iron_dagger').length,2);
await db.exec("update online_ground_items set created_at='epoch'");state=await rpc('drop_weapon',{index:2,key:'w_iron_dagger'});assert.equal(state.active.equipment.weapon.filter(k=>k==='w_iron_dagger').length,1);
const total=(await db.query("select (select sum(jsonb_array_length(equipment->'weapon')) from online_characters)+(select count(*) from online_ground_items where category='weapon') as total")).rows[0].total;assert.equal(Number(total),initialWeaponTotal);
// Armor and shield are transferable for normal users, including equipped copies.
for(const slot of ['armor','shield']){
 await identity(a);state=await rpc('poll');const key=state.active.equipment[slot].at(-1);await rpc('equip',{slot,equipped:true,key});
 const index=state.active.equipment[slot].lastIndexOf(key);await db.exec("update online_ground_items set created_at='epoch'");
 await assert.rejects(()=>rpc('drop_equipment',{slot,index,key:'forged'}));
 state=await rpc('drop_equipment',{slot,index,key});assert.equal(state.active.gear[slot],false);const drop=state.drops.find(d=>d.category===slot);assert.equal(drop.kind,slot==='armor'?'armor_'+key:key);
 await identity(b);state=await rpc('pickup_item',{drop_id:drop.id});assert.ok(state.active.equipment[slot].includes(key));await assert.rejects(()=>rpc('pickup_item',{drop_id:drop.id}));
}
// Join, occupied destination and stale-session recovery preserve distinct cells.
await identity(a);await db.query("update online_presence set x=12,y=14,moved_at='epoch' where user_id=$1",[a]);
await db.query("update online_presence set x=13,y=14,moved_at='epoch' where user_id=$1",[b]);await assert.rejects(()=>rpc('move',{x:13,y:14}));
await identity(b);await rpc('leave');state=await rpc('join',{character_id:other});assert.equal(new Set(state.players.map(p=>`${p.x},${p.y}`)).size,state.players.length);
await db.query('update online_presence set x=12,y=14 where user_id=$1',[b]);state=await rpc('poll');assert.equal(new Set(state.players.map(p=>`${p.x},${p.y}`)).size,state.players.length);
console.log('PASS: armor/shield equipped transfers, stale index denial, distinct joins, occupied cells and reconnect relocation');
// Practice attacks are constrained to the immortal target and grant no progression.
await identity(a);await db.query('update online_presence set x=12,y=6 where user_id=$1',[a]);await rpc('equip',{slot:'weapon',equipped:true,key:'w_iron_dagger'});const beforeTraining=(await rpc('poll')).active;
state=await rpc('train',{damage:999999,target_user:b});const hit=state.trainingHits.at(-1);assert.equal(hit.character_id,first);assert.equal(hit.dir,'up');assert.ok(hit.damage>=5&&hit.damage<100);assert.equal(state.active.hp,beforeTraining.hp);assert.deepEqual(state.active.inventory,beforeTraining.inventory);assert.deepEqual(state.active.equipment,beforeTraining.equipment);
await assert.rejects(()=>rpc('train'));await assert.rejects(()=>rpc('move',{x:12,y:5}));
await db.query('update online_presence set x=13,y=6 where user_id=$1',[a]);await db.exec("update online_training_hits set created_at='epoch'");await assert.rejects(()=>rpc('train'));
await db.query('update online_presence set x=12,y=6 where user_id=$1',[a]);await rpc('equip',{slot:'weapon',equipped:false});state=await rpc('train');assert.ok(state.trainingHits.at(-1).damage>=5&&state.trainingHits.at(-1).damage<=13);
await db.exec("update online_messages set created_at='epoch'");state=await rpc('chat',{name:'forged',message:'吹き出しの確認'});assert.equal(state.messages.at(-1).character_id,first);assert.equal(state.messages.at(-1).name,'勇者一号');
await identity(b);state=await rpc('poll');assert.equal(state.trainingHits.at(-1).character_id,first);
await db.exec('set role authenticated');await assert.rejects(()=>db.exec("insert into online_training_hits(user_id,character_id,damage,dir) values('11111111-1111-4111-8111-111111111111','"+first+"',999,'up')"));await db.exec('reset role');
// Server/client skill target parity across weapon types and facing directions.
const skillCode=ts.default.transpileModule(await fs.readFile('src/weaponSkills.ts','utf8'),{compilerOptions:{module:ts.default.ModuleKind.ESNext}}).outputText;
const {WEAPON_SKILLS,planSkill}=await import(`data:text/javascript;base64,${Buffer.from(skillCode).toString('base64')}`);
for(const [type,skill] of Object.entries(WEAPON_SKILLS))for(const dir of ['up','down','left','right'])for(const origin of [{x:12,y:6},{x:11,y:6},{x:10,y:7},{x:12,y:14}]){
 const client=planSkill(type,origin,dir,{blocked:(x,y)=>townBlocked(x,y)&&!(x===12&&y===5),enemyAt:(x,y)=>x===12&&y===5?true:null,canHit:()=>true}).tiles.map(p=>`${p.x},${p.y}`).sort();
 const server=(await db.query('select * from online_attack_tiles($1,$2,$3,$4,$5)',[type,origin.x,origin.y,dir,skill.range])).rows.map(p=>`${p.tile_x},${p.tile_y}`).sort();assert.deepEqual(server,client,`${type} ${dir} ${JSON.stringify(origin)}`);
}
await identity(a);await rpc('equip',{slot:'weapon',equipped:true,key:'w_iron_dagger'});await db.query("update online_presence set x=12,y=6,moved_at='epoch' where user_id=$1",[a]);await db.query('update online_characters set time_stop_turns=0,skill_steps_remaining=0 where id=$1',[first]);await db.exec("update online_training_hits set created_at='epoch'");
state=await rpc('attack',{dir:'down',damage:999999});assert.equal(state.trainingHits.at(-1).damage,0);assert.equal(state.trainingHits.at(-1).hit_target,false);
await db.exec("update online_training_hits set created_at='epoch'");state=await rpc('attack',{dir:'up'});assert.equal(state.trainingHits.at(-1).hit_target,true);assert.ok(state.trainingHits.at(-1).damage>0);assert.equal(state.players.find(p=>p.character_id===first).y,6);
await db.exec("update online_training_hits set created_at='epoch'");state=await rpc('skill',{dir:'up'});assert.equal(state.active.timeStopTurns,5);assert.equal(state.active.skillStepsRemaining,100);assert.equal(state.trainingHits.at(-1).skill_type,'dagger');await assert.rejects(()=>rpc('attack',{dir:'up'}));
const beforeWait=state.players.find(p=>p.character_id===first);for(let i=0;i<5;i++){await db.query("update online_presence set moved_at='epoch' where user_id=$1",[a]);state=await rpc('wait');}assert.equal(state.active.timeStopTurns,0);assert.equal(state.active.skillStepsRemaining,95);assert.equal(state.trainingHits.at(-1).action_kind,'wait');assert.equal(state.trainingHits.at(-2).skill_type,'dagger_finish');assert.deepEqual(state.players.find(p=>p.character_id===first),beforeWait);
await db.exec("update online_training_hits set created_at='epoch'");await assert.rejects(()=>rpc('skill',{dir:'up',skillStepsRemaining:0}));await assert.rejects(()=>rpc('attack',{dir:'forged'}));
const skillFixtures={katana:'w_katana_iron',longsword:'w_soldier_blade',lance:'w_iron_lance',bow:'w_hunter_bow',handgun:'w_handgun',greatsword:'w_greatsword',dual_sword:'w_dual_sword'};
// Canonical fixture keys are discovered from the generated server catalog map.
const migration=await fs.readFile('supabase/migrations/202611190003_online_controls_skills.sql','utf8');const skillCatalog=JSON.parse(migration.match(/skill:= '(.*?)'::jsonb/)[1]);
for(const type of Object.keys(skillFixtures)){const key=Object.keys(skillCatalog).find(key=>skillCatalog[key].type===type);assert.ok(key,type);await db.query("update online_characters set equipment=jsonb_set(equipment,'{weapon}',jsonb_build_array($1::text)),gear=(gear-'weapon_instance_id')||jsonb_build_object('weapon',true,'weapon_key',$1::text),skill_steps_remaining=0,time_stop_turns=0 where id=$2",[key,first]);await db.exec("update online_training_hits set created_at='epoch'");state=await rpc('skill',{dir:'up',damage:999999});const hit=state.trainingHits.at(-1);assert.equal(hit.skill_type,type);assert.equal(hit.weapon_key,key);assert.ok(hit.damage>0&&hit.damage<1000,type);assert.equal(state.active.skillStepsRemaining,100);}
console.log('PASS: all eight skill ranges match solo, right-attack direction/air swings, canonical weapon skill/damage, recharge, footstep, five-step dagger domain and finisher');
console.log('PASS: immortal practice target, canonical damage, range/cooldown/collision, no reward or equipment loss, shared hit events, character-bound chat');
console.log('PASS: normal-account weapon transfers, equipped auto-unequip, starred metadata, distance/ownership/index checks, duplicate pickup rejection, duplicate weapon copies, item conservation');
console.log('PASS: protected super flag, unlock code, server catalog, item/equipment persistence, owned gear validation, starred HP, immediate revocation, forged-role rejection');
console.log('PASS: collision grid parity, all lamps, drop conservation, forged item rejection, distance validation, cross-player pickup, duplicate pickup denial, empty inventory, ground-table access denial');
console.log('PASS: two slots, ownership, male/female, character persistence, town presence, movement, gear, items, chat author, direct-write denial, old-RPC denial');
await db.close();
