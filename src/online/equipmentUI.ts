import {createFriendPanel} from './friendPanel';
import {friendIcons,type FriendIcons} from './friendIcons';
import {attachFloorTooltip,floorItemEffects} from './floorHud';
import {explored,mapFloorColor,mapStationHidden,markPreviewMap} from './adventure/exploration';
import {quickSlots,shortcutDrop} from './quickSlots';
import {emoteById,emoteArt} from './emotes';
import {attackTiming} from './adventure/combatProfiles';
import {weaponSkill} from '../weaponSkills';
import {railNow} from './adventure/railway';
import {SKILL_ICON_ART,skillIconKey} from '../skillArt';
import type {CharacterSkill} from './worldApi';
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
import {BOOTS_DEFS,NECKLACE_DEFS,GLOVES_DEFS,EQUIPMENT_HASTE,NECKLACE_SKILL} from '../townEquipment';
import {baseEquipmentKey,equipmentCatalogKey,isEquipmentVariant} from '../equipmentVariants';
import {equipmentIconTexture} from '../artRefresh';
import {GAME_W,GAME_H,IS_MOBILE} from '../layout';
import {canInteract,TOWN_INTERACTIONS} from './townInteractions';
import type {EquipmentSlot,EquipmentInstance,QuickSlot,OnlineCharacter} from './worldApi';
import './equipmentUI.css';
import {playTownSound} from './presentation';
import {trackPointerDrag} from './pointerDrag';
import {mountAdventureBoard} from './adventure/board';
import {mountWarehouseUI} from './warehouseUI';
import {createGachaRattle}from './actionAudio';
import {createGachaPresentation} from './gachaPresentation';

