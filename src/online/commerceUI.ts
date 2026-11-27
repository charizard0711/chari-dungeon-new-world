import {online} from './api';
import {ITEM_CATALOG} from '../itemCatalog';
import {equipmentCatalogKey,isEquipmentVariant} from '../equipmentVariants';
import {equipmentIconTexture} from '../artRefresh';
import {createAmountControl} from './amountControl';
import type {EquipmentInstance,EquipmentSlot} from './worldApi';
import './commerceUI.css';
type Listing={id:string;seller_id:string;seller_name?:string;category:string;item_key:string;item_state?:EquipmentInstance;price:number;mine:boolean};
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
export function openCommerce(scene:any,kind:'market'|'lottery'){
 if(scene.housingModal||!scene.packet.active)return;
 scene.stopClickPath();scene.clearMoveInput();scene.housingModal=true;scene.hud.overlayMode='commerce';scene.hud.townUI?.refresh();
 const root=node('section');root.className='housing-modal commerce-modal';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',kind==='market'?'冒険者マーケット':'星くじ売り場');
 const title=node('h2',kind==='market'?'冒険者マーケット':'星くじ売り場'),balance=node('p'),tabs=node('nav'),body=node('div'),notice=node('p'),exit=node('button','閉じる');body.className='commerce-body';notice.setAttribute('role','status');
 let busy=false,alive=true,page=0,view='browse',data:any={},pendingRequest:{action:string;signature:string;id:string}|undefined;
 const cleanup=()=>{alive=false;root.remove();};
 exit.onclick=()=>{if(busy)return;cleanup();scene.housingModal=false;scene.hud.overlayMode='none';scene.hud.townUI?.refresh();scene.events.off('shutdown',cleanup);};scene.events.once('shutdown',cleanup);
 root.append(title,balance,tabs,body,notice,exit);document.body.append(root);
 const call=async(action:string,payload:Record<string,unknown>={})=>{if(scene.preview){const test=(import.meta as any).env.DEV&&scene.registry.get('townCommerceTestTransport');if(test)return test(action,payload);throw Error('ローカル表示確認です。売買・抽選は本番の町で利用できます。');}if(!online)throw Error('接続できません。');const {data,error}=await online.rpc('online_town_commerce',{action,payload});if(error)throw Error(error.message);return data;};
 const button=(text:string,fn:()=>void)=>{const b=node('button',text);b.onclick=fn;return b;};
 async function load(){data=await call(kind==='market'?'market_list':'lottery_info',{page});if(alive)render();}
 async function run(action:string,payload:Record<string,unknown>){
  if(busy)return;const signature=JSON.stringify(payload);if(!pendingRequest||pendingRequest.action!==action||pendingRequest.signature!==signature)pendingRequest={action,signature,id:crypto.randomUUID()};
  busy=true;root.setAttribute('aria-busy','true');root.querySelectorAll('button').forEach(b=>b.disabled=true);notice.textContent=kind==='lottery'?'星くじを抽選中…':'処理中…';
  try{const result=await call(action,{...payload,requestId:pendingRequest.id});pendingRequest=undefined;if(!alive)return;notice.textContent=result.message;await scene.action('poll');await load();if(kind==='lottery'){notice.className=result.prize?'commerce-win':'';}}
  catch(e){if(alive)notice.textContent=(e as Error).message;}
  finally{busy=false;if(alive){root.removeAttribute('aria-busy');root.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 }
 function definition(category:string,key:string){return ITEM_CATALOG.find(d=>d.key===equipmentCatalogKey(category,key));}
 function itemCard(category:string,key:string,instance?:EquipmentInstance){
  const card=node('article'),def=definition(category,key),label=(def?.name??key)+(key.startsWith('star_')?' ★ 色違い':'');card.className='commerce-card';
  const texture=equipmentIconTexture((isEquipmentVariant(key)?'star_':'')+(def?.textureKey??equipmentCatalogKey(category,key)),scene);
  if(scene.textures.exists(texture)){const img=node('img');img.alt=label;img.src=scene.textures.getBase64(texture);card.append(img);}
  card.append(node('strong',label));if(def)card.append(node('p',def.summary));if(instance?.max)card.append(node('small',`耐久 ${instance.dur} / ${instance.max}`));return card;
 }
 function listingCard(l:Listing){const card=itemCard(l.category,l.item_key,l.item_state);card.append(node('p',`${l.price.toLocaleString()}G · ${l.seller_name??'自分の出品'}`));
  if(l.mine){if(l.seller_id===scene.packet.active.id)card.append(button('出品を取り消す',()=>void run('market_cancel',{listingId:l.id})));else card.append(node('small','出品したキャラクターで取消できます。'));}
  else card.append(button('購入内容を確認',()=>{if(busy)return;body.replaceChildren(node('h3','購入確認'),itemCard(l.category,l.item_key,l.item_state),node('p',`${l.price.toLocaleString()}Gを支払い、このアイテムを購入します。`),button('購入する',()=>void run('market_buy',{listingId:l.id})),button('戻る',render));}));return card;}
 function render(){
  balance.textContent=`所持金 ${(data.gold??scene.packet.active.gold??0).toLocaleString()}G`;tabs.replaceChildren();body.replaceChildren();
  if(kind==='lottery'){
   body.append(node('p','1枚 1,000G · その場で抽選。ゲーム内G専用です。'),node('p','1等 1,000,000G：0.01% ／ 2等 100,000G：0.09% ／ 3等 10,000G：0.9% ／ 4等 2,000G：9% ／ 5等 1,000G：20% ／ はずれ：70%'),button('1,000Gで1枚購入して抽選',()=>void run('lottery_draw',{})),node('h3','最近の抽選（10件）'));
   for(const r of data.history??[])body.append(node('p',r.message));return;
  }
  for(const [key,label]of [['browse','出品一覧'],['sell','出品する'],['mine',`自分の出品 ${(data.mine??[]).length}/3`]]){const b=button(label,()=>{if(busy)return;view=key;render();});b.setAttribute('aria-pressed',String(view===key));tabs.append(b);}
  if(view==='browse'||view==='mine'){
   const grid=node('div');grid.className='commerce-grid';const listings:Listing[]=view==='mine'?data.mine??[]:data.listings??[];for(const l of listings)grid.append(listingCard(l));body.append(grid);if(!listings.length)body.append(node('p','出品はありません。'));
   if(view==='browse'){const nav=node('nav');if(page>0)nav.append(button('前へ',()=>{page--;void refresh();}));nav.append(node('span',`${page+1} / ${Math.max(1,Math.ceil((data.total??0)/30))}`));if((page+1)*30<(data.total??0))nav.append(button('次へ',()=>{page++;void refresh();}));nav.append(button('更新',()=>void refresh()));body.append(nav);}return;
  }
  body.append(node('p','1アカウント3品まで。1品ずつ預けて出品します。装備中の品は外してから出品してください。価格は1〜10,000,000G。手数料なし。'));
  if((data.mine??[]).length>=3){body.append(node('p','出品枠がいっぱいです。'));return;}
  const select=node('select');select.setAttribute('aria-label','出品するアイテム');const options:{category:string;key:string;instanceId?:string;instance?:EquipmentInstance}[]=[];
  const c=scene.packet.active;for(const category of ['weapon','armor','shield','necklace']as EquipmentSlot[])for(const i of c.instances?.[category]??[]){if(c.gear[category]&&c.gear[category+'_instance_id']===i.id)continue;options.push({category,key:i.key,instanceId:i.id,instance:i});}
  for(const [key,n]of Object.entries(c.inventory))if(Number(n)>0&&definition('item',key))options.push({category:'item',key});
  options.forEach((o,i)=>{const option=node('option',(definition(o.category,o.key)?.name??o.key)+(o.key.startsWith('star_')?' ★':'')+(o.instance?.max?` (${o.instance.dur}/${o.instance.max})`:''));option.value=String(i);select.append(option);});
  if(!options.length){body.append(node('p','出品できるアイテムがありません。'));return;}
  const preview=node('div'),show=()=>{const o=options[Number(select.value)];preview.replaceChildren(itemCard(o.category,o.key,o.instance));};select.onchange=show;show();
  const price=createAmountControl('出品価格（G）',10000000,'1000');body.append(select,preview,node('label','出品価格（G）'),price.root,button('出品内容を確認',()=>{const amount=price.value(),o=options[Number(select.value)];if(!Number.isSafeInteger(amount)||amount<1||amount>10000000){notice.textContent='価格は1〜10,000,000Gで入力してください。';return;}body.replaceChildren(node('h3','出品確認'),itemCard(o.category,o.key,o.instance),node('p',`${amount.toLocaleString()}Gで1品出品します。販売中は所持品から預かります。`),button('この価格で出品',()=>void run('market_sell',{category:o.category,key:o.key,instanceId:o.instanceId,price:amount})),button('戻る',render));}));
 }
 async function refresh(){if(busy)return;busy=true;notice.textContent='読み込み中…';try{await load();notice.textContent='';}catch(e){notice.textContent=(e as Error).message;}finally{busy=false;}}
 render();void refresh();
}
