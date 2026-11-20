import {ITEM_CATALOG,type CatalogEntry} from '../itemCatalog';
import type {Entry} from './equipmentUI';
import type {EquipmentSlot,OnlineCharacter} from './worldApi';
import './warehouseUI.css';
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
export function mountWarehouseUI(root:HTMLElement,gs:any,owned:()=>Entry[],makeIcon:(e:Entry)=>HTMLElement,changed:()=>void){
 const panel=node('section');panel.className='town-warehouse';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','キャラクター倉庫');
 const header=node('header'),title=node('h2','倉庫'),exit=node('button','町へ戻る');exit.type='button';header.append(title,exit);const columns=node('div');columns.className='warehouse-columns';const status=node('footer','アイテムを選んで預ける・取り出す。装備は耐久や色違いもそのまま保存されます。');status.setAttribute('role','status');panel.append(header,columns,status);root.append(panel);
 let active=true,busy=false,signature='',selected=['',''];
 const key=(e:Entry)=>e.instance?.id??e.key;
 function stored():Entry[]{const c=gs.packet.active as OnlineCharacter|undefined,w=c?.warehouse;if(!w)return[];const result:Entry[]=[];
  result.push({key:'gold',category:'item',index:0,count:w.gold??0,equipped:false,definition:{key:'gold',name:'所持金',category:'item',textureKey:'coin',summary:'お金',description:'お金'}});
  for(const category of ['weapon','armor','shield','necklace'] as EquipmentSlot[])(w.equipment[category]??[]).forEach((k,index)=>{const definition=ITEM_CATALOG.find(d=>d.key===(category==='armor'?'armor_'+k:k.replace(/^star_/,'')));if(definition)result.push({key:k,category,index,count:1,equipped:false,definition,instance:w.instances[category]?.[index]});});
  for(const [k,count] of Object.entries(w.inventory)){const definition=ITEM_CATALOG.find(d=>d.key===k);if(count>0&&definition)result.push({key:k,category:'item',index:0,count,equipped:false,definition});}return result;
 }
 async function perform(action:string,payload:Record<string,unknown>){if(busy||gs.requestBusy)return;busy=true;render();try{await gs.action(action,payload);signature='';status.textContent=action==='warehouse_exit'?'町へ戻りました。':action==='warehouse_deposit'?'倉庫に預けました。':'持ち物に取り出しました。';}catch(error){status.textContent=(error as Error).message;}finally{busy=false;if(active){render();changed();}}}
 exit.onclick=()=>void perform('warehouse_exit',{});
 function render(){if(!active)return;const c=gs.packet.active as OnlineCharacter|undefined;panel.hidden=c?.location!=='warehouse';if(panel.hidden)return;title.textContent=`${c?.name??''}の倉庫`;exit.disabled=busy;columns.replaceChildren();
  for(const side of [0,1]){const list=side===0?owned():stored(),section=node('section'),heading=node('h3',side===0?'持ち物':'キャラクター倉庫'),grid=node('div');grid.className='warehouse-grid';grid.setAttribute('aria-label',side===0?'持ち物一覧':'倉庫一覧');if(!list.some(e=>key(e)===selected[side]))selected[side]=list[0]?key(list[0]):'';
   for(const entry of list){const b=makeIcon(entry) as HTMLButtonElement;b.classList.toggle('selected',key(entry)===selected[side]);b.onclick=()=>{selected[side]=key(entry);render();};grid.append(b);}
   const entry=list.find(e=>key(e)===selected[side]),detail=node('div');detail.className='warehouse-detail';if(entry){const e=entry;detail.append(node('strong',e.definition.name+(e.key.startsWith('star_')?' ★ 色違い':'')),node('p',e.key==='gold'?`${e.count.toLocaleString()} G`:e.category==='item'?`${e.count} 個`:e.instance?.max?`耐久 ${e.instance.dur} / ${e.instance.max}${e.equipped?' · 装備中（預けると外れます）':''}`:e.definition.description.split('\n')[0]));const amount=node('input');amount.type='number';amount.min='1';amount.max=String(e.count);amount.step='1';amount.value='1';amount.setAttribute('aria-label',`${side===0?'預ける':'取り出す'}個数・金額`);if(e.category==='item')detail.append(amount);const button=node('button',side===0?'預ける →':'← 取り出す');button.type='button';button.disabled=busy||e.count<1;button.onclick=()=>{const n=e.category==='item'?Number(amount.value):1;if(!Number.isSafeInteger(n)||n<1||n>e.count){status.textContent='個数・金額を確認してください。';return;}void perform(side===0?'warehouse_deposit':'warehouse_withdraw',{category:e.key==='gold'?'gold':e.category,key:e.key,instanceId:e.instance?.id,amount:n});};detail.append(button);}else detail.append(node('p','まだアイテムはありません。'));
   section.append(heading,grid,detail);columns.append(section);
  }
 }
 return{exit:()=>perform('warehouse_exit',{}),refresh(){const next=JSON.stringify([gs.packet.active?.warehouse,gs.packet.active?.inventory,gs.packet.active?.instances,gs.packet.active?.gold,gs.packet.active?.location]);if(next===signature)return;signature=next;render();},destroy(){active=false;panel.remove();}};
}
