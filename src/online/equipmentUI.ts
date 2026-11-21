import {renderPartyPanel} from './partyUI';
import {renderGuildPanel,type GuildDraft} from './guildUI';
import {inspectionActions} from './socialActions';
import type {PlayerInspection} from './worldApi';
import {ADVENTURE_CONFIG,adventureBlocked} from './adventure/layout';
import {TOWN_COLUMNS,TOWN_ROWS,TOWN_MIN_X,TOWN_MIN_Y,townBlocked} from './townLayout';
import {HOUSES,houseBlocked} from './housingCatalog';
import {partySightRadius} from './adventure/visibility';
import {createAmountControl} from './amountControl';
import type Phaser from 'phaser';
import {ITEM_CATALOG,type CatalogEntry} from '../itemCatalog';
import {WEAPON_DEFS,SHIELD_DEFS,ELEMENT_INFO,gradeColor} from '../data';
import {NECKLACE_DEFS} from '../townEquipment';
import {equipmentIconTexture} from '../artRefresh';
import {GAME_W,GAME_H,IS_MOBILE} from '../layout';
import {canInteract,TOWN_INTERACTIONS} from './townInteractions';
import type {EquipmentSlot,EquipmentInstance,QuickSlot,OnlineCharacter} from './worldApi';
import './equipmentUI.css';
import {playTownSound} from './presentation';
import {trackPointerDrag} from './pointerDrag';
import {mountAdventureBoard} from './adventure/board';
import {mountWarehouseUI} from './warehouseUI';
import {createGachaPresentation} from './gachaPresentation';

