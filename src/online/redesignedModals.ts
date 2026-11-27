import {Audio} from '../audio/manager';
import {GAME_W,GAME_H,IS_MOBILE} from '../layout';
import {MONSTER_DEFS,ELEMENT_INFO,monsterElement} from '../data';
import {difficultyEnemy} from '../difficulty';
import {ITEM_CATALOG} from '../itemCatalog';
import {equipmentIconTexture,equipmentIconFlipX} from '../artRefresh';
import {requestEquipmentArt} from '../lazyEquipmentArt';
import {getLanguage,setLanguage,LANGUAGES,LANGUAGE_NAMES,translate} from '../i18n';
import './redesignedModals.css';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
export function mountRedesignedModals(h:any){
 const host=el('div','','redesigned-host'+(IS_MOBILE?' mobile':''));host.hidden=true;document.body.append(host);
 let mode:'settings'|'codex'|'equipmentcatalog'|'super'='settings',panel:HTMLElement|undefined,previousFocus:HTMLElement|null=null;
 let page=0,selected='',filter='all',renderedArt=new Map<string,string>(),pending=false,active=true;
 let inputState:{hud:boolean;town:boolean;hudKeys:boolean;townKeys:boolean}|undefined;
 function pause(){if(inputState)return;inputState={hud:h.input.enabled,town:h.gs.input.enabled,hudKeys:h.input.keyboard?.enabled??false,townKeys:h.gs.input.keyboard?.enabled??false};h.input.enabled=false;h.gs.input.enabled=false;if(h.input.keyboard)h.input.keyboard.enabled=false;if(h.gs.input.keyboard)h.gs.input.keyboard.enabled=false;}
 function resume(){if(!inputState)return;h.input.enabled=inputState.hud;h.gs.input.enabled=inputState.town;for(const [input,key]of [[h.input,'hudKeys'],[h.gs.input,'townKeys']]as const)if(input.keyboard){input.keyboard.resetKeys();input.keyboard.enabled=inputState[key];}inputState=undefined;}
 const fit=()=>{const r=h.game.canvas.getBoundingClientRect();host.style.cssText=`left:${r.left}px;top:${r.top}px;width:${GAME_W}px;height:${GAME_H}px;transform:scale(${r.width/GAME_W},${r.height/GAME_H})`;};
 const resize=new ResizeObserver(fit);resize.observe(h.game.canvas);window.addEventListener('resize',fit);fit();
 function close(){resume();host.hidden=true;panel?.remove();panel=undefined;h.overlayMode='none';h.gs.clearMoveInput?.();h.townUI?.refresh();if(previousFocus?.isConnected)previousFocus.focus();else h.game.canvas.focus();}
 function button(label:string,run:()=>void,cls=''){const b=el('button',translate(label),cls);b.type='button';b.onclick=()=>{void Audio.playSe('click');run();};return b;}
 function shell(title:string){panel?.remove();panel=el('section','','zero-window redesigned-window');panel.role='dialog';panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label',title);panel.dataset.mode=mode;const header=el('header'),heading=el('h2',translate(title)),exit=button('×',close,'redesign-close');exit.setAttribute('aria-label','閉じる');header.append(heading,exit);panel.append(header);host.append(panel);return panel;}
 function open(next:typeof mode){if(pending)return;pause();previousFocus=document.activeElement as HTMLElement;h.gs.stopClickPath?.();h.gs.clearMoveInput?.();h.overlay?.setVisible(false);mode=next;page=0;selected='';filter='all';host.hidden=false;h.overlayMode=next==='settings'||next==='super'?'modernSettings':'modernCodex';h.townUI?.refresh();render();panel?.querySelector<HTMLButtonElement>('button')?.focus();}
 function section(title:string){const box=el('section','','redesign-section');box.append(el('h3',translate(title)));return box;}
 function settings(){
  const box=shell('設定'),body=el('div','','redesign-settings-body'),left=el('div','','redesign-settings-left'),sound=section('音声'),language=section('言語');
  for(const [kind,label]of [['bgm','音楽'],['se','効果音']]as const){
   const row=el('div','','redesign-volume'),title=el('span',translate(label)),toggle=button('',()=>{}),minus=button('−',()=>{}),plus=button('＋',()=>{}),slider=el('input'),value=el('output');slider.type='range';slider.min='0';slider.max='1';slider.step='.05';slider.setAttribute('aria-label',label+'音量');toggle.setAttribute('aria-label',label+'の切り替え');minus.setAttribute('aria-label',label+'音量を下げる');plus.setAttribute('aria-label',label+'音量を上げる');
   const sync=()=>{const volume=kind==='bgm'?Audio.bgmVolume:Audio.seVolume,on=kind==='bgm'?Audio.bgmOn:Audio.seOn;slider.value=String(volume);value.textContent=Math.round(volume*100)+'%';slider.style.setProperty('--fill',value.textContent);toggle.textContent=on?'入':'切';toggle.setAttribute('aria-pressed',String(on));};
   const set=(v:number)=>{if(kind==='bgm')Audio.setBgmVolume(v);else Audio.setSeVolume(v);sync();};slider.oninput=()=>set(Number(slider.value));minus.onclick=()=>set(Number(slider.value)-.05);plus.onclick=()=>set(Number(slider.value)+.05);toggle.onclick=()=>{kind==='bgm'?Audio.toggleBgm():Audio.toggleSe();sync();};sync();row.append(title,toggle,minus,slider,value,plus);sound.append(row);
  }
  const choices=el('div','','redesign-languages');for(const id of LANGUAGES){const b=button(LANGUAGE_NAMES[id],()=>{setLanguage(id);settings();});b.setAttribute('aria-pressed',String(getLanguage()===id));choices.append(b);}language.append(choices);const credits=el('a','音声クレジット');credits.href='assets/online/npc-voices-v1/credits.html';credits.target='_blank';credits.rel='noopener';sound.append(credits);left.append(sound,language);
  body.append(left);
  if(h.gs.packet.superAccount){
   const tools=section('SUPER');
   tools.append(button('専用操作',()=>{mode='super';superActions();},'accent'));
   body.append(tools);
  }
  box.append(body);
  const footer=el('footer','','redesign-footer'),links=el('div','','redesign-links');for(const [label,url]of [['プライバシー','./privacy.html'],['クレジット','./credits.html']]){const a=el('a',translate(label));a.href=url;a.target='_blank';a.rel='noopener';links.append(a);}footer.append(links,button('操作案内',()=>{close();h.showControlsGuide();}),button('タイトルへ',()=>{close();h.gs.scene.stop('OnlineUIScene');h.gs.scene.start('TitleScene');}));box.append(footer);
 }
 function art(key:string,flip=false){const image=el('img');image.alt='';image.draggable=false;const textureKey=key.startsWith('m_')?key:equipmentIconTexture(key,h);image.dataset.texture=textureKey;image.dataset.equipmentKey=key;if(flip)image.style.transform='scaleX(-1)';const fill=()=>{if(!h.textures.exists(textureKey))return;let url=renderedArt.get(textureKey);if(!url){const texture=h.textures.get(textureKey),f=texture.get(),canvas=document.createElement('canvas');canvas.width=f.cutWidth;canvas.height=f.cutHeight;canvas.getContext('2d')!.drawImage(texture.source[f.sourceIndex].image,f.cutX,f.cutY,f.cutWidth,f.cutHeight,0,0,f.cutWidth,f.cutHeight);url=canvas.toDataURL();renderedArt.set(textureKey,url);}image.src=url;};fill();if(!image.src)requestEquipmentArt(textureKey);return image;}
 function codex(){
  const box=shell('冒険図鑑'),toolbar=el('div','','redesign-codex-toolbar'),tabs=el('nav');tabs.setAttribute('aria-label','図鑑の種類');
  for(const [tab,label]of [['codex','モンスター'],['equipmentcatalog','装備']]as const){const b=button(label,()=>{mode=tab;page=0;selected='';codex();});b.setAttribute('aria-pressed',String(mode===tab));tabs.append(b);}toolbar.append(tabs);
  const equipment=mode==='equipmentcatalog',found=(key:string)=>equipment?h.gs.discoveredEquipment.has(key):h.gs.discovered.has(key);
  const all=equipment?ITEM_CATALOG.filter(e=>e.category!=='item'):MONSTER_DEFS;
  const count=all.filter(e=>found(e.key)).length;toolbar.append(el('span',`${translate('発見')} ${count} / ${all.length}`));box.append(toolbar);
  if(equipment){const filters=el('nav','','redesign-filters');for(const [key,label]of [['all','すべて'],['weapon','武器'],['armor','服'],['shield','盾'],['necklace','ネックレス'],['gloves','手袋'],['boots','靴']]){const b=button(label,()=>{filter=key;page=0;selected='';codex();});b.setAttribute('aria-pressed',String(filter===key));filters.append(b);}box.append(filters);}
  const equipmentArt=(entry:{key:string;textureKey:string})=>h.gs.discoveredEquipment.has('star_'+entry.key)?'star_'+entry.textureKey:entry.textureKey;
  const entries:any[]=equipment?all.filter((e:any)=>filter==='all'||e.category===filter):all;
  const pageSize=8,pages=Math.max(1,Math.ceil(entries.length/pageSize));page=Math.max(0,Math.min(page,pages-1));const visible=entries.slice(page*pageSize,(page+1)*pageSize);
  if(!visible.some(e=>e.key===selected))selected=visible.find(e=>found(e.key))?.key??'';
  const body=el('div','','redesign-codex-body'),grid=el('div','','redesign-codex-grid'),detail=el('article','','redesign-codex-detail');grid.setAttribute('aria-label','図鑑一覧');detail.setAttribute('aria-label','選択した項目の詳細');
  for(const entry of visible){const unlocked=found(entry.key),card=button('',()=>{selected=entry.key;codex();},'redesign-codex-card');card.setAttribute('aria-label',unlocked?entry.name:'未発見');card.setAttribute('aria-pressed',String(selected===entry.key));if(unlocked)card.append(art(equipment?equipmentArt(entry):entry.key,equipment&&equipmentIconFlipX(entry.textureKey)));else card.append(el('span','◇','redesign-locked'));card.append(el('strong',unlocked?entry.name:translate('未発見')));if(!equipment)card.append(el('small',`${entry.minFloor}〜${entry.maxFloor}階`));grid.append(card);}
  const entry=entries.find(e=>e.key===selected);if(entry&&found(entry.key)){detail.append(el('h3',entry.name),art(equipment?equipmentArt(entry):entry.key,equipment&&equipmentIconFlipX(entry.textureKey)));if(equipment){detail.append(el('p',entry.summary),el('p',entry.description));const star=h.gs.discoveredEquipment.has('star_'+entry.key);if(star)detail.append(el('p','★ 色違い：装備中の最大HP +50','redesign-star'));}else{const m=difficultyEnemy(entry,h.gs.difficulty),element=monsterElement(m),stats=el('dl');for(const [label,v]of [['出現階層',`${m.minFloor}〜${m.maxFloor}階`],['HP',m.hp],['攻撃',`${m.atkMin}〜${m.atkMax}`],['防御',m.def],['属性',element?ELEMENT_INFO[element].name:'無属性']])stats.append(el('dt',translate(String(label))),el('dd',String(v)));detail.append(stats,el('h4',translate('特性')),el('p',m.gimmickText??translate('固有効果なし')));}}else detail.append(el('div','◇','redesign-locked'),el('h3',translate('未発見')),el('p',translate('発見すると詳しい情報が表示されます。')));
  body.append(grid,detail);box.append(body);const footer=el('footer','','redesign-pagination'),prev=button('‹ 前へ',()=>{page--;selected='';codex();}),next=button('次へ ›',()=>{page++;selected='';codex();});prev.disabled=page===0;next.disabled=page===pages-1;footer.append(prev,el('span',`${page+1} / ${pages}`),next);box.append(footer);
 }
 function superActions(){
  if(!h.gs.packet.superAccount){close();return;}
  const box=shell('専用操作'),body=el('div','','redesign-super-actions'),status=el('p','','redesign-status');
  status.role='status';
  const back=button('設定へ戻る',()=>{mode='settings';settings();});
  const canWarp=()=>h.gs.packet.adventure?.inside&&h.gs.packet.adventure?.floor===1;
  const warp=button('ボスにテレポート',()=>void run(true));
  const items=button('アイテム取得',()=>void run(false),'accent');
  warp.disabled=!canWarp();
  if(warp.disabled)status.textContent=translate('ボスへのテレポートは第1層のダンジョン内で使用できます。');
  async function run(teleport:boolean){
   if(pending||!h.gs.packet.superAccount)return;
   pending=true;items.disabled=warp.disabled=back.disabled=true;status.textContent=translate('処理中…');
   try{
    if(teleport)await h.gs.action('boss_test_warp');
    else await h.gs.openSuperItemCatalog();
    if(!active||host.hidden||panel!==box)return;
    pending=false;close();
    if(!teleport)h.setOverlay('itemcatalog');
   }catch(e){if(active&&panel===box)status.textContent=(e as Error).message;}
   finally{pending=false;items.disabled=back.disabled=false;warp.disabled=!canWarp();}
  }
  body.append(items,warp,status,back);box.append(body);items.focus();
 }
 function render(){if(mode==='settings')settings();else if(mode==='super')superActions();else codex();}
 const textureAdded=(key:string)=>{if(host.hidden)return;renderedArt.delete(key);for(const image of host.querySelectorAll<HTMLImageElement>('img[data-texture]'))if(image.dataset.texture===key){const fresh=art(image.dataset.equipmentKey??key);if(fresh.src){image.src=fresh.src;image.dataset.texture=fresh.dataset.texture;}}};h.textures.on('addtexture',textureAdded);
 host.addEventListener('pointerdown',e=>{e.stopPropagation();if(e.target===host&&!pending)close();});host.addEventListener('contextmenu',e=>e.preventDefault());
 host.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'&&!pending){e.preventDefault();close();}if(e.key==='Tab'&&panel){const controls=Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled),input,a[href]')),first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}});
 return {open,close,get visible(){return !host.hidden;},destroy(){active=false;resume();resize.disconnect();window.removeEventListener('resize',fit);h.textures.off('addtexture',textureAdded);host.remove();}};
}
