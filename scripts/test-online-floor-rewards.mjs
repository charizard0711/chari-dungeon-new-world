import assert from 'node:assert/strict';
import {makeHousingDb} from './housing-test-db.mjs';

const {db,login,rpc}=await makeHousingDb();
try{
 const users=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
 const characters=[];
 let room;
 for(const [index,user] of users.entries()){
  await db.query('insert into auth.users values($1)',[user]);
  await login(user);
  const id=(await rpc('create_character',{name:'Loot Probe '+index,gender:'male'})).characters[0].id;
  characters.push(id);
  await rpc('join',{character_id:id});
  await db.query('update online_presence set x=4,y=10 where character_id=$1',[id]);
  room=(await rpc(index?'room_join':'room_create',index?{room_id:room}:{name:'Loot Probe'})).adventure.id;
 }
 const snapshot=async()=>(await db.query('select snapshot from online_adventure_rooms where id=$1',[room])).rows[0].snapshot;
 assert.ok((await snapshot()).enemies.filter(e=>e.id.startsWith('corridor-')).length>=8);
 const config=(await db.query("select data from online_adventure_config where id='floor1'")).rows[0].data;
 const chest=config.props.find(p=>p.kind==='chest'&&p.id!=='coop_gold');
 await db.query('update online_adventure_members set x=$2,y=$3 where room_id=$1',[room,chest.x,chest.y+1]);
 for(const [index,user] of users.entries()){
  await login(user);
  await rpc('interact',{id:chest.id});
  assert.ok((await snapshot()).personalChests[characters[index]].includes(chest.id));
  await assert.rejects(()=>rpc('interact',{id:chest.id}),/開封済み/);
 }
 await login(users[0]);
 const inspected=await rpc('room_inspect',{character_id:characters[1]});
 assert.equal(inspected.inspection.characterId,characters[1]);
 const pulse=(await db.query('select online_combat_pulse() s')).rows[0].s;
 assert.deepEqual(pulse.roomRoster.map(p=>p.id),characters);
 await db.query("update online_characters set inventory=jsonb_set(inventory,'{mystery_bread}','1') where id=$1",[characters[0]]);
 await db.query('update online_characters set hp=10 where id=any($1)',[characters]);
 await rpc('use_item',{kind:'mystery_bread'});
 await db.query('update online_characters set hp=0 where id=any($1)',[characters]);
 let rows=(await db.query('select hp,online_equipment_hp(gear) as max,invulnerable_until>now() as immune,gold from online_characters order by name')).rows;
 assert.ok(rows.every(row=>row.immune&&row.hp===row.max));

 const oldGold=rows.map(p=>p.gold);
 await db.query('select online_floor_kill($1,1,$2,$3)',[room,characters[0],JSON.stringify({
  id:'boss-test',boss:true,x:50,y:12,contributors:{[characters[0]]:true,[characters[1]]:true}
 })]);
 rows=(await db.query('select gold from online_characters order by name')).rows;
 assert.deepEqual(rows.map((p,i)=>p.gold-oldGold[i]),[300,60]);
 const drops=(await db.query("select d.kind,d.category,c.grade from online_adventure_loot d left join online_catalog c on c.key=regexp_replace(d.kind,'^star_','') where room_id=$1",[room])).rows;
 assert.equal(drops.filter(d=>d.category!=='item').length,1);
 assert.ok(drops.filter(d=>d.category!=='item').every(d=>['C','D'].includes(d.grade)));
 assert.equal(drops.filter(d=>['dynamite','mystery_bread'].includes(d.kind)).length,1);
 const beforeCount=drops.filter(d=>d.category!=='item').length;
 await db.query('select online_floor_kill($1,1,$2,$3)',[room,characters[0],JSON.stringify({id:'guard-test',retainer:true,x:50,y:12})]);
 assert.equal((await db.query("select count(*)::int n from online_adventure_loot where category<>'item'")).rows[0].n,beforeCount);
 assert.equal((await db.query('select count(*)::int n from online_catalog where dur_max>0')).rows[0].n,0);
 await assert.rejects(()=>rpc('repair_equipment'),/廃止/);

 const path=(await db.query('select online_retainer_detour($1,50,9,50,13,$2,$3) step',[room,
  JSON.stringify({keys:[],bossEncounter:{phase:'battle'},enemies:[
   {x:50,y:10,hp:100},{x:50,y:11,hp:100}
  ]}),JSON.stringify(config)])).rows[0].step;
 assert.ok(path&&path[0]!==50&&path[1]===9,'rear retainer can route around a stacked column');
 console.log('PASS: corridor spawns, private chests, room roster, floor-wide immunity, kill and assist gold, guaranteed capped boss loot, no durability, and retainer detours.');
}catch(error){
 console.error(error.message,error.where??'');
 process.exitCode=1;
}finally{await db.close();}