export type Entry={key:string;category:EquipmentSlot|'item';index:number;instance?:EquipmentInstance;count:number;definition:CatalogEntry;equipped:boolean;price?:number};
const slots:EquipmentSlot[]=['weapon','armor','shield','necklace'];
const label:Record<string,string>={all:'すべて',equip:'装備',item:'消耗品',weapon:'武器',armor:'服',shield:'盾',necklace:'ネックレス'};
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text='')=>{const e=document.createElement(tag);e.textContent=text;return e;};
const keyOf=(e:Entry)=>e.instance?.id??`${e.category}:${e.key}`;
const baseKey=(key:string)=>key.replace(/^star_/,'');
export function mountTownEquipmentUI(hud:any,gs:any){
 const root=node('section');root.className='town-equipment-ui'+(IS_MOBILE?' mobile':'');root.setAttribute('aria-label','町の装備とショートカット');document.body.append(root);
 const quick=node('div');quick.className='town-quickbar';quick.setAttribute('aria-label',IS_MOBILE?'クイックアイテム 5枠':'クイックアイテム 20枠');
 const neck=node('button');neck.className='town-necklace-slot';neck.title='ネックレスを変更';neck.onclick=()=>open('inventory','necklace');
 const shine=node('div');shine.className='town-star-overlay';shine.setAttribute('aria-hidden','true');
 const modal=node('section');modal.className='town-window';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','false');modal.setAttribute('aria-label','所持品');
 const header=node('header'),title=node('h2','所持品'),gold=node('span');gold.className='town-gold';const closeButton=node('button','×');closeButton.type='button';closeButton.setAttribute('aria-label','閉じる');closeButton.onclick=close;header.append(title,gold,closeButton);
 const tabs=node('nav');tabs.className='town-tabs';tabs.setAttribute('aria-label','所持品の種類');
 const body=node('div');body.className='town-inventory-body';const grid=node('div');grid.className='town-icon-grid';grid.setAttribute('aria-label','アイテム一覧');const detail=node('section');detail.className='town-item-detail';detail.setAttribute('aria-label','選択したアイテムの詳細');
 const scrollSync:(()=>void)[]=[];
 function scrollWrapper(view:HTMLElement){const wrapper=node('div');wrapper.className='town-scroll-wrapper';const track=node('div');track.className='town-scroll-track';const thumb=node('div');thumb.className='town-scroll-thumb';thumb.setAttribute('role','scrollbar');thumb.setAttribute('aria-label',view.getAttribute('aria-label')+'のスクロール');thumb.setAttribute('aria-valuemin','0');thumb.tabIndex=0;track.append(thumb);wrapper.append(view,track);
  const sync=()=>{const max=Math.max(0,view.scrollHeight-view.clientHeight),height=track.clientHeight,size=max?Math.max(22,height*view.clientHeight/view.scrollHeight):height;thumb.style.height=size+'px';thumb.style.top=(max?(height-size)*view.scrollTop/max:0)+'px';thumb.setAttribute('aria-valuemax',String(max));thumb.setAttribute('aria-valuenow',String(Math.round(view.scrollTop)));track.hidden=!max;};
  view.addEventListener('scroll',sync);thumb.onpointerdown=e=>{e.preventDefault();thumb.setPointerCapture(e.pointerId);const start=e.clientY,top=view.scrollTop;const move=(ev:PointerEvent)=>{const scale=track.getBoundingClientRect().height/track.clientHeight;view.scrollTop=top+(ev.clientY-start)/scale*(view.scrollHeight-view.clientHeight)/Math.max(1,track.clientHeight-thumb.offsetHeight);};const end=()=>{thumb.removeEventListener('pointermove',move);thumb.removeEventListener('pointerup',end);thumb.removeEventListener('pointercancel',end);};thumb.addEventListener('pointermove',move);thumb.addEventListener('pointerup',end);thumb.addEventListener('pointercancel',end);};
  track.onpointerdown=e=>{if(e.target===track)view.scrollTop+=(e.clientY<thumb.getBoundingClientRect().top?-1:1)*view.clientHeight*.8;};thumb.onkeydown=e=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();view.scrollTop+=e.key==='Home'?-view.scrollHeight:e.key==='End'?view.scrollHeight:(e.key.includes('Up')?-1:1)*(e.key.startsWith('Page')?view.clientHeight:45);}};scrollSync.push(sync);return wrapper;
 }
 const gridWrapper=scrollWrapper(grid),detailWrapper=scrollWrapper(detail);body.append(gridWrapper,detailWrapper);
 const footer=node('footer','アイテムを選択すると詳細を表示。下の枠へドラッグして登録できます。');footer.setAttribute('role','status');modal.append(header,tabs,body,footer);root.append(neck,shine,quick,modal);
 let mode:'inventory'|'shop'|'gacha'|'guide'|'friends'|'guild'|'party'|'map'|'inspect'='inventory',category='all',shopTab='buy',selected='',signature='',pending=false,active=true,notice='',reward:Entry|undefined;
 let friendName='';const guildDraft:GuildDraft={name:'',description:'',joinName:'',confirm:''};let inspected:PlayerInspection|undefined;
 let inputState:{hud:boolean;town:boolean;hudKeys:boolean;townKeys:boolean}|undefined;
 let cancelDrag:(()=>void)|undefined;
 let gacha:ReturnType<typeof createGachaPresentation>|undefined;
 let gachaRollButton:HTMLButtonElement|undefined,gachaSkip:HTMLButtonElement|undefined,gachaResult:HTMLElement|undefined;
 function pauseGameInput(){if(inputState)return;inputState={hud:hud.input.enabled,town:gs.input.enabled,hudKeys:hud.input.keyboard?.enabled??false,townKeys:gs.input.keyboard?.enabled??false};hud.input.enabled=false;gs.input.enabled=false;if(hud.input.keyboard)hud.input.keyboard.enabled=false;if(gs.input.keyboard)gs.input.keyboard.enabled=false;}
 function resumeGameInput(){if(!inputState)return;hud.input.enabled=inputState.hud;gs.input.enabled=inputState.town;if(hud.input.keyboard){hud.input.keyboard.resetKeys();hud.input.keyboard.enabled=inputState.hudKeys;}if(gs.input.keyboard){gs.input.keyboard.resetKeys();gs.input.keyboard.enabled=inputState.townKeys;}inputState=undefined;}
 const urls=new Map<string,string>();let goldDraft='100',textureRefresh=0;
 const iconKeys=new Set(ITEM_CATALOG.flatMap(e=>[e.textureKey,equipmentIconTexture(e.textureKey),equipmentIconTexture('star_'+e.key)]));
 const character=()=>gs.packet.active as OnlineCharacter|null;
 const fit=()=>{const r=gs.game.canvas.getBoundingClientRect();root.style.cssText=`left:${r.left}px;top:${r.top}px;width:${GAME_W}px;height:${GAME_H}px;transform:scale(${r.width/GAME_W},${r.height/GAME_H})`;};
 const resize=new ResizeObserver(fit);resize.observe(gs.game.canvas);window.addEventListener('resize',fit);window.addEventListener('scroll',fit);fit();
 function iconURL(key:string){
  const texture=equipmentIconTexture(key);if(urls.has(texture))return urls.get(texture)!;
  if(!hud.textures.exists(texture))return '';
  const frame=hud.textures.getFrame(texture);if(!frame)return '';const image=frame.source.image as CanvasImageSource;const manifestEntry=(gs.registry.get('assetManifest') as any[]??[]).find(e=>e.key===texture&&e.kind!=='spritesheet');if(manifestEntry&&frame.cutX===0&&frame.cutY===0){const url=new URL(manifestEntry.path,document.baseURI).href;urls.set(texture,url);return url;}if(image instanceof HTMLImageElement&&!image.src.startsWith('blob:')&&frame.cutX===0&&frame.cutY===0&&frame.cutWidth===image.naturalWidth&&frame.cutHeight===image.naturalHeight){urls.set(texture,image.src);return image.src;}
  const c=document.createElement('canvas');c.width=128;c.height=128;c.getContext('2d')!.drawImage(image,frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,0,0,128,128);const url=c.toDataURL();urls.set(texture,url);return url;
 }
 function definition(slot:string,key:string){return ITEM_CATALOG.find(d=>d.key===(slot==='armor'?'armor_'+key:baseKey(key)));}
 function entries():Entry[]{
  const c=character();if(!c)return [];const result:Entry[]=[];
  for(const slot of slots){const list=slot==='necklace'?c.equipment?.necklace??[]:c.equipment?.[slot]??[];
   list.forEach((key,index)=>{const def=definition(slot,key);if(!def)return;const instance=c.instances?.[slot]?.[index];const gear=c.gear as Record<string,unknown>;result.push({key,category:slot,index,instance,count:1,definition:def,equipped:!!gear[slot]&&(instance?gear[slot+'_instance_id']===instance.id:gear[slot+'_key']===key)});});
  }
  for(const [key,count]of Object.entries(c.inventory)){const def=definition('item',key);if(count>0&&def)result.push({key,category:'item',index:0,count,definition:def,equipped:false});}
  const balance=c.gold??0;result.unshift({key:'gold',category:'item',index:0,count:balance,equipped:false,definition:{key:'gold',category:'item',name:'所持金',textureKey:'coin',summary:'お金',description:`${balance.toLocaleString()} G`}});
  return result;
 }
 function makeIcon(e:Entry){
  const b=node('button');b.type='button';b.className='town-icon'+(e.key.startsWith('star_')?' town-starred':'')+(e.instance&&e.instance.max>0&&e.instance.dur===0?' town-broken':'');
  b.style.setProperty('--grade',e.definition.grade?'#'+gradeColor(e.definition.grade).toString(16).padStart(6,'0'):'#8a9d9d');b.title=`${e.definition.name}${e.key.startsWith('star_')?' ★ 色違い':''}`;b.setAttribute('aria-label',b.title);b.dataset.itemKey=e.key;b.dataset.category=e.category;
  const image=node('img');image.alt='';image.draggable=false;const url=iconURL(e.key.startsWith('star_')?e.key:e.definition.textureKey);if(url)image.src=url;b.append(image);
  if(e.equipped){const eq=node('span','E');eq.className='town-equipped';b.append(eq);}if(e.count>1||e.key==='gold'){const count=node('span',e.key==='gold'?`${e.count.toLocaleString()}G`:String(e.count));count.className='town-count';b.append(count);}
  if(e.instance&&e.instance.max>0){const bar=node('span');bar.className='town-dur-bar';const fill=node('i');fill.style.width=`${e.instance.dur/e.instance.max*100}%`;bar.append(fill);b.append(bar);}
  if(e.key.startsWith('star_')){const glints=node('span');glints.className='town-glints';glints.setAttribute('aria-hidden','true');for(let i=0;i<7;i++){const dot=node('i');dot.style.setProperty('--i',String(i));dot.style.left=(9+(i*31)%81)+'%';dot.style.top=(8+(i*23)%80)+'%';glints.append(dot);}b.append(glints);}
  return b;
 }
 function quickRef(e:Entry):QuickSlot{return {category:e.category,key:e.key,...e.instance?{instanceId:e.instance.id}:{}};}
 function attachDrag(button:HTMLButtonElement,e:Entry,sourceSlot?:number){
  button.draggable=false;button.style.touchAction='none';let suppressClick=false;
  button.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;}},true);
  button.ondragstart=event=>event.preventDefault();
  button.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();cancelDrag?.();suppressClick=false;const startX=event.clientX,startY=event.clientY;let moved=false,ghost:HTMLElement|undefined;
   const target=(x:number,y:number)=>{const drop=document.elementFromPoint(x,y)?.closest<HTMLElement>('[data-quick-slot]');return drop&&quick.contains(drop)?drop:undefined;};
   const clear=()=>{ghost?.remove();quick.querySelectorAll('.drag-over').forEach(b=>b.classList.remove('drag-over'));cancelDrag=undefined;if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId);requestAnimationFrame(refresh);};
   cancelDrag=trackPointerDrag(window,event,{move:ev=>{if(!moved&&Math.hypot(ev.clientX-startX,ev.clientY-startY)>6){moved=true;ghost=makeIcon(e);ghost.classList.add('town-drag-ghost');ghost.setAttribute('aria-hidden','true');document.body.append(ghost);}if(!moved)return;ev.preventDefault();ghost!.style.left=ev.clientX+'px';ghost!.style.top=ev.clientY+'px';const drop=target(ev.clientX,ev.clientY);quick.querySelectorAll<HTMLElement>('[data-quick-slot]').forEach(b=>b.classList.toggle('drag-over',b===drop));},end:ev=>{
    const drop=ev&&moved?target(ev.clientX,ev.clientY):undefined;suppressClick=moved||sourceSlot!==undefined;clear();
    if(drop){const index=Number(drop.dataset.quickSlot),ref=quickRef(e);if(resolve(ref))void run(async()=>{if(sourceSlot!==undefined)await gs.action('swap_quick_slots',{from:sourceSlot,to:index});else await gs.action('set_quick_slot',{index,ref});say(sourceSlot===undefined?`${e.definition.name}をショートカットに登録しました。`:'ショートカットを入れ替えました。');});}
    else if(ev&&!moved&&sourceSlot!==undefined){void use(e,true);}
    else if(ev&&!moved){selected=keyOf(e);for(const a of grid.children)a.classList.toggle('selected',(a as HTMLElement).dataset.entryId===selected);renderDetail();}
    else if(ev&&moved)say('下のショートカット枠に重ねて離してください。');
   }});button.setPointerCapture(event.pointerId);
  };
 }
 function resolve(ref:QuickSlot|null|undefined){return ref?entries().find(e=>e.category===ref.category&&e.key===ref.key&&(e.category==='item'||e.instance?.id===ref.instanceId)):undefined;}
 function renderQuick(){
  const c=character();const refs=c?.quickSlots??[{category:'item',key:'potion'} as QuickSlot];quick.replaceChildren();
  for(let i=0;i<(IS_MOBILE?5:20);i++){
   const e=resolve(refs[i]),b=e?makeIcon(e):node('button');b.classList.add('town-icon','town-quick-slot');b.type='button';b.dataset.quickSlot=String(i);b.setAttribute('aria-label',`ショートカット ${i<10?'':'Shift+'}${(i+1)%10}${e?' '+e.definition.name:' 空き'}`);
   const number=node('span',`${i>=10?'⇧':''}${(i+1)%10}`);number.className='town-quick-label';b.append(number);b.onclick=()=>{if(e)void use(e,true);};
   b.oncontextmenu=event=>{event.preventDefault();void run(()=>gs.action('set_quick_slot',{index:i,ref:null}));};
   b.ondragover=event=>{event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='copy';b.classList.add('drag-over');};b.ondragleave=()=>b.classList.remove('drag-over');
   b.ondrop=event=>{event.preventDefault();b.classList.remove('drag-over');try{const ref=JSON.parse(event.dataTransfer?.getData('application/x-chari-item')||'null');if(resolve(ref))void run(()=>gs.action('set_quick_slot',{index:i,ref}));}catch{say('所持品からドラッグしてください。');}};
   if(e)attachDrag(b,e,i);quick.append(b);
  }
 }
 function say(message:string){notice=message;footer.textContent=message;}
 async function run(fn:()=>Promise<any>){if(pending){say('処理中です。完了してからもう一度お試しください。');return;}pending=true;if(mode==='guild')renderGuild();else if(mode==='inspect')renderInspection();else renderDetail();try{const deadline=Date.now()+3000;while(gs.requestBusy&&active&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,30));if(!active)return;if(gs.requestBusy)throw Error('通信中です。少し待ってからもう一度お試しください。');const state=await fn();signature='';refresh();return state;}catch(e){say((e as Error).message);}finally{pending=false;if(mode==='gacha'&&!modal.hidden)renderGacha();else if(mode==='friends'&&!modal.hidden)renderFriends();else if(mode==='guild'&&!modal.hidden)renderGuild();else if(mode==='inspect'&&!modal.hidden)renderInspection();else renderDetail();}}
 async function use(e:Entry,equipOnly=false){
  if(e.category==='item'){
   if(!['potion','repair','skill_drink'].includes(e.key)){say('この道具は町では使えません。');return;}
   let target:{}={};if(e.key==='repair'){const broken=entries().find(a=>(a.category==='weapon'||a.category==='shield')&&a.instance&&a.instance.dur<a.instance.max);if(!broken){say('修復が必要な装備はありません。');return;}target={slot:broken.category,index:broken.index,instanceId:broken.instance?.id};}
   await run(()=>gs.action('use_item',{kind:e.key,...target}));
  }else await run(async()=>{const before=JSON.stringify(character()?.gear);await gs.action('equip',{slot:e.category,key:e.key,index:e.index,instanceId:e.instance?.id,equipped:equipOnly||!e.equipped});if(before!==JSON.stringify(character()?.gear))playTownSound(gs,e.category==='necklace'?'jingle':'equip');});
 }
 function renderNeck(){
  const c=character(),n=c?.gear.necklace?NECKLACE_DEFS.find(n=>n.key===c.gear.necklace_key):undefined;neck.replaceChildren();
  if(n){const img=node('img');img.alt=n.name;const url=iconURL(n.key);if(url)img.src=url;neck.append(img);neck.title=`${n.name} [${n.grade}] 防御力 +${n.defBonus}`;}else neck.title='ネックレス 未装備';neck.append(node('span','ネックレス'));
  shine.hidden=!gs.player.weapon?.starred;
 }
 function shopEntries():Entry[]{return (gs.packet.shopCatalog??[]).flatMap((s:{key:string;price:number})=>{const def=ITEM_CATALOG.find(d=>d.key===s.key);return def?[{key:s.key,category:def.category,index:0,count:1,definition:def,equipped:false,price:s.price}]:[];});}
 function visibleEntries(){let list=mode==='shop'&&shopTab==='buy'?shopEntries():entries();if(mode==='shop'&&shopTab==='repair')list=list.filter(e=>e.instance&&e.instance.max>0&&e.instance.dur<e.instance.max);if(mode==='shop'&&shopTab==='sell')list=list.filter(e=>e.category!=='item');return list.filter(e=>category==='all'||category==='equip'&&e.category!=='item'||e.category===category);}
 const gridCache=new Map<string,{signature:string;icons:HTMLElement[]}>();let tabMode='';
 function renderInventory(){
  const renderStarted=performance.now();const choices=mode==='shop'?[['buy','購入'],['repair','修理'],['sell','売却']]:Object.entries(label);
  if(tabMode!==(mode==='shop'?'shop':'inventory')){tabMode=mode==='shop'?'shop':'inventory';tabs.replaceChildren();for(const [key,name]of choices){const b=node('button',name);b.type='button';b.setAttribute('aria-pressed',String(mode==='shop'?shopTab===key:category===key));b.dataset.tab=key;b.onclick=()=>{if(mode==='shop'){shopTab=key;category='all';}else category=key;selected='';grid.scrollTop=0;renderInventory();};tabs.append(b);}}for(const b of Array.from(tabs.children) as HTMLButtonElement[])b.setAttribute('aria-pressed',String(mode==='shop'?shopTab===b.dataset.tab:category===b.dataset.tab));
  const list=visibleEntries(),oldScroll=grid.scrollTop;grid.replaceChildren();if(!list.some(e=>keyOf(e)===selected))selected=list[0]?keyOf(list[0]):'';
  const cacheKey=mode+':'+shopTab+':'+category,cacheSig=JSON.stringify(list.map(e=>[keyOf(e),e.count,e.equipped,e.instance?.dur,e.price]));let cached=gridCache.get(cacheKey);if(!cached||cached.signature!==cacheSig){cached={signature:cacheSig,icons:list.map(e=>{const b=makeIcon(e);b.onclick=()=>{selected=keyOf(e);for(const a of grid.children)a.classList.toggle('selected',(a as HTMLElement).dataset.entryId===selected);renderDetail();};b.dataset.entryId=keyOf(e);if(e.key!=='gold'&&(mode!=='shop'||shopTab!=='buy'))attachDrag(b,e);return b;})};gridCache.set(cacheKey,cached);}for(const b of cached.icons)b.classList.toggle('selected',b.dataset.entryId===selected);grid.append(...cached.icons);
  if(!list.length)grid.append(node('p',mode==='shop'&&shopTab==='repair'?'修理が必要な装備はありません。':'この種類のアイテムはありません。'));grid.scrollTop=oldScroll;renderDetail();if((import.meta as any).env.DEV)gs.game.canvas.dataset.inventoryRenderMs=String(performance.now()-renderStarted);requestAnimationFrame(()=>{const style=getComputedStyle(grid),cols=IS_MOBILE?4:9,width=(grid.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-(cols-1)*parseFloat(style.columnGap))/cols;if(width>0)grid.style.gridAutoRows=width+'px';scrollSync.forEach(fn=>fn());});
 }
 function renderDetail(){
  if(modal.hidden||mode==='gacha'||mode==='guide'||mode==='friends'||mode==='guild'||mode==='map'||mode==='inspect')return;const e=visibleEntries().find(e=>keyOf(e)===selected);detail.replaceChildren();if(!e){detail.append(node('p','左のアイテムを選択してください。'));return;}
  if(e.key==='gold'){const icon=makeIcon(e);icon.style.width='78px';icon.style.height='78px';detail.append(icon,node('h3','所持金'),node('p',`${e.count.toLocaleString()} G`),node('p','落とす金額を入力してください。町のほかのプレイヤーも拾えます。'));const control=createAmountControl('落とす金額',e.count,goldDraft,value=>goldDraft=value),amount=control.input;const drop=node('button','お金を落とす');drop.type='button';drop.disabled=pending||e.count<1;drop.onclick=()=>{const value=control.value();if(!Number.isSafeInteger(value)||value<1||value>e.count){say('1Gから所持金までの整数を入力してください。');return;}void run(async()=>{const before=new Set<string>((gs.packet.drops??[]).map((d:{id:string})=>d.id));await gs.action('drop_gold',{amount:value});gs.ignoreOwnDrops(before);say(`${value.toLocaleString()} Gを落としました。`);});};detail.append(control.root,drop);requestAnimationFrame(()=>scrollSync.forEach(fn=>fn()));return;}
  const heading=node('div');heading.className='town-detail-heading';const icon=makeIcon(e);icon.tabIndex=-1;icon.style.pointerEvents='none';const name=node('h3',`${e.definition.name}${e.key.startsWith('star_')?' ★':''}${e.definition.grade&&!e.definition.name.endsWith('['+e.definition.grade+']')?' ['+e.definition.grade+']':''}`);name.style.setProperty('--grade',e.definition.grade?'#'+gradeColor(e.definition.grade).toString(16).padStart(6,'0'):'#d4dfdf');heading.append(icon,name);detail.append(heading);
  detail.append(node('p',`${label[e.category]}${e.equipped?' · 装備中':''}${e.key.startsWith('star_')?' · 色違い':''}`));
  const w=WEAPON_DEFS.find(w=>w.key===baseKey(e.key)),s=SHIELD_DEFS.find(s=>s.key===baseKey(e.key));
  const stats=w?`攻撃力 ${w.atkMin}–${w.atkMax}`:s?`防御力 +${s.defBonus}`:e.definition.description.split('\n')[0];
  detail.append(node('p',stats+(e.instance?.max?`\n耐久 ${e.instance.dur} / ${e.instance.max}${e.instance.dur===0?'\n使用不可 · 修理できます':''}`:'')));
  if(e.definition.element)detail.append(node('p',`${ELEMENT_INFO[e.definition.element].name}属性`));
  const descriptionText=e.category==='armor'?'':e.definition.description.split('\n').slice(1).join('\n');if(descriptionText)detail.append(node('p',descriptionText));
  if(e.category==='weapon'&&gs.player.weapon){const compare=node('p',`装備中：${gs.player.weapon.name}\n攻撃力 ${gs.player.weapon.atkMin}–${gs.player.weapon.atkMax}`);compare.className='comparison';detail.append(compare);}
  if(e.price!==undefined)detail.append(node('p',`価格 ${e.price} G`));
  const actions=node('div');actions.className='town-detail-actions';const button=(text:string,fn:()=>void,disabled=false)=>{const b=node('button',text);b.type='button';b.disabled=pending||disabled;b.onclick=fn;actions.append(b);return b;};
  if(mode==='shop'&&shopTab==='buy')button('購入',()=>void run(async()=>{await gs.action('buy',{key:e.definition.key});say(`${e.definition.name}を購入しました。`);}),!character()||character()!.gold!<(e.price??0));
  else if(mode==='shop'&&shopTab==='repair'){const cost=Math.max(1,Math.ceil(((e.instance?.max??0)-(e.instance?.dur??0))/10));button(`修理 ${cost}G`,()=>void run(async()=>{await gs.action('repair_equipment',{slot:e.category,index:e.index,instanceId:e.instance?.id});say('修理しました。装備し直せます。');}));}
  else if(mode==='shop'&&shopTab==='sell'){const sale=({D:10,C:25,B:50,A:100,S:200,SS:400,SSS:800} as Record<string,number>)[e.definition.grade??'D'];button(`売却 ${sale}G`,()=>void run(async()=>{await gs.action('sell_equipment',{slot:e.category,index:e.index,instanceId:e.instance?.id});say('売却しました。');}));}
  else {
   const broken=!!(e.instance?.max&&e.instance.dur===0);button(e.category==='item'?'使用':e.equipped?'外す':broken?'修理が必要':'装備する',()=>void use(e),broken||e.category==='item'&&!['potion','repair','skill_drink'].includes(e.key));
   button('落とす',()=>void run(async()=>{const before=new Set<string>((gs.packet.drops??[]).map((d:{id:string})=>d.id));if(e.category==='item')await gs.action('drop_item',{kind:e.key});else await gs.action('drop_equipment',{slot:e.category,index:e.index,key:e.key,instanceId:e.instance?.id});gs.ignoreOwnDrops(before);say(`${e.definition.name}を落としました。`);})).classList.add('danger');
  }
  detail.append(actions);requestAnimationFrame(()=>scrollSync.forEach(fn=>fn()));
 }
 function updateGachaControls(){
  if(!gachaRollButton)return;const rolling=!!gacha?.running;gachaRollButton.disabled=rolling||pending||(character()?.gold??0)<1000;gachaRollButton.textContent=rolling?'カプセルを開いています…':'ガチャを回す 1,000G';if(gachaSkip)gachaSkip.hidden=!rolling;closeButton.disabled=rolling;
 }
 function renderGacha(){
  if(gacha){updateGachaControls();return;}
  tabs.replaceChildren();body.className='town-gacha-body';body.replaceChildren();gacha=createGachaPresentation();
  const info=node('div');info.className='town-gacha-info';info.append(node('h3','運命をひらく、魔法のガチャ'),node('p','1回 1,000G\n武器・服・盾・ネックレスのいずれかを獲得します。\nD 35% / C 25% / B 18% / A 12% / S 6% / SS 3% / SSS 1%\n武器は1%の確率で色違いになります。'));
  gachaRollButton=node('button','ガチャを回す 1,000G');gachaRollButton.type='button';
  gachaRollButton.onclick=async()=>{if(pending||gs.requestBusy||gacha?.running)return;const presentation=gacha!;gachaResult!.textContent='';const playing=presentation.play(async()=>{const before=new Set(entries().map(keyOf));await gs.action('gacha');const key=gs.packet.reward;reward=entries().find(e=>!before.has(keyOf(e))&&(baseKey(e.key)===key||e.definition.key===key));if(!reward)throw Error('所持品を更新して獲得アイテムを確認してください。');return{name:reward.definition.name,grade:reward.definition.grade??'D',starred:reward.key.startsWith('star_'),icon:makeIcon(reward)};});updateGachaControls();
   try{const result=await playing;if(result&&active){say(`${result.name}を獲得しました。`);gachaResult!.textContent=result.name+'を獲得！';}}
   catch(error){if(active)say((error as Error).message);}
   finally{if(active){signature='';refresh();updateGachaControls();}}
  };
  gachaSkip=node('button','演出をスキップ');gachaSkip.type='button';gachaSkip.className='gacha-skip';gachaSkip.onclick=()=>gacha?.skip();
  const note=node('p','演出中でも獲得した装備は保存されます。');note.className='gacha-roll-note';gachaResult=node('p');gachaResult.className='gacha-result-label';gachaResult.setAttribute('role','status');info.append(gachaRollButton,gachaSkip,gachaResult,note);body.append(gacha.element,info);updateGachaControls();
 }
 function renderFriends(){
  tabs.replaceChildren();body.className='town-friends-body';body.replaceChildren();
  const form=node('form');form.noValidate=true;const input=node('input');input.placeholder='相手のキャラクター名';input.setAttribute('aria-label','申請先のキャラクター名');input.maxLength=16;input.value=friendName;input.oninput=()=>friendName=input.value;const send=node('button','フレンド申請');send.type='submit';send.disabled=pending;form.append(input,send);form.onsubmit=e=>{e.preventDefault();if(!friendName.trim())return;say('申請中…');void run(async()=>{await gs.action('friend_request',{name:friendName.trim()});friendName='';say('フレンド申請を送りました。');});};body.append(form);
  const list=node('div');list.className='town-friends-list';list.append(node('p','フレンドと申請はアカウントで共通です。最大100件。'));
  const friends=gs.packet.friends??[];if(!friends.length)list.append(node('p','まだフレンドはいません。相手のキャラクター名から申請できます。'));
  for(const f of friends){const row=node('div');row.className='town-friend-row';const status=f.status==='accepted'?(f.online?'● オンライン':'○ オフライン'):f.incoming?'承認待ちの申請':'申請送信済み';row.append(node('strong',f.name),node('span',status));const action=(text:string,kind:string)=>{const b=node('button',text);b.type='button';b.disabled=pending;b.onclick=()=>void run(async()=>{await gs.action(kind,{id:f.id});say(kind==='friend_accept'?'フレンドになりました。':'登録・申請を解除しました。');});row.append(b);};if(f.status==='pending'&&f.incoming)action('承認','friend_accept');action(f.status==='accepted'?'解除':f.incoming?'拒否':'取消','friend_remove');list.append(row);}
  body.append(list);
 }
 function auxiliaryPanel(next:'map'|'inspect',heading:string){if(gacha?.running)return false;cancelDrag?.();clearGacha();pauseGameInput();mode=next;notice='';hud.overlay?.setVisible(false);hud.overlayMode='townInventory';gs.stopClickPath?.();gs.clearMoveInput?.();modal.hidden=false;title.textContent=heading;modal.setAttribute('aria-label',heading);tabs.replaceChildren();tabMode='';body.className='town-aux-body';body.replaceChildren();closeButton.focus();return true;}
 function renderMap(){body.replaceChildren();const dungeon=!!gs.inDungeon,house=gs.packet.house,floor=gs.packet.adventure?.floor??1,ox=dungeon||house?0:TOWN_MIN_X,oy=dungeon||house?0:TOWN_MIN_Y,cols=house?house.width:dungeon?(floor===2?13:ADVENTURE_CONFIG.width):TOWN_COLUMNS,rows=house?house.height:dungeon?(floor===2?11:ADVENTURE_CONFIG.height):TOWN_ROWS;const map=node('canvas');map.className='town-party-map';map.width=cols*10;map.height=rows*10;map.setAttribute('aria-label','地形とパーティの位置');const ctx=map.getContext('2d')!;ctx.fillStyle='#071019';ctx.fillRect(0,0,map.width,map.height);for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const wx=x+ox,wy=y+oy,walk=house?!houseBlocked(wx,wy,house):dungeon?!adventureBlocked(wx,wy,{keys:gs.packet.adventure?.snapshot.keys,floor}):!townBlocked(wx,wy);if(walk){ctx.fillStyle='#53666a';ctx.fillRect(x*10+1,y*10+1,8,8);}}
  if(!dungeon&&!house)for(const h of HOUSES){ctx.fillStyle=gs.packet.houses?.some((p:any)=>p.id===h.id&&p.mine)?'#f2ca61':'#a97858';ctx.fillRect((h.x-ox)*10,(h.y-oy)*10,h.w*10,h.h*10);ctx.fillStyle='#fff2b9';ctx.fillRect((h.doorX-ox)*10+2,(h.doorY-oy)*10+5,6,5);}
  for(const p of gs.packet.players){ctx.fillStyle=p.character_id===character()?.id?'#ffe290':'#60ebdc';ctx.beginPath();ctx.arc((p.x-ox+.5)*10,(p.y-oy+.5)*10,4.7,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#061015';ctx.stroke();}
  const legend=node('div');legend.className='town-map-legend';legend.append(node('p',house?`${house.ownerName}の家`:dungeon?`第${floor}層 · 共有視界 ${partySightRadius(gs.packet.adventure.snapshot)}マス`:'はじまりの町 · 東西南北の住宅区'),node('p','● 金：自分　● 水色：同じ場所にいる味方'));for(const p of gs.packet.players)legend.append(node('p',`${p.character_id===character()?.id?'★':'●'} ${p.name} (${p.x}, ${p.y})`));body.append(map,legend);footer.textContent='住宅案内所は広場の練習樽の右上。住宅は東西南北の各区に3軒（庭付き）です。';
 }
 function openMap(){if(auxiliaryPanel('map','マップ · 味方の位置')){renderMap();refresh();}}
 function renderParty(){tabs.replaceChildren();tabMode='';renderPartyPanel(body,gs.packet,pending,(action,payload)=>void run(async()=>{await gs.action(action,payload??{});say('パーティを更新しました。');}));}
 function renderGuild(){tabs.replaceChildren();tabMode='';renderGuildPanel(body,gs.packet.guild,gs.packet.guildRequests??[],guildDraft,pending,(action,payload)=>{void run(async()=>{const wasLeader=gs.packet.guild?.isLeader;await gs.action(action,payload??{});guildDraft.confirm='';guildDraft.flag=undefined;const messages:Record<string,string>={guild_create:'ギルドを作成しました。',guild_request_join:'加入申請を送りました。',guild_invite:'ギルドへ招待しました。',guild_accept:'加入を承認しました。',guild_decline:'招待・申請を取り消しました。',guild_leave:wasLeader?'ギルドを解散しました。':'ギルドを脱退しました。',guild_kick:'メンバーを除名しました。',guild_transfer:'ギルドマスターを引き継ぎました。'};say(messages[action]??'ギルド情報を更新しました。');});},renderGuild);}
 function renderInspection(){const info=inspected;if(!info||modal.hidden)return;tabs.replaceChildren();tabMode='';body.className='town-aux-body';body.replaceChildren();
  const relation=info.friend&&gs.packet.friends?.find((f:any)=>f.id===info.friend!.id);if(relation)info.friend=relation;
  const ownGuild=gs.packet.guild;if(ownGuild?.members.some((member:any)=>member.id===info.characterId))info.guild={id:ownGuild.id,name:ownGuild.name};else if(ownGuild&&info.guild?.id===ownGuild.id)info.guild=null;
  const request=gs.packet.guildRequests?.find((r:any)=>(ownGuild&&r.guildId===ownGuild.id&&r.characterId===info.characterId)||(!ownGuild&&r.guildId===info.guild?.id&&r.characterId===character()?.id));info.guildRequest=request?{id:request.id,kind:request.kind,incoming:request.incoming}:null;
  const summary=node('div');summary.className='town-inspection-summary';summary.append(node('strong',info.name),node('span',`体力 ${info.hp}`),node('span',info.guild?`ギルド：${info.guild.name}`:'ギルド：未所属'));body.append(summary);
  const actions=node('div');actions.className='town-inspect-actions';for(const entry of inspectionActions(info,gs.packet.guild)){const b=node('button',entry.label);b.type='button';b.disabled=pending||!!entry.disabled;b.onclick=()=>{if(!entry.action)return;void run(async()=>{await gs.action(entry.action!,entry.payload??{});if(gs.packet.inspection?.characterId===inspected?.characterId)inspected=gs.packet.inspection;say(entry.action==='friend_request_character'?'フレンド申請を送りました。':entry.action==='guild_invite'?'ギルドへ招待しました。':entry.action==='guild_request_join'?'ギルド加入申請を送りました。':'申請を承認しました。');});};actions.append(b);}if(info.characterId&&!info.sameAccount&&gs.packet.party?.isLeader&&!gs.packet.party.members.some((m:any)=>m.id===info.characterId)){const invite=node('button','パーティへ招待');invite.disabled=pending;invite.onclick=()=>void run(async()=>{await gs.action('party_invite',{character_id:info.characterId});say('パーティへ招待しました。');});actions.append(invite);}body.append(actions);
  const cards=node('div');cards.className='town-inspect-grid';for(const slot of slots){const item=info.equipment.find((e:any)=>e.slot===slot),card=node('section');card.className='town-inspect-card';card.append(node('h3',label[slot]));const def=item?.key&&definition(slot,item.key);if(item&&def){const entry:Entry={key:item.key,category:slot,index:0,count:1,equipped:true,definition:def};const icon=makeIcon(entry);icon.disabled=true;card.append(icon,node('strong',def.name+(item.key.startsWith('star_')?' ★ 色違い':'')),node('p',def.summary??''),node('p',slot==='armor'?def.description.split('\n')[0]:def.description));if(item.max)card.append(node('p',`耐久 ${item.dur??0} / ${item.max}`));}else card.append(node('p','未装備'));cards.append(card);}body.append(cards);
 }
 async function inspectPlayer(id:string){if(id===gs.packet.active?.id||gacha?.running||gs.requestBusy||pending)return;try{await gs.action('inspect_player',{character_id:id});const info=gs.packet.inspection;if(!info||!auxiliaryPanel('inspect',`${info.name} · ステータス・装備`))return;inspected=info;renderInspection();footer.textContent='近くの冒険者の装備を確認し、フレンド・ギルドの申請ができます。';refresh();}catch(e){gs.log((e as Error).message);}}

 function clearGacha(){gacha?.dispose();gacha=undefined;gachaRollButton=undefined;gachaSkip=undefined;gachaResult=undefined;closeButton.disabled=false;}
 function renderGuide(){tabs.replaceChildren();body.className='town-guide';body.replaceChildren(node('p','案内人リーフ「ようこそ、はじまりの町へ。\n商人ミラから買い物や装備の修理ができます。\n西のガチャ機では、新しい装備が手に入ります。\nNPCや機械の近くで、右クリックしてみてください。」'));}
 function open(next:'inventory'|'shop'|'gacha'|'friends'|'guild'|'party',filter?:string){
  if(next==='shop'||next==='gacha'){const npc=TOWN_INTERACTIONS.find(n=>n.id===(next==='shop'?'merchant':'gacha'))!;if(!canInteract(gs.player,npc)){gs.log('町の設備に近づいて右クリックしてください。');return;}}
  if(gacha?.running)return;cancelDrag?.();clearGacha();pauseGameInput();mode=next;category=filter??'all';selected='';notice='';hud.overlay?.setVisible(false);hud.overlayMode='townInventory';gs.destination=undefined;gs.clearMoveInput?.();modal.hidden=false;title.textContent=next==='inventory'?'所持品':next==='shop'?'商人ミラ · 取引と修理':next==='friends'?'フレンド':next==='party'?'パーティ':next==='guild'?'ギルド':'魔法のガチャ';modal.setAttribute('aria-label',title.textContent);body.className='town-inventory-body';body.replaceChildren(gridWrapper,detailWrapper);footer.textContent=next==='inventory'?'アイテムを選択して詳細を確認。下の枠にドラッグすると登録できます。':next==='friends'?'キャラクター名から申請できます。相手の承認でフレンドになります。':'町の所持金で利用できます。';if(next==='gacha')renderGacha();else if(next==='friends')renderFriends();else if(next==='party')renderParty();else if(next==='guild'){guildDraft.confirm='';guildDraft.flag=undefined;footer.textContent='招待・加入申請を承認して仲間を増やせます。';renderGuild();}else renderInventory();refresh();closeButton.focus();
 }
 function openGuide(){if(gacha?.running)return;cancelDrag?.();clearGacha();pauseGameInput();mode='guide';hud.overlayMode='townInventory';modal.hidden=false;title.textContent='案内人リーフ';renderGuide();refresh();}
 function close(){if(gacha?.running){gacha.skip();return;}cancelDrag?.();clearGacha();modal.hidden=true;resumeGameInput();if(hud.overlayMode==='townInventory')hud.overlayMode='none';gs.clearMoveInput?.();gs.game.canvas.tabIndex=0;gs.game.canvas.focus();refresh();}
 function refresh(){if(!active)return;boardUI?.refresh();warehouseUI?.refresh();if(character()?.location==='warehouse'){cancelDrag?.();modal.hidden=true;pauseGameInput();hud.overlayMode='townWarehouse';quick.hidden=true;neck.hidden=true;shine.style.display='none';return;}if(hud.overlayMode==='townWarehouse'){resumeGameInput();hud.overlayMode='none';signature='';gs.clearMoveInput?.();}const inventoryOpen=!modal.hidden&&mode==='inventory',overlay=hud.overlayMode;quick.hidden=!(overlay==='none'||inventoryOpen);neck.hidden=overlay!=='none';shine.style.display=overlay==='none'?'':'none';if(cancelDrag)return;const c=character(),next=JSON.stringify(mode==='party'?[mode,gs.packet.party,gs.packet.partyInvites,gs.packet.players.map((p:any)=>p.character_id)]:mode==='guild'?[mode,c?.id,gs.packet.guild,gs.packet.guildRequests]:mode==='inspect'?[mode,c?.id,gs.packet.guild,gs.packet.friends,gs.packet.guildRequests,inspected]:[c,gs.packet.shopCatalog,gs.packet.friends,mode==='map'?[gs.packet.players,gs.packet.adventure?.snapshot.keys,gs.packet.adventure?.snapshot.visionRadius]:null]);gold.textContent=`所持金 ${(c?.gold??0).toLocaleString()} G`;if(next===signature)return;if(!modal.hidden&&modal.contains(document.activeElement)&&(document.activeElement instanceof HTMLInputElement||document.activeElement instanceof HTMLTextAreaElement))return;signature=next;renderQuick();renderNeck();if(!modal.hidden){if(mode==='gacha')renderGacha();else if(mode==='friends')renderFriends();else if(mode==='guild')renderGuild();else if(mode==='party')renderParty();else if(mode==='inspect')renderInspection();else if(mode==='map')renderMap();else if(mode!=='guide')renderInventory();}if(notice)footer.textContent=notice;}
 const onKey=(e:KeyboardEvent)=>{if(e.repeat||e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;if(e.key==='Escape'&&boardUI.visible){e.preventDefault();boardUI.close();return;}if(e.key==='Escape'&&character()?.location==='warehouse'){e.preventDefault();void warehouseUI.exit();return;}if(e.key==='Escape'&&!modal.hidden){e.preventDefault();close();return;}if((hud.overlayMode==='none'||!modal.hidden&&mode==='inventory')&&/^Digit\d$/.test(e.code)){const digit=Number(e.code.slice(-1)),i=(digit===0?9:digit-1)+(e.shiftKey?10:0),entry=resolve(character()?.quickSlots?.[i]);if(entry&&(!IS_MOBILE||i<5)){e.preventDefault();void use(entry,true);}}};window.addEventListener('keydown',onKey);
 root.addEventListener('keydown',e=>{if(!modal.hidden||/^Digit\d$/.test(e.code)||e.key==='Escape'){onKey(e);e.stopPropagation();}});root.addEventListener('pointerdown',e=>e.stopPropagation());root.addEventListener('contextmenu',e=>e.preventDefault());
 const boardUI=mountAdventureBoard(root,gs,()=>{modal.hidden=true;pauseGameInput();hud.overlayMode='adventureBoard';quick.hidden=true;neck.hidden=true;shine.style.display='none';gs.destination=undefined;},()=>{resumeGameInput();hud.overlayMode='none';refresh();},refresh);
 const warehouseUI=mountWarehouseUI(root,gs,entries,makeIcon,refresh);
 const textureAdded=(key:string)=>{if(!iconKeys.has(key))return;urls.delete(key);gridCache.clear();if(textureRefresh)return;textureRefresh=requestAnimationFrame(()=>{textureRefresh=0;signature='';refresh();});};hud.textures.on('addtexture',textureAdded);refresh();
 return {openMap,inspectPlayer,openBoard(){if(!gacha?.running)boardUI.open();},open,openGuide,close,refresh,destroy(){active=false;cancelAnimationFrame(textureRefresh);boardUI.destroy();warehouseUI.destroy();cancelDrag?.();clearGacha();resize.disconnect();window.removeEventListener('resize',fit);window.removeEventListener('scroll',fit);window.removeEventListener('keydown',onKey);hud.textures.off('addtexture',textureAdded);root.remove();}};
}
