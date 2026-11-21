import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {makeHousingDb} from './housing-test-db.mjs';
import {townBlocked,TRAINING_TARGET} from '../src/online/townLayout';
const {db,login,rpc}=await makeHousingDb();
try{
 const seller='11111111-1111-4111-8111-111111111111',buyer='22222222-2222-4222-8222-222222222222';
 const create=async(uid:string,name:string)=>{await db.query('insert into auth.users values($1)',[uid]);await login(uid);const s=await rpc('create_character',{name,gender:'male'});const id=s.characters[0].id;await rpc('join',{character_id:id});await db.query("update online_presence set x=22,y=8 where user_id=$1",[uid]);await db.query('update online_characters set gold=100000 where id=$1',[id]);return id;};
 const sid=await create(seller,'Seller'),bid=await create(buyer,'Buyer');
 const call=async(action:string,payload:any={})=>(await db.query('select online_town_commerce($1,$2) s',[action,JSON.stringify({requestId:randomUUID(),...payload})])).rows[0].s;
 const gold=async(id:string)=>(await db.query('select gold from online_characters where id=$1',[id])).rows[0].gold;
 const character=async(id:string)=>(await db.query('select * from online_characters where id=$1',[id])).rows[0];
 await login(seller);
 await assert.rejects(call('market_sell',{category:'weapon',instanceId:(await character(sid)).instances.weapon[0].id,price:100}),/外して/);
 for(const price of [-1,0,10000001])await assert.rejects(call('market_sell',{category:'item',key:'potion',price}),/価格/);
 const requestId=randomUUID(),payload={category:'item',key:'potion',price:500,requestId};const first=await call('market_sell',payload);assert.deepEqual(await call('market_sell',payload),first);
 assert.equal((await character(sid)).inventory.potion,2,'retry must not remove another item');
 await call('market_sell',{category:'item',key:'potion',price:700});await call('market_sell',{category:'item',key:'potion',price:800});
 await assert.rejects(call('market_sell',{category:'item',key:'potion',price:900}),/3品/);
 await assert.rejects(call('market_buy',{listingId:first.listingId}),/自分/);
 await login(buyer);await assert.rejects(call('market_cancel',{listingId:first.listingId}),/出品した/);
 await db.query("update online_characters set inventory=jsonb_set(inventory,'{potion}','9999')where id=$1",[bid]);
 await assert.rejects(call('market_buy',{listingId:first.listingId}),/所持上限/);assert.equal(await gold(bid),100000);assert.equal(await gold(sid),100000);
 assert.equal((await db.query('select status from online_market_listings where id=$1',[first.listingId])).rows[0].status,'active');
 await db.query("update online_characters set inventory=jsonb_set(inventory,'{potion}','3')where id=$1",[bid]);
 const purchaseId=randomUUID();await call('market_buy',{listingId:first.listingId,requestId:purchaseId});await call('market_buy',{listingId:first.listingId,requestId:purchaseId});
 assert.equal(await gold(sid),100500);assert.equal(await gold(bid),99500);assert.equal((await character(bid)).inventory.potion,4);
 await assert.rejects(call('market_buy',{listingId:first.listingId}),/終了/);
 await login(seller);let board=await call('market_list');assert.equal(board.mine.length,2);await call('market_cancel',{listingId:board.mine[0].id});assert.equal((await character(sid)).inventory.potion,1);
 // An instance, including its rare color and worn durability, survives escrow and purchase.
 await db.query("select online_give_equipment($1,'w_iron_dagger',true)",[sid]);let c=await character(sid);const gear=c.instances.weapon[1];await db.query("update online_characters set instances=jsonb_set(instances,'{weapon,1,dur}','17') where id=$1",[sid]);
 const equipment=await call('market_sell',{category:'weapon',instanceId:gear.id,price:1234});await login(buyer);await call('market_buy',{listingId:equipment.listingId});c=await character(bid);const received=c.instances.weapon.find((i:any)=>i.id===gear.id);assert.equal(received.key,'star_w_iron_dagger');assert.equal(received.dur,17);
 // Another character on the same account shares the three listing slots.
 await login(seller);board=await call('market_list');while(board.mine.length<3){await db.query("update online_characters set inventory=jsonb_set(inventory,'{potion}','3')where id=$1",[sid]);await call('market_sell',{category:'item',key:'potion',price:10});board=await call('market_list');}
 const second=(await rpc('create_character',{name:'Seller Two',gender:'female'})).characters.find((x:any)=>x.id!==sid).id;await rpc('join',{character_id:second});await db.query('update online_presence set x=22,y=8 where user_id=$1',[seller]);await assert.rejects(call('market_sell',{category:'item',key:'potion',price:10}),/3品/);
 await login(buyer);await db.query('update online_presence set x=12,y=14 where user_id=$1',[buyer]);await assert.rejects(call('market_list'),/近く/);
 await db.query('update online_presence set x=17,y=19 where user_id=$1',[buyer]);const before=await gold(bid),ticket=randomUUID();const prize=await call('lottery_draw',{requestId:ticket});assert([0,1000,2000,10000,100000,1000000].includes(prize.prize));assert.equal(await gold(bid),before-1000+prize.prize);assert.deepEqual(await call('lottery_draw',{requestId:ticket}),prize);assert.equal(await gold(bid),before-1000+prize.prize);
 await assert.rejects(call('lottery_draw'),/抽選中/);assert.equal((await call('lottery_info')).history.length,1);
 await db.exec("update online_commerce_receipts set created_at=now()-interval '3 seconds'");await db.query('update online_characters set gold=0 where id=$1',[bid]);await assert.rejects(call('lottery_draw'),/1,000G/);assert.equal(await gold(bid),0);
 await db.query('update online_presence set x=8,y=10 where user_id=$1',[buyer]);await rpc('attack',{dir:'up'});assert((await rpc('poll')).trainingHits.some((h:any)=>h.hit_target));
 assert.deepEqual(TRAINING_TARGET,{x:8,y:9});assert(townBlocked(8,9));assert(!townBlocked(22,13));
 for(const p of [{x:8,y:9},{x:22,y:7},{x:17,y:18},{x:12,y:0},{x:24,y:9},{x:12,y:18},{x:0,y:9}])assert.equal((await db.query('select online_town_blocked($1,$2)b',[p.x,p.y])).rows[0].b,townBlocked(p.x,p.y));
 await db.exec('set role authenticated');await assert.rejects(db.query('select * from online_market_listings'),/permission denied/);await db.exec('reset role');
 console.log('PASS: account-wide 3 slots; escrow, payment, cancel, rare/worn gear preserved; idempotent purchases and lottery; ownership/distance/price checks; barrel and server collision; tables inaccessible.');
}finally{await db.close();}