export type Entry={key:string;category:EquipmentSlot|'item';index:number;instance?:EquipmentInstance;count:number;definition:CatalogEntry;equipped:boolean;price?:number};
type QuickEntry=Omit<Entry,'category'>&{category:EquipmentSlot|'item'|'emote'};
const slots:EquipmentSlot[]=['weapon','armor','shield','necklace','boots','gloves'];
const label:Record<string,string>={all:'すべて',equip:'装備',item:'消耗品',weapon:'武器',armor:'服',shield:'盾',necklace:'ネックレス',boots:'靴',gloves:'手袋'};
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text='')=>{const e=document.createElement(tag);e.textContent=text;return e;};
const keyOf=(e:{instance?:EquipmentInstance;category:string;key:string})=>e.instance?.id??`${e.category}:${e.key}`;
const baseKey=baseEquipmentKey;
export function mountTownEquipmentUI(hud:any,gs:any){
 const floorTooltip=document.createElement('div');floorTooltip.id='zero-shortcut-tooltip';floorTooltip.className='zero-floor-tooltip';floorTooltip.role='tooltip';floorTooltip.hidden=true;document.body.append(floorTooltip);
 const root=node('section');root.className='town-equipment-ui'+(IS_MOBILE?' mobile':'');root.setAttribute('aria-label','町の装備とショートカット');document.body.append(root);
 const quickIndices=IS_MOBILE?[0,1,2,3,4]:[0,1,2,3,4,5,10,11,12,13,14,15];
 const skillDock=node('div');skillDock.className='town-skill-dock';skillDock.setAttribute('aria-label','装備中のスキル');
 const quick=node('div');quick.className='town-quickbar';quick.setAttribute('aria-label',IS_MOBILE?'クイックアイテム 5枠':'クイックアイテム 12枠');
 const neck=node('button');neck.className='town-necklace-slot';neck.title='ネックレスを変更';neck.onclick=()=>open('inventory','necklace');
 const gloves=node('button');gloves.className='town-necklace-slot town-gloves-slot';gloves.title='手袋を変更';gloves.onclick=()=>open('inventory','gloves');
 const boots=node('button');boots.className='town-necklace-slot town-boots-slot';boots.title='靴を変更';boots.onclick=()=>open('inventory','boots');
 const shine=node('div');shine.className='town-star-overlay';shine.setAttribute('aria-hidden','true');
 const modal=node('section');modal.className='town-window';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','false');modal.setAttribute('aria-label','所持品');
 const header=node('header'),title=node('h2','所持品'),gold=node('span');gold.className='town-gold';const closeButton=node('button','×');closeButton.type='button';closeButton.setAttribute('aria-label','閉じる');closeButton.onclick=close;const friendSetting=node('button','アイコン設定');friendSetting.type='button';friendSetting.className='zero-friend-icon-setting';friendSetting.hidden=true;friendSetting.onclick=()=>openFriendIcon();header.append(title,gold,friendSetting,closeButton);
 const tabs=node('nav');tabs.className='town-tabs';tabs.setAttribute('aria-label','所持品の種類');
 const body=node('div');body.className='town-inventory-body';const grid=node('div');grid.className='town-icon-grid';grid.setAttribute('aria-label','アイテム一覧');const detail=node('section');detail.className='town-item-detail';detail.setAttribute('aria-label','選択したアイテムの詳細');
 const scrollSync:(()=>void)[]=[];
 function scrollWrapper(view:HTMLElement){const wrapper=node('div');wrapper.className='town-scroll-wrapper';const track=node('div');track.className='town-scroll-track';const thumb=node('div');thumb.className='town-scroll-thumb';thumb.setAttribute('role','scrollbar');thumb.setAttribute('aria-label',view.getAttribute('aria-label')+'のスクロール');thumb.setAttribute('aria-valuemin','0');thumb.tabIndex=0;track.append(thumb);wrapper.append(view,track);
  const sync=()=>{const max=Math.max(0,view.scrollHeight-view.clientHeight),height=track.clientHeight,size=max?Math.max(22,height*view.clientHeight/view.scrollHeight):height;thumb.style.height=size+'px';thumb.style.top=(max?(height-size)*view.scrollTop/max:0)+'px';thumb.setAttribute('aria-valuemax',String(max));thumb.setAttribute('aria-valuenow',String(Math.round(view.scrollTop)));track.hidden=!max;};
  view.addEventListener('scroll',sync);thumb.onpointerdown=e=>{e.preventDefault();thumb.setPointerCapture(e.pointerId);const start=e.clientY,top=view.scrollTop;const move=(ev:PointerEvent)=>{const scale=track.getBoundingClientRect().height/track.clientHeight;view.scrollTop=top+(ev.clientY-start)/scale*(view.scrollHeight-view.clientHeight)/Math.max(1,track.clientHeight-thumb.offsetHeight);};const end=()=>{thumb.removeEventListener('pointermove',move);thumb.removeEventListener('pointerup',end);thumb.removeEventListener('pointercancel',end);};thumb.addEventListener('pointermove',move);thumb.addEventListener('pointerup',end);thumb.addEventListener('pointercancel',end);};
  track.onpointerdown=e=>{if(e.target===track)view.scrollTop+=(e.clientY<thumb.getBoundingClientRect().top?-1:1)*view.clientHeight*.8;};thumb.onkeydown=e=>{if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();view.scrollTop+=e.key==='Home'?-view.scrollHeight:e.key==='End'?view.scrollHeight:(e.key.includes('Up')?-1:1)*(e.key.startsWith('Page')?view.clientHeight:45);}};scrollSync.push(sync);return wrapper;
 }
 const gridWrapper=scrollWrapper(grid),detailWrapper=scrollWrapper(detail);body.append(gridWrapper,detailWrapper);
 const footer=node('footer','アイテムを選択すると詳細を表示。下の枠へドラッグして登録できます。');footer.setAttribute('role','status');modal.append(header,tabs,body,footer);root.append(neck,boots,gloves,shine,quick,skillDock,modal);
 let mode:'inventory'|'shop'|'gacha'|'guide'|'friends'|'guild'|'skills'|'map'|'inspect'|'friendIcon'='inventory',category='all',shopTab='buy',selected='',signature='',pending=false,active=true,notice='',reward:Entry|undefined;
 let iconData:FriendIcons|undefined,iconRequest=0,iconPending=false;const guildDraft:GuildDraft={name:'',description:'',joinName:'',confirm:''};let inspected:PlayerInspection|undefined;
 let inputState:{hud:boolean;town:boolean;hudKeys:boolean;townKeys:boolean}|undefined;
 let cancelDrag:(()=>void)|undefined;
 let gacha:ReturnType<typeof createGachaPresentation>|undefined;let gachaRattle:ReturnType<typeof createGachaRattle>|undefined;
 let gachaRollButton:HTMLButtonElement|undefined,gachaSkip:HTMLButtonElement|undefined,gachaResult:HTMLElement|undefined;
 function pauseGameInput(){if(inputState)return;inputState={hud:hud.input.enabled,town:gs.input.enabled,hudKeys:hud.input.keyboard?.enabled??false,townKeys:gs.input.keyboard?.enabled??false};hud.input.enabled=false;gs.input.enabled=false;if(hud.input.keyboard)hud.input.keyboard.enabled=false;if(gs.input.keyboard)gs.input.keyboard.enabled=false;}
 function resumeGameInput(){if(!inputState)return;hud.input.enabled=inputState.hud;gs.input.enabled=inputState.town;if(hud.input.keyboard){hud.input.keyboard.resetKeys();hud.input.keyboard.enabled=inputState.hudKeys;}if(gs.input.keyboard){gs.input.keyboard.resetKeys();gs.input.keyboard.enabled=inputState.townKeys;}inputState=undefined;}
 const urls=new Map<string,string>();let goldDraft='100',textureRefresh=0;
 const iconKeys=new Set(ITEM_CATALOG.flatMap(e=>[e.textureKey,equipmentIconTexture(e.textureKey),equipmentIconTexture('star_'+e.key)]));
 const character=()=>gs.packet.active as OnlineCharacter|null;
 const fit=()=>{const r=gs.game.canvas.getBoundingClientRect();root.style.cssText=`left:${r.left}px;top:${r.top}px;width:${GAME_W}px;height:${GAME_H}px;transform:scale(${r.width/GAME_W},${r.height/GAME_H})`;};
 const resize=new ResizeObserver(fit);resize.observe(gs.game.canvas);window.addEventListener('resize',fit);window.addEventListener('scroll',fit);fit();
 function iconURL(key:string){
  const texture=equipmentIconTexture(key,hud);if(urls.has(texture))return urls.get(texture)!;
  if(!hud.textures.exists(texture))return '';
  const frame=hud.textures.getFrame(texture);if(!frame)return '';const image=frame.source.image as CanvasImageSource;const manifestEntry=(gs.registry.get('assetManifest') as any[]??[]).find(e=>e.key===texture&&e.kind!=='spritesheet');if(manifestEntry&&frame.cutX===0&&frame.cutY===0){const url=new URL(manifestEntry.path,document.baseURI).href;urls.set(texture,url);return url;}if(image instanceof HTMLImageElement&&!image.src.startsWith('blob:')&&frame.cutX===0&&frame.cutY===0&&frame.cutWidth===image.naturalWidth&&frame.cutHeight===image.naturalHeight){urls.set(texture,image.src);return image.src;}
  const c=document.createElement('canvas');c.width=128;c.height=128;c.getContext('2d')!.drawImage(image,frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,0,0,128,128);const url=c.toDataURL();urls.set(texture,url);return url;
 }
 function definition(slot:string,key:string){
  const item=ITEM_CATALOG.find(d=>d.key===equipmentCatalogKey(slot,key));
  if(item?.key==='mystery_bread')return {...item,name:'クロワッサン',description:floorItemEffects.mystery_bread};
  if(item?.category==='weapon'||item?.category==='shield')return {...item,description:item.description.replace(/　耐久 \d+/g,'')};
  return item;
 }
 function entries():Entry[]{
  const c=character();if(!c)return [];const result:Entry[]=[];
  for(const slot of slots){const list=slot==='necklace'?c.equipment?.necklace??[]:c.equipment?.[slot]??[];
   list.forEach((key,index)=>{const def=definition(slot,key);if(!def)return;const instance=c.instances?.[slot]?.[index];const gear=c.gear as Record<string,unknown>;result.push({key,category:slot,index,instance,count:1,definition:def,equipped:!!gear[slot]&&(instance?gear[slot+'_instance_id']===instance.id:gear[slot+'_key']===key)});});
  }
  for(const [key,count]of Object.entries(c.inventory)){const def=definition('item',key);if(count>0&&def)result.push({key,category:'item',index:0,count,definition:def,equipped:false});}
  const balance=c.gold??0;result.unshift({key:'gold',category:'item',index:0,count:balance,equipped:false,definition:{key:'gold',category:'item',name:'所持金',textureKey:'coin',summary:'お金',description:`${balance.toLocaleString()} G`}});
  return result;
 }
 function makeIcon(e:QuickEntry){
  const b=node('button');b.type='button';b.className='town-icon'+(e.key.startsWith('star_')?' town-starred':'');
  b.style.setProperty('--grade',e.definition.grade?'#'+gradeColor(e.definition.grade).toString(16).padStart(6,'0'):'#8a9d9d');b.title=`${e.definition.name}${e.key.startsWith('star_')?' ★ 色違い':''}`;b.setAttribute('aria-label',b.title);b.dataset.itemKey=e.key;b.dataset.category=e.category;
  if(e.category==='emote'){const caption=node('span',e.definition.name);caption.className='town-emote-caption';b.append(emoteArt(e.key),caption);return b;}
  const image=node('img');image.alt='';image.draggable=false;const url=iconURL(e.key.startsWith('star_')?'star_'+e.definition.textureKey:e.definition.textureKey);if(url)image.src=url;b.append(image);
  if(e.equipped){const eq=node('span','E');eq.className='town-equipped';b.append(eq);}if(e.count>1||e.key==='gold'){const count=node('span',e.key==='gold'?`${e.count.toLocaleString()}G`:String(e.count));count.className='town-count';b.append(count);}
  if(e.key.startsWith('star_')){const glints=node('span');glints.className='town-glints';glints.setAttribute('aria-hidden','true');for(let i=0;i<7;i++){const dot=node('i');dot.style.setProperty('--i',String(i));dot.style.left=(9+(i*31)%81)+'%';dot.style.top=(8+(i*23)%80)+'%';glints.append(dot);}b.append(glints);}
  return b;
 }
 function quickRef(e:QuickEntry):QuickSlot{return {category:e.category,key:e.key,...e.instance?{instanceId:e.instance.id}:{}};}
 function attachDrag(button:HTMLButtonElement,e:QuickEntry,sourceSlot?:number,onTap?:()=>void,onRegistered?:(text:string)=>void){
  button.draggable=false;button.style.touchAction='none';let suppressClick=false;
  button.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;}},true);
  button.ondragstart=event=>event.preventDefault();
  button.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();cancelDrag?.();suppressClick=false;const startX=event.clientX,startY=event.clientY;let moved=false,ghost:HTMLElement|undefined;
   const target=(x:number,y:number)=>{if(quick.hidden)return;return Array.from(quick.querySelectorAll<HTMLElement>('[data-quick-slot]')).find(slot=>{const r=slot.getBoundingClientRect();return x>=r.left&&x<r.right&&y>=r.top&&y<r.bottom;});};
   const clear=()=>{button.classList.remove('drag-source');quick.classList.remove('quick-dragging');ghost?.remove();quick.querySelectorAll('.drag-over').forEach(b=>b.classList.remove('drag-over'));cancelDrag=undefined;if(button.hasPointerCapture(event.pointerId))button.releasePointerCapture(event.pointerId);requestAnimationFrame(refresh);};
   cancelDrag=trackPointerDrag(window,event,{move:ev=>{if(!moved&&Math.hypot(ev.clientX-startX,ev.clientY-startY)>6){moved=true;button.classList.add('drag-source');quick.classList.add('quick-dragging');ghost=makeIcon(e);ghost.classList.add('town-drag-ghost');ghost.setAttribute('aria-hidden','true');document.body.append(ghost);}if(!moved)return;ev.preventDefault();ghost!.style.left=ev.clientX+'px';ghost!.style.top=ev.clientY+'px';const drop=target(ev.clientX,ev.clientY);quick.querySelectorAll<HTMLElement>('[data-quick-slot]').forEach(b=>b.classList.toggle('drag-over',b===drop));},end:ev=>{
    const drop=ev&&moved?target(ev.clientX,ev.clientY):undefined;suppressClick=moved||sourceSlot!==undefined||!!onTap;clear();
    if(drop){const index=Number(drop.dataset.quickSlot),ref=quickRef(e);if(resolve(ref))void run(async()=>{const command=shortcutDrop(index,ref,sourceSlot);if(!command)return;await gs.action(command.action,command.payload);const message=sourceSlot===undefined?`${e.definition.name}をショートカットに登録しました。`:'ショートカットを入れ替えました。';say(message);onRegistered?.(message);});}
    else if(ev&&!moved&&sourceSlot!==undefined){void use(e,true);}
    else if(ev&&!moved&&onTap){onTap();}
    else if(ev&&!moved){selected=keyOf(e);for(const a of grid.children)a.classList.toggle('selected',(a as HTMLElement).dataset.entryId===selected);renderDetail();}
    else if(ev&&moved)say('下のショートカット枠に重ねて離してください。');
   }});button.setPointerCapture(event.pointerId);
  };
 }
 function emoteEntry(id:string):QuickEntry|undefined{const e=emoteById(id);return e?{category:'emote',key:e.id,index:0,count:1,equipped:false,definition:{key:e.id,category:'item',name:e.label,textureKey:'',summary:'エモート',description:'絵の吹き出しで挨拶'}}:undefined;}
 function resolve(ref:QuickSlot|null|undefined, available?:Entry[]):QuickEntry|undefined{if(ref?.category==='emote')return emoteEntry(ref.key);return ref?(available??entries()).find(e=>e.category===ref.category&&e.key===ref.key&&(e.category==='item'||e.instance?.id===ref.instanceId)):undefined;}
 function renderQuick(){
  const available=entries();
  floorTooltip.hidden=true;
  const c=character();const refs=quickSlots(c?.quickSlots);quick.replaceChildren();
  for(const i of quickIndices){
   const e=resolve(refs[i],available),b=e?makeIcon(e):node('button');b.classList.add('town-icon','town-quick-slot');b.type='button';b.dataset.quickSlot=String(i);b.dataset.occupied=String(!!e);if(e)b.title+=String.fromCharCode(10)+'ドラッグで移動・入れ替え';b.setAttribute('aria-label',`ショートカット ${i<10?'':'Shift+'}${(i+1)%10}${e?' '+e.definition.name:' 空き'}`);
   const number=node('span',`${i>=10?'⇧':''}${(i+1)%10}`);number.className='town-quick-label';b.append(number);b.onclick=()=>{if(e)void use(e,true);};
   b.oncontextmenu=event=>{event.preventDefault();void run(()=>gs.action('set_quick_slot',{index:i,ref:null}));};
   b.ondragover=event=>{event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect='copy';b.classList.add('drag-over');};b.ondragleave=()=>b.classList.remove('drag-over');
   b.ondrop=event=>{event.preventDefault();b.classList.remove('drag-over');try{const ref=JSON.parse(event.dataTransfer?.getData('application/x-chari-item')||'null');if(resolve(ref))void run(()=>gs.action('set_quick_slot',{index:i,ref}));}catch{say('所持品からドラッグしてください。');}};
   if(e){attachDrag(b,e,i); attachFloorTooltip(b,e.definition.name+'\n'+(floorItemEffects[e.key]??e.definition.summary??e.definition.description),floorTooltip);b.removeAttribute('title');}quick.append(b);
  }
 }
 function say(message:string){notice=message;footer.textContent=message;}
 async function run(fn:()=>Promise<any>,onFailure?:()=>void){if(pending){onFailure?.();say('処理中です。完了してからもう一度お試しください。');return;}pending=true;if(mode==='guild')renderGuild();else if(mode==='inspect')renderInspection();else renderDetail();try{const deadline=Date.now()+3000;while(gs.requestBusy&&active&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,30));if(!active)return;if(gs.requestBusy)throw Error('通信中です。少し待ってからもう一度お試しください。');const state=await fn();signature='';refresh();return state;}catch(e){onFailure?.();say((e as Error).message);}finally{pending=false;if(mode==='gacha'&&!modal.hidden)renderGacha();else if(mode==='friends'&&!modal.hidden)renderFriends();else if(mode==='guild'&&!modal.hidden)renderGuild();else if(mode==='inspect'&&!modal.hidden)renderInspection();else renderDetail();}}
 async function use(e:QuickEntry,equipOnly=false){
  if(e.category==='emote'){const emote=emoteById(e.key);if(emote)await run(()=>gs.action('chat',{message:`【エモート】${emote.label}`}));return;}
  if(e.category==='item'){
   if(!['potion','skill_drink',...(gs.inDungeon?['warp','invis','dynamite','mystery_bread']:[])].includes(e.key)){playTownSound(gs,'deny');say('この道具はここでは使えません。');return;}
   if(e.key==='warp'||e.key==='dynamite'||e.key==='mystery_bread')close();await run(()=>gs.action('use_item',{kind:e.key}),()=>playTownSound(gs,'deny'));
  }else await run(async()=>{const before=JSON.stringify(character()?.gear);await gs.action('equip',{slot:e.category,key:e.key,index:e.index,instanceId:e.instance?.id,equipped:equipOnly||!e.equipped});if(before!==JSON.stringify(character()?.gear))playTownSound(gs,e.category==='necklace'?'jingle':'equip');},()=>playTownSound(gs,'deny'));
 }
 function renderNeck(){
  const c=character(),n=c?.gear.necklace?NECKLACE_DEFS.find(n=>n.key===baseKey(c.gear.necklace_key??'')):undefined;neck.replaceChildren();
  if(n){const img=node('img');img.alt=n.name;const url=iconURL(c?.gear.necklace_key??n.key);if(url)img.src=url;neck.append(img);neck.title=`${n.name} [${n.grade}] スキル威力 ×${NECKLACE_SKILL[n.grade]}`;}else neck.title='ネックレス 未装備';neck.append(node('span','ネックレス'));
  const b=c?.gear.boots?BOOTS_DEFS.find(b=>b.key===baseKey(c.gear.boots_key??'')):undefined;boots.replaceChildren();if(b){const img=node('img');img.alt=b.name;const url=iconURL(c?.gear.boots_key??b.key);if(url)img.src=url;boots.append(img);}boots.title=b?`${b.name} [${b.grade}] 移動速度 +${Math.round(EQUIPMENT_HASTE[b.grade]*100)}%`:'靴 未装備';boots.append(node('span','靴'));const glove=c?.gear.gloves?GLOVES_DEFS.find(g=>g.key===baseKey(c.gear.gloves_key??'')):undefined;gloves.replaceChildren();if(glove){const img=node('img');img.alt=glove.name;const url=iconURL(c?.gear.gloves_key??glove.key);if(url)img.src=url;gloves.append(img);}gloves.title=glove?`${glove.name} 攻撃速度 +${Math.round(EQUIPMENT_HASTE[glove.grade]*100)}%`:'手袋 未装備';gloves.append(node('span','手袋'));for(const [element,key]of [[neck,c?.gear.necklace_key],[boots,c?.gear.boots_key],[gloves,c?.gear.gloves_key]] as const){const variant=isEquipmentVariant(key)&&!!element.querySelector('img');element.classList.toggle('town-slot-variant',variant);if(variant)element.title+=' ★ 最大HP +50';}shine.hidden=!gs.player.weapon?.starred;
 }
 function shopEntries():Entry[]{return (gs.packet.shopCatalog??[]).flatMap((s:{key:string;price:number})=>{const def=ITEM_CATALOG.find(d=>d.key===s.key);return def?[{key:s.key,category:def.category,index:0,count:1,definition:def,equipped:false,price:s.price}]:[];});}
 function visibleEntries(){let list=mode==='shop'&&shopTab==='buy'?shopEntries():entries();if(mode==='shop'&&shopTab==='sell')list=list.filter(e=>e.category!=='item');return list.filter(e=>category==='all'||category==='equip'&&e.category!=='item'||e.category===category);}
 const gridCache=new Map<string,{signature:string;icons:HTMLElement[]}>();let tabMode='';
 function renderInventory(){
  const renderStarted=performance.now();const choices=mode==='shop'?[['buy','購入'],['sell','売却']]:Object.entries(label);
  if(tabMode!==(mode==='shop'?'shop':'inventory')){tabMode=mode==='shop'?'shop':'inventory';tabs.replaceChildren();for(const [key,name]of choices){const b=node('button',name);b.type='button';b.setAttribute('aria-pressed',String(mode==='shop'?shopTab===key:category===key));b.dataset.tab=key;b.onclick=()=>{if(mode==='shop'){shopTab=key;category='all';}else category=key;selected='';grid.scrollTop=0;renderInventory();};tabs.append(b);}}for(const b of Array.from(tabs.children) as HTMLButtonElement[])b.setAttribute('aria-pressed',String(mode==='shop'?shopTab===b.dataset.tab:category===b.dataset.tab));
  const list=visibleEntries(),oldScroll=grid.scrollTop;grid.replaceChildren();if(!list.some(e=>keyOf(e)===selected))selected=list[0]?keyOf(list[0]):'';
  const cacheKey=mode+':'+shopTab+':'+category,cacheSig=JSON.stringify(list.map(e=>[keyOf(e),e.count,e.equipped,e.instance?.dur,e.price]));let cached=gridCache.get(cacheKey);if(!cached||cached.signature!==cacheSig){cached={signature:cacheSig,icons:list.map(e=>{const b=makeIcon(e);b.onclick=()=>{selected=keyOf(e);for(const a of grid.children)a.classList.toggle('selected',(a as HTMLElement).dataset.entryId===selected);renderDetail();};b.dataset.entryId=keyOf(e);if(e.key!=='gold'&&(mode!=='shop'||shopTab!=='buy'))attachDrag(b,e);return b;})};gridCache.set(cacheKey,cached);}for(const b of cached.icons)b.classList.toggle('selected',b.dataset.entryId===selected);grid.append(...cached.icons);
  if(!list.length)grid.append(node('p',mode==='shop'&&shopTab==='repair'?'修理が必要な装備はありません。':'この種類のアイテムはありません。'));grid.scrollTop=oldScroll;renderDetail();if((import.meta as any).env.DEV)gs.game.canvas.dataset.inventoryRenderMs=String(performance.now()-renderStarted);requestAnimationFrame(()=>{const style=getComputedStyle(grid),cols=IS_MOBILE?4:9,width=(grid.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-(cols-1)*parseFloat(style.columnGap))/cols;if(width>0)grid.style.gridAutoRows=width+'px';scrollSync.forEach(fn=>fn());});
 }
 function renderDetail(){
  if(modal.hidden||mode==='gacha'||mode==='guide'||mode==='friends'||mode==='friendIcon'||mode==='guild'||mode==='map'||mode==='inspect')return;const e=visibleEntries().find(e=>keyOf(e)===selected);detail.replaceChildren();if(!e){detail.append(node('p','左のアイテムを選択してください。'));return;}
  if(e.key==='gold'){const icon=makeIcon(e);icon.style.width='78px';icon.style.height='78px';detail.append(icon,node('h3','所持金'),node('p',`${e.count.toLocaleString()} G`),node('p','落とす金額を入力してください。町のほかのプレイヤーも拾えます。'));const control=createAmountControl('落とす金額',e.count,goldDraft,value=>goldDraft=value),amount=control.input;const drop=node('button','お金を落とす');drop.type='button';drop.disabled=pending||e.count<1;drop.onclick=()=>{const value=control.value();if(!Number.isSafeInteger(value)||value<1||value>e.count){say('1Gから所持金までの整数を入力してください。');return;}void run(async()=>{const before=new Set<string>((gs.packet.drops??[]).map((d:{id:string})=>d.id));await gs.action('drop_gold',{amount:value});gs.ignoreOwnDrops(before);say(`${value.toLocaleString()} Gを落としました。`);});};detail.append(control.root,drop);requestAnimationFrame(()=>scrollSync.forEach(fn=>fn()));return;}
  const heading=node('div');heading.className='town-detail-heading';const icon=makeIcon(e);icon.tabIndex=-1;icon.style.pointerEvents='none';const name=node('h3',`${e.definition.name}${e.key.startsWith('star_')?' ★':''}${e.definition.grade&&!e.definition.name.endsWith('['+e.definition.grade+']')?' ['+e.definition.grade+']':''}`);name.style.setProperty('--grade',e.definition.grade?'#'+gradeColor(e.definition.grade).toString(16).padStart(6,'0'):'#d4dfdf');heading.append(icon,name);detail.append(heading);
  detail.append(node('p',`${label[e.category]}${e.equipped?' · 装備中':''}${e.key.startsWith('star_')?' · 色違い':''}`));
  const w=WEAPON_DEFS.find(w=>w.key===baseKey(e.key)),s=SHIELD_DEFS.find(s=>s.key===baseKey(e.key));
  const stats=w?`攻撃力 ${w.atkMin}–${w.atkMax}\n攻撃速度 ${(1000/attackTiming(w.weaponType).cooldown).toFixed(2)}回/秒（間隔 ${attackTiming(w.weaponType).cooldown}ms）`:s?`防御力 +${s.defBonus}`:e.definition.description.split('\n')[0];
  if(isEquipmentVariant(e.key))detail.append(node('p','装備中の最大HP +50'));
  detail.append(node('p',floorItemEffects[e.key]??stats));
  if(e.definition.element)detail.append(node('p',`${ELEMENT_INFO[e.definition.element].name}属性`));
  const descriptionText=e.category==='armor'?'':e.definition.description.split('\n').slice(1).join('\n');if(descriptionText)detail.append(node('p',descriptionText));
  if(e.category==='weapon'&&gs.player.weapon){const compare=node('p',`装備中：${gs.player.weapon.name}\n攻撃力 ${gs.player.weapon.atkMin}–${gs.player.weapon.atkMax}`);compare.className='comparison';detail.append(compare);}
  if(e.price!==undefined)detail.append(node('p',`価格 ${e.price} G`));
  const actions=node('div');actions.className='town-detail-actions';const button=(text:string,fn:()=>void,disabled=false)=>{const b=node('button',text);b.type='button';b.disabled=pending||disabled;b.onclick=fn;actions.append(b);return b;};
  if(mode==='shop'&&shopTab==='buy')button('購入',()=>void run(async()=>{await gs.action('buy',{key:e.definition.key});say(`${e.definition.name}を購入しました。`);}),!character()||character()!.gold!<(e.price??0));
  else if(mode==='shop'&&shopTab==='sell'){const sale=({D:10,C:25,B:50,A:100,S:200,SS:400,SSS:800} as Record<string,number>)[e.definition.grade??'D'];button(`売却 ${sale}G`,()=>void run(async()=>{await gs.action('sell_equipment',{slot:e.category,index:e.index,instanceId:e.instance?.id});say('売却しました。');}));}
  else {
   button(e.category==='item'?'使用':e.equipped?'外す':'装備する',()=>void use(e),e.category==='item'&&!['potion','skill_drink',...(gs.inDungeon?['warp','invis','dynamite','mystery_bread']:[])].includes(e.key));
   button('落とす',()=>void run(async()=>{const before=new Set<string>((gs.packet.drops??[]).map((d:{id:string})=>d.id));if(e.category==='item')await gs.action('drop_item',{kind:e.key});else await gs.action('drop_equipment',{slot:e.category,index:e.index,key:e.key,instanceId:e.instance?.id});gs.ignoreOwnDrops(before);say(`${e.definition.name}を落としました。`);})).classList.add('danger');
  }
  detail.append(actions);requestAnimationFrame(()=>scrollSync.forEach(fn=>fn()));
 }
 function updateGachaControls(){
  if(!gachaRollButton)return;const rolling=!!gacha?.running;gachaRollButton.disabled=rolling||pending||(character()?.gold??0)<1000;gachaRollButton.textContent=rolling?'カプセルを開いています…':'ガチャを回す 1,000G';if(gachaSkip)gachaSkip.hidden=!rolling;closeButton.disabled=rolling;
 }
 function renderGacha(){
  if(gacha){updateGachaControls();return;}
  tabs.replaceChildren();body.className='town-gacha-body';body.replaceChildren();gachaRattle=createGachaRattle(gs);gacha=createGachaPresentation(phase=>{gachaRattle?.phase(phase);const audio=gs.registry.get('onlineAudio');if(!audio?.seOn||gs.sound.mute||gs.game.config.audio.noAudio||new URLSearchParams(location.search).get('mute')==='1')return;const key=phase==='drop'?'online_charia_drop':phase==='opening'?'online_charia_jingle':'';if(key&&gs.cache.audio.exists(key))gs.sound.play(key,{volume:Math.min(1,audio.seVolume)*.45});});
  const info=node('div');info.className='town-gacha-info';info.append(node('h3','運命をひらく、魔法のガチャ'),node('p','1回 1,000G\n武器・服・盾・手袋・靴・ネックレスのいずれかを獲得します。\nD 35% / C 25% / B 18% / A 12% / S 6% / SS 3% / SSS 1%\n装備は1%の確率で色違いになります。'));
  gachaRollButton=node('button','ガチャを回す 1,000G');gachaRollButton.type='button';
  gachaRollButton.onclick=async()=>{if(pending||gs.requestBusy||gacha?.running)return;const presentation=gacha!;gachaResult!.textContent='';const playing=presentation.play(async()=>{const before=new Set(entries().map(keyOf));await gs.action('gacha');const key=gs.packet.reward;reward=entries().find(e=>!before.has(keyOf(e))&&(baseKey(e.key)===baseKey(key??'')||e.definition.key===baseKey(key??'')));if(!reward)throw Error('所持品を更新して獲得アイテムを確認してください。');return{name:reward.definition.name+(isEquipmentVariant(reward.key)?' ★':''),grade:reward.definition.grade??'D',starred:reward.key.startsWith('star_'),icon:makeIcon(reward)};});updateGachaControls();
   try{const result=await playing;if(result&&active){say(`${result.name}を獲得しました。`);gachaResult!.textContent=result.name+'を獲得！';}}
   catch(error){if(active)say((error as Error).message);}
   finally{if(active){signature='';refresh();updateGachaControls();}}
  };
  gachaSkip=node('button','演出をスキップ');gachaSkip.type='button';gachaSkip.className='gacha-skip';gachaSkip.onclick=()=>gacha?.skip();
  const note=node('p','演出中でも獲得した装備は保存されます。');note.className='gacha-roll-note';gachaResult=node('p');gachaResult.className='gacha-result-label';gachaResult.setAttribute('role','status');info.append(gachaRollButton,gachaSkip,gachaResult,note);body.append(gacha.element,info);updateGachaControls();
 }
 function avatar(key?:string){
  const shell=node('span');shell.className='zero-friend-avatar';shell.setAttribute('aria-hidden','true');
  const item=key&&slots.map(slot=>definition(slot,key)).find(Boolean);
  const imageURL=item&&iconURL(key!.startsWith('star_')?'star_'+item.textureKey:item.textureKey);
  if(imageURL){const image=node('img');image.src=imageURL;image.alt='';shell.append(image);}
  else shell.innerHTML='<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 22c0-5 3-8 8-8s8 3 8 8z"/></svg>';
  return shell;
 }
 const friendsPanel=createFriendPanel({
  avatar,
  async request(name){let sent=false;await run(async()=>{await gs.action('friend_request',{name});sent=true;say('フレンド申請を送りました。');});if(sent)void loadFriendIcons();return sent;},
  change(action,id){void run(async()=>{await gs.action(action,{id});say(action==='friend_accept'?'フレンドになりました。':'登録・申請を解除しました。');void loadFriendIcons();});}
 });
 function renderFriends(){
  tabs.replaceChildren();body.className='town-friends-body';
  if(friendsPanel.root.parentElement!==body)body.replaceChildren(friendsPanel.root);
  friendsPanel.update(gs.packet.friends??[],iconData?.friends??{},pending);
 }
 async function loadFriendIcons(){
  const id=++iconRequest;
  try{
   if(gs.preview)return;
   const result=await friendIcons('list');
   if(!active||iconRequest!==id||result.characterId!==character()?.id)return;
   iconData=result;
   if(modal.hidden)return;
   if(mode==='friends')renderFriends();else if(mode==='friendIcon')renderFriendIcon();
  }catch(e){if(active&&!modal.hidden&&mode==='friendIcon'&&iconRequest===id)say((e as Error).message);}
 }
 function renderFriendIcon(){
  const picker=node('div');picker.className='zero-friend-picker';
  const add=(label:string,key:string|null)=>{
   const b=node('button');b.type='button';b.disabled=iconPending;
   b.setAttribute('aria-pressed',String((iconData?.selected??null)===key));
   b.append(avatar(key??undefined),node('span',label));b.onclick=()=>void saveFriendIcon(key);picker.append(b);
  };
  add('標準アイコン',null);
  const seen=new Set<string>();
  for(const entry of entries()){
   if(entry.category==='item'||seen.has(entry.key))continue;
   seen.add(entry.key);add(entry.definition.name+(entry.key.startsWith('star_')?' ★':''),entry.key);
  }
  body.replaceChildren(picker);
 }
 async function saveFriendIcon(key:string|null){
  const cid=character()?.id;if(!cid||iconPending)return;
  iconPending=true;++iconRequest;renderFriendIcon();
  try{
   const result=gs.preview?{characterId:cid,selected:key,friends:iconData?.friends??{}}:await friendIcons('save',key);
   if(!active||result.characterId!==character()?.id)return;
   iconData=result;if(mode==='friendIcon'&&!modal.hidden)say('アイコンを設定しました。');
  }catch(e){if(active&&mode==='friendIcon'&&!modal.hidden)say((e as Error).message);}
  finally{iconPending=false;if(active&&mode==='friendIcon'&&!modal.hidden)renderFriendIcon();}
 }
 function openFriendIcon(){
  if(!auxiliaryPanel('friendIcon','フレンドアイコン設定'))return;
  body.className='town-friends-body';
  footer.textContent='所持している装備から、フレンド欄に表示するアイコンを選べます。';
  renderFriendIcon();void loadFriendIcons();refresh();
 }
 function auxiliaryPanel(next:'map'|'inspect'|'friendIcon',heading:string){if(gacha?.running)return false;cancelDrag?.();clearGacha();pauseGameInput();mode=next;notice='';hud.overlay?.setVisible(false);hud.overlayMode='townInventory';gs.stopClickPath?.();gs.clearMoveInput?.();modal.hidden=false;modal.dataset.mode=mode;title.textContent=heading;modal.setAttribute('aria-label',heading);tabs.replaceChildren();tabMode='';body.className='town-aux-body';body.replaceChildren();closeButton.focus();return true;}
 const pinScope='room';let mapZoom=.45,mapScroll={x:0,y:0},mapCenter=true;
 function renderMap(){
  const previous=body.querySelector<HTMLElement>('.town-map-viewport');if(previous)mapScroll={x:previous.scrollLeft,y:previous.scrollTop};body.replaceChildren();markPreviewMap(gs);
  const dungeon=!!gs.inDungeon,house=gs.packet.house,a=gs.packet.adventure,floor=a?.floor??1,ox=dungeon||house?0:TOWN_MIN_X,oy=dungeon||house?0:TOWN_MIN_Y,cols=house?house.width:dungeon?(floor===2?13:ADVENTURE_CONFIG.width):TOWN_COLUMNS,rows=house?house.height:dungeon?(floor===2?11:ADVENTURE_CONFIG.height):TOWN_ROWS;
  const viewport=node('div');viewport.className='town-map-viewport';viewport.setAttribute('aria-label','地図：ホイールで拡大縮小、スクロールで移動');const map=node('canvas');map.className='town-party-map';map.width=cols*10;map.height=rows*10;map.setAttribute('aria-label','探索済みの地形と仲間の位置');const ctx=map.getContext('2d')!;
  const resize=()=>{map.style.width=map.width*mapZoom+'px';map.style.height=map.height*mapZoom+'px';};resize();viewport.append(map);
  const zoom=(factor:number,px=viewport.clientWidth/2,py=viewport.clientHeight/2)=>{const old=mapZoom;mapZoom=Math.max(.2,Math.min(3,mapZoom*factor));const x=(viewport.scrollLeft+px)/old,y=(viewport.scrollTop+py)/old;resize();viewport.scrollLeft=x*mapZoom-px;viewport.scrollTop=y*mapZoom-py;};
  viewport.addEventListener('wheel',event=>{if(event.ctrlKey||Math.abs(event.deltaY)>=Math.abs(event.deltaX)){event.preventDefault();const r=viewport.getBoundingClientRect();zoom(event.deltaY<0?1.15:1/1.15,(event.clientX-r.left)*viewport.clientWidth/r.width,(event.clientY-r.top)*viewport.clientHeight/r.height);}},{passive:false});
  map.oncontextmenu=event=>{event.preventDefault();if(!dungeon)return;const r=map.getBoundingClientRect(),x=Math.floor((event.clientX-r.left)/r.width*cols)+ox,y=Math.floor((event.clientY-r.top)/r.height*rows)+oy;if(x<ox||y<oy||x>=ox+cols||y>=oy+rows||floor===1&&mapStationHidden(x,y))return;void run(async()=>{await gs.action('map_pin',{scope:pinScope,x,y});say('ピンを共有しました（30秒間）');renderMap();});};
  ctx.fillStyle='#15191c';ctx.fillRect(0,0,map.width,map.height);for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const wx=x+ox,wy=y+oy;if(dungeon&&!explored(a?.exploration,wx,wy,floor))continue;const walk=house?!houseBlocked(wx,wy,house):dungeon?!adventureBlocked(wx,wy,{...a?.snapshot,railGates:a?.railGates,floor}):!townBlocked(wx,wy);ctx.fillStyle=walk?dungeon?mapFloorColor(wx,wy,floor):'#747a80':'#34383c';ctx.fillRect(x*10+1,y*10+1,8,8);}
  if(!dungeon&&!house)for(const h of HOUSES){ctx.fillStyle=gs.packet.houses?.some((p:any)=>p.id===h.id&&p.mine)?'#f2ca61':'#a97858';ctx.fillRect((h.x-ox)*10,(h.y-oy)*10,h.w*10,h.h*10);}
  for(const p of gs.packet.players){if(dungeon&&floor===1&&mapStationHidden(p.x,p.y))continue;ctx.fillStyle=p.character_id===character()?.id?'#ffe290':'#60ebdc';ctx.beginPath();ctx.arc((p.x-ox+.5)*10,(p.y-oy+.5)*10,6,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#061015';ctx.stroke();ctx.font='bold 19px sans-serif';ctx.lineWidth=3;ctx.strokeText(p.name,(p.x-ox+.5)*10+7,(p.y-oy+.5)*10);ctx.fillStyle='#fff';ctx.fillText(p.name,(p.x-ox+.5)*10+7,(p.y-oy+.5)*10);}
  for(const pin of gs.packet.mapPins??[]){if(pin.scope!=='room'||pin.floor!==floor||dungeon&&floor===1&&mapStationHidden(pin.x,pin.y))continue;const x=(pin.x-ox+.5)*10,y=(pin.y-oy+.5)*10;ctx.fillStyle='#ff9f43';ctx.beginPath();ctx.moveTo(x,y+8);ctx.lineTo(x-6,y-5);ctx.lineTo(x+6,y-5);ctx.closePath();ctx.fill();}
  const legend=node('div');legend.className='town-map-legend';const controls=node('div');for(const [label,factor]of [['−',1/1.3],['＋',1.3]]as const){const b=node('button',label);b.setAttribute('aria-label',factor>1?'地図を拡大':'地図を縮小');b.onclick=()=>zoom(factor);controls.append(b);}legend.append(controls,node('p','ホイール：拡大・縮小／スクロールバー：移動'));
  if(dungeon){legend.append(node('p','橙：部屋ピン'),node('p','赤：ボス部屋　紫：中ボス部屋'),node('p','自分・味方が歩いた場所を共有。駅は地図に表示しません。'));}
  legend.append(node('p',house?`${house.ownerName}の家`:dungeon?`第${floor}層 · 探索マップ`:'はじまりの町'),node('p','● 金：自分　● 水色：味方'));for(const p of gs.packet.players)legend.append(node('p',`${p.character_id===character()?.id?'★':'●'} ${p.name}${dungeon&&floor===1&&mapStationHidden(p.x,p.y)?'（駅）':` (${p.x}, ${p.y})`}`));body.append(viewport,legend);if(mapCenter){viewport.scrollLeft=Math.max(0,(gs.player.x-ox+.5)*10*mapZoom-viewport.clientWidth/2);viewport.scrollTop=Math.max(0,(gs.player.y-oy+.5)*10*mapZoom-viewport.clientHeight/2);mapCenter=false;}else{viewport.scrollLeft=mapScroll.x;viewport.scrollTop=mapScroll.y;}
  footer.textContent=dungeon?'右クリックでピンを共有。未探索の場所は、仲間と歩いて明らかにできます。':'ホイールで拡大縮小できます。';
 }
 function openMap(){mapScroll={x:0,y:0};mapCenter=true;if(auxiliaryPanel('map','マップ · 味方の位置')){renderMap();refresh();}}
 const skillOptions=[
  {key:'heal',name:'ヒール',level:2,cooldown:10000,icon:'✚',detail:'自分のHPを35回復 · 再使用まで10秒'},
  {key:'area_heal',name:'エリアヒール',level:5,cooldown:18000,icon:'✣',detail:'自分と3マス以内の仲間のHPを25回復 · 再使用まで18秒'}
 ] as const;
 function castSkill(key:CharacterSkill){
  if(hud.overlayMode!=='none')return;
  void run(async()=>{try{await gs.action('cast_character_skill',{key});}catch(error){gs.log((error as Error).message);throw error;}},()=>playTownSound(gs,'deny'));
 }
 let lastSkillDock='';
 function renderSkillDock(){
  const c=character(),type=gs.player.weapon?.weaponType as Parameters<typeof weaponSkill>[0],weapon=weaponSkill(type);
  const armed=!!gs.skillArmed,remaining=gs.skillStepsRemaining??0;
  const stamp=railNow(gs);
  const waits=skillOptions.map(option=>Math.max(0,Math.ceil(((c?.skillReadyAt?.[option.key]??0)-stamp)/1000)));
  const key=JSON.stringify([type,armed,remaining,c?.skillLoadout,waits]);
  if(key===lastSkillDock)return;lastSkillDock=key;
  const buttons=Array.from({length:4},(_,i)=>{
   const label=i<2?'武器 '+(i+1):'キャラ '+(i-1);
   const skill=i>=2?skillOptions.find(option=>option.key===c?.skillLoadout?.[i-2]):undefined;
   const wait=Math.max(0,Math.ceil(((skill?c?.skillReadyAt?.[skill.key]:0)??0)/1000-stamp/1000));
   const b=(skillDock.children[i] as HTMLButtonElement|undefined)??node('button');b.type='button';b.className='town-skill-socket';
   const recharge=i===0?weapon?Math.max(0,1-remaining/weapon.chargeSteps):0:skill?Math.max(0,1-Math.max(0,(c?.skillReadyAt?.[skill.key]??0)-stamp)/skill.cooldown):0;
   b.style.setProperty('--skill-charge',`${recharge*100}%`);b.dataset.ready=String(recharge>=1);
   b.disabled=i===1||i===0&&(!weapon||gs.inHouse);
   b.dataset.armed=String(i===0&&armed);
   const title=i===0?weapon?.name:skill?.name;
   const skillTip=i===1?'武器スキル２ · 未設定':i===0?[weapon?.name,weapon?.description,remaining>0?'あと'+remaining+'歩':''].filter(Boolean).join('\n')||'武器スキルなし':skill?.detail??'スキルを設定';attachFloorTooltip(b,skillTip,floorTooltip);
   b.setAttribute('aria-label',label+' '+(title??'空き'));
   const art=node('span',skill?.icon??(i===0&&weapon?'⚔':'＋'));art.className='town-skill-glyph';
   if(i===0&&weapon&&type){const src=(SKILL_ICON_ART as Record<string,string>)[skillIconKey(type)];if(src){const img=node('img');img.src=src;img.alt='';img.onerror=()=>img.replaceWith('⚔');art.replaceChildren(img);}}
   const counter=i===0&&remaining>0?remaining.toString():wait>0?wait+'秒':title??'空き';
   b.replaceChildren(node('small',label),art,node('strong',counter));
   b.onclick=()=>{if(i===0){gs.useWeaponSkill();renderSkillDock();}else if(skill)castSkill(skill.key);else open('skills');};
   return b;
  });
  if(!skillDock.children.length)skillDock.append(...buttons);
 }
 function renderSkills(){
  tabs.replaceChildren();tabMode='';body.className='town-aux-body town-skill-settings';body.replaceChildren();
  const c=character(),level=c?.level??1;
  body.append(node('p','Lv.'+level+'　キャラクタースキルを２つまで装備できます。'));
  for(const option of skillOptions){
   const row=node('section');row.className='town-skill-option';
   row.append(node('h3',option.icon+' '+option.name+' · Lv.'+option.level),node('p',option.detail));
   for(let slot=0;slot<2;slot++){
    const equipped=c?.skillLoadout?.[slot]===option.key;
    const b=node('button',equipped?'枠 '+(slot+1)+' から外す':'枠 '+(slot+1)+' に装備');
    b.type='button';b.disabled=level<option.level;
    b.onclick=()=>void run(()=>gs.action('set_character_skill',{slot,key:equipped?null:option.key}));
    row.append(b);
   }
   body.append(row);
  }
 }
 function renderGuild(){tabs.replaceChildren();tabMode='';renderGuildPanel(body,gs.packet.guild,gs.packet.guildRequests??[],guildDraft,pending,(action,payload)=>{void run(async()=>{const wasLeader=gs.packet.guild?.isLeader;await gs.action(action,payload??{});guildDraft.confirm='';guildDraft.flag=undefined;const messages:Record<string,string>={guild_create:'ギルドを作成しました。',guild_request_join:'加入申請を送りました。',guild_invite:'ギルドへ招待しました。',guild_accept:'加入を承認しました。',guild_decline:'招待・申請を取り消しました。',guild_leave:wasLeader?'ギルドを解散しました。':'ギルドを脱退しました。',guild_kick:'メンバーを除名しました。',guild_transfer:'ギルドマスターを引き継ぎました。'};say(messages[action]??'ギルド情報を更新しました。');});},renderGuild);}
 function renderInspection(){const info=inspected;if(!info||modal.hidden)return;tabs.replaceChildren();tabMode='';body.className='town-aux-body';body.replaceChildren();
  const relation=info.friend&&gs.packet.friends?.find((f:any)=>f.id===info.friend!.id);if(relation)info.friend=relation;
  const ownGuild=gs.packet.guild;if(ownGuild?.members.some((member:any)=>member.id===info.characterId))info.guild={id:ownGuild.id,name:ownGuild.name};else if(ownGuild&&info.guild?.id===ownGuild.id)info.guild=null;
  const request=gs.packet.guildRequests?.find((r:any)=>(ownGuild&&r.guildId===ownGuild.id&&r.characterId===info.characterId)||(!ownGuild&&r.guildId===info.guild?.id&&r.characterId===character()?.id));info.guildRequest=request?{id:request.id,kind:request.kind,incoming:request.incoming}:null;
  const summary=node('div');summary.className='town-inspection-summary';summary.append(node('strong',info.name),node('span',`体力 ${info.hp}`),node('span',info.guild?`ギルド：${info.guild.name}`:'ギルド：未所属'));body.append(summary);
  const actions=node('div');actions.className='town-inspect-actions';for(const entry of gs.inDungeon?[]:inspectionActions(info,gs.packet.guild)){const b=node('button',entry.label);b.type='button';b.disabled=pending||!!entry.disabled;b.onclick=()=>{if(!entry.action)return;void run(async()=>{await gs.action(entry.action!,entry.payload??{});if(gs.packet.inspection?.characterId===inspected?.characterId)inspected=gs.packet.inspection;say(entry.action==='friend_request_character'?'フレンド申請を送りました。':entry.action==='guild_invite'?'ギルドへ招待しました。':entry.action==='guild_request_join'?'ギルド加入申請を送りました。':'申請を承認しました。');});};actions.append(b);}body.append(actions);
  const cards=node('div');cards.className='town-inspect-grid';for(const slot of slots){const item=info.equipment.find((e:any)=>e.slot===slot),card=node('section');card.className='town-inspect-card';card.append(node('h3',label[slot]));const def=item?.key&&definition(slot,item.key);if(item&&def){const entry:Entry={key:item.key,category:slot,index:0,count:1,equipped:true,definition:def};const icon=makeIcon(entry);icon.disabled=true;card.append(icon,node('strong',def.name+(item.key.startsWith('star_')?' ★ 色違い':'')),node('p',def.summary??''),node('p',slot==='armor'?def.description.split('\n')[0]:def.description));if(isEquipmentVariant(item.key))card.append(node('p','装備中の最大HP +50'));}else card.append(node('p','未装備'));cards.append(card);}body.append(cards);
 }
 async function inspectPlayer(id:string,fromRoster=false){if((gs.inDungeon&&!fromRoster)||gs.inHouse||id===gs.packet.active?.id||gacha?.running||gs.requestBusy||pending)return;try{await gs.action(fromRoster?'room_inspect':'inspect_player',{character_id:id});const info=gs.packet.inspection;if((gs.inDungeon&&!fromRoster)||gs.inHouse||!info||!auxiliaryPanel('inspect',`${info.name} · ステータス・装備`))return;inspected=info;renderInspection();footer.textContent=fromRoster?'同じ部屋の冒険者の装備です。':'近くの冒険者の装備を確認し、フレンド・ギルドの申請ができます。';refresh();}catch(e){gs.log((e as Error).message);}}

 function clearGacha(){gachaRattle?.destroy();gachaRattle=undefined;gacha?.dispose();gacha=undefined;gachaRollButton=undefined;gachaSkip=undefined;gachaResult=undefined;closeButton.disabled=false;}
 function renderGuide(){tabs.replaceChildren();body.className='town-guide';body.replaceChildren(node('p','案内人リーフ「ようこそ、はじまりの町へ。\n商人ミラから買い物や装備の修理ができます。\n西のガチャ機では、新しい装備が手に入ります。\nNPCや機械の近くで、右クリックしてみてください。」'));}
 function open(next:'inventory'|'shop'|'gacha'|'friends'|'guild'|'skills',filter?:string){
  if(next==='shop'||next==='gacha'){const npc=TOWN_INTERACTIONS.find(n=>n.id===(next==='shop'?'merchant':'gacha'))!;if(!canInteract(gs.player,npc)){gs.log('町の設備に近づいて右クリックしてください。');return;}}
  if(gacha?.running)return;cancelDrag?.();clearGacha();pauseGameInput();mode=next;category=filter??'all';selected='';notice='';hud.overlay?.setVisible(false);hud.overlayMode='townInventory';gs.destination=undefined;gs.clearMoveInput?.();modal.hidden=false;modal.dataset.mode=mode;title.textContent=next==='inventory'?'所持品':next==='shop'?'商人ミラ · 取引と修理':next==='friends'?'フレンド':next==='skills'?'スキル':next==='guild'?'ギルド':'魔法のガチャ';modal.setAttribute('aria-label',title.textContent);body.className='town-inventory-body';body.replaceChildren(gridWrapper,detailWrapper);footer.textContent=next==='inventory'?'アイテムを選択して詳細を確認。下の枠にドラッグすると登録できます。':next==='friends'?'キャラクター名から申請できます。相手の承認でフレンドになります。':'町の所持金で利用できます。';if(next==='gacha')renderGacha();else if(next==='friends'){renderFriends();void loadFriendIcons();}else if(next==='skills'){footer.textContent='レベルが上がると新しいスキルを装備できます。';renderSkills();}else if(next==='guild'){guildDraft.confirm='';guildDraft.flag=undefined;footer.textContent='招待・加入申請を承認して仲間を増やせます。';renderGuild();}else renderInventory();refresh();closeButton.focus();
 }
 function openGuide(){if(gacha?.running)return;cancelDrag?.();clearGacha();pauseGameInput();mode='guide';hud.overlayMode='townInventory';modal.hidden=false;modal.dataset.mode=mode;title.textContent='案内人リーフ';renderGuide();refresh();}
 function close(){if(gacha?.running){gacha.skip();return;}cancelDrag?.();clearGacha();modal.hidden=true;resumeGameInput();if(hud.overlayMode==='townInventory')hud.overlayMode='none';gs.clearMoveInput?.();gs.game.canvas.tabIndex=0;gs.game.canvas.focus();refresh();}
 let previousInputs:unknown[]=[];
 function refresh(){if(!active)return;friendSetting.hidden=modal.hidden||mode!=='friends';boardUI?.refresh();warehouseUI?.refresh();if(character()?.location==='warehouse'){cancelDrag?.();modal.hidden=true;pauseGameInput();hud.overlayMode='townWarehouse';quick.hidden=true;skillDock.hidden=true;neck.hidden=true;boots.hidden=true;shine.style.display='none';return;}if(hud.overlayMode==='townWarehouse'){resumeGameInput();hud.overlayMode='none';signature='';gs.clearMoveInput?.();}const inventoryOpen=!modal.hidden&&mode==='inventory',overlay=hud.overlayMode;root.classList.toggle('emote-shortcuts',overlay==='emotes');quick.hidden=!(overlay==='none'||inventoryOpen||overlay==='emotes');skillDock.hidden=overlay!=='none';if(!skillDock.hidden)renderSkillDock();neck.hidden=overlay!=='none';boots.hidden=overlay!=='none';shine.style.display=overlay==='none'?'':'none';if(cancelDrag)return;const c=character();
  const inputs=modal.hidden?[c?.id,c?.gear,c?.quickSlots,c?.inventory,c?.instances,c?.equipment]:mode==='friends'?[mode,gs.packet.friends]:mode==='friendIcon'?[mode,c?.id,c?.equipment]:mode==='skills'?[mode,c?.level,c?.skillLoadout]:mode==='guild'?[mode,c?.id,gs.packet.guild,gs.packet.guildRequests]:mode==='inspect'?[mode,c?.id,gs.packet.guild,gs.packet.friends,gs.packet.guildRequests,inspected]:[c?.id,c?.gear,c?.quickSlots,c?.inventory,c?.instances,c?.equipment,c?.gold,gs.packet.shopCatalog,gs.packet.friends,mode==='map'?[gs.packet.players,gs.packet.adventure?.snapshot.keys,gs.packet.adventure?.snapshot.visionRadius,gs.packet.adventure?.exploration?.revision,gs.packet.mapPins]:null];
  if((modal.hidden||mode==='friends'||mode==='friendIcon')&&signature&&inputs.length===previousInputs.length&&inputs.every((value,i)=>Object.is(value,previousInputs[i])))return;
  const next=JSON.stringify(inputs);
  if(!modal.hidden)gold.textContent=`所持金 ${(c?.gold??0).toLocaleString()} G`;if(next===signature){previousInputs=inputs;return;}if(!modal.hidden&&modal.contains(document.activeElement)&&(document.activeElement instanceof HTMLInputElement||document.activeElement instanceof HTMLTextAreaElement))return;previousInputs=inputs;signature=next;if(modal.hidden||mode==='inventory'){renderQuick();renderNeck();}if(!modal.hidden){if(mode==='gacha')renderGacha();else if(mode==='friends')renderFriends();else if(mode==='friendIcon')renderFriendIcon();else if(mode==='guild')renderGuild();else if(mode==='skills')renderSkills();else if(mode==='inspect')renderInspection();else if(mode==='map')renderMap();else if(mode!=='guide')renderInventory();}if(notice)footer.textContent=notice;}
 const onKey=(e:KeyboardEvent)=>{if(e.repeat||e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;if(e.key==='Escape'&&boardUI.visible){e.preventDefault();boardUI.close();return;}if(e.key==='Escape'&&character()?.location==='warehouse'){e.preventDefault();void warehouseUI.exit();return;}if(e.key==='Escape'&&!modal.hidden){e.preventDefault();close();return;}if((hud.overlayMode==='none'||!modal.hidden&&mode==='inventory')&&/^Digit\d$/.test(e.code)){const digit=Number(e.code.slice(-1)),i=(digit===0?9:digit-1)+(e.shiftKey?10:0),entry=resolve(character()?.quickSlots?.[i]);if(entry&&quickIndices.includes(i)){e.preventDefault();void use(entry,true);}}};window.addEventListener('keydown',onKey);
 root.addEventListener('keydown',e=>{if(!modal.hidden||/^Digit\d$/.test(e.code)||e.key==='Escape'){onKey(e);e.stopPropagation();}});root.addEventListener('pointerdown',e=>e.stopPropagation());root.addEventListener('contextmenu',e=>e.preventDefault());
 const boardUI=mountAdventureBoard(root,gs,()=>{modal.hidden=true;pauseGameInput();hud.overlayMode='adventureBoard';quick.hidden=true;skillDock.hidden=true;neck.hidden=true;boots.hidden=true;shine.style.display='none';gs.destination=undefined;},()=>{resumeGameInput();hud.overlayMode='none';refresh();},refresh);
 const warehouseUI=mountWarehouseUI(root,gs,entries,makeIcon,refresh);
 const textureAdded=(key:string)=>{if(!iconKeys.has(key))return;urls.delete(key);gridCache.clear();if(textureRefresh)return;textureRefresh=requestAnimationFrame(()=>{textureRefresh=0;signature='';refresh();});};hud.textures.on('addtexture',textureAdded);refresh();
 return {attachEmote(button:HTMLButtonElement,id:string,onTap:()=>void,onRegistered:(text:string)=>void){const entry=emoteEntry(id);if(entry)attachDrag(button,entry,undefined,onTap,onRegistered);},cancelExternalDrag(){cancelDrag?.();},openFriendIcon,openMap,inspectPlayer,openBoard(){if(!gacha?.running)boardUI.open();},open,openGuide,close,refresh,destroy(){floorTooltip.remove();active=false;cancelAnimationFrame(textureRefresh);boardUI.destroy();warehouseUI.destroy();cancelDrag?.();clearGacha();resize.disconnect();window.removeEventListener('resize',fit);window.removeEventListener('scroll',fit);window.removeEventListener('keydown',onKey);hud.textures.off('addtexture',textureAdded);root.remove();}};
}
