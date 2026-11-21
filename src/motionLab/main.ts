import {appearanceController,type Appearance} from './appearanceController';
import {registerVerticalRanged} from './verticalRanged';
import {classicProfile as armedProfile,classicLunge} from './classicAttack';
import './style.css';
import weaponCatalog from './weapons.json';
import {ARMED_PROFILES,armedFrame,drawArmedEffects} from './armedStudy';
const weapons=ARMED_PROFILES.map(profile=>weaponCatalog.find(w=>w.weaponType===profile.type)!);
import {drawOriginalRig,originalMuzzle,parseLimbParts,type LimbParts} from './originalWeaponRig';
import {FACINGS,ROW,TYPES,makeAtlas,motionFor,type Atlas,type Facing,type Point} from './motion';

// Isolated art sandbox: no game boot, authentication, backend, saved inventory, or audio.
type Weapon=typeof weapons[number];
const root=document.querySelector<HTMLDivElement>('#motion-lab')!;
root.innerHTML=`<main class="app"><header><div><div class="brand">CHARI DUNGEON: ZERO / CHARACTER & WEAPON ATELIER 05</div><h1>新しいキャラ、従来の攻撃。</h1></div><span class="badge">ローカル試作 · 無音 · セーブに影響なし</span></header><div class="layout"><div class="left"><section class="stage"><canvas id="world" tabindex="0" aria-label="キャラクター操作エリア。矢印キーで移動、右クリックで攻撃"></canvas><div class="stage-title"><span>THE TRAINING COURTYARD</span><b>試着と動作の広場</b></div><div class="stage-status" id="stage-status">準備中</div><div class="compare">新しいキャラクター / 身長 40 px</div><div class="dpad"><button data-move="left">←</button><button data-move="up">↑</button><button data-move="down">↓</button><button data-move="right">→</button></div><div class="stage-help"><span>矢印 / WASD / クリック：移動<br>右クリック / Space：攻撃 · 樽を狙って試せます</span><button id="zoom" class="small">表示：2倍</button></div><div class="loading" role="status">新しいキャラクターを準備中…<small>歩き・斬り・大剣・突き・弓を読み込んでいます</small></div></section><section class="controls"><div class="control-line"><button id="attack" class="primary">攻撃する</button><button id="costume-gallery" aria-pressed="false">全衣装・男女一覧</button><button id="gallery" aria-pressed="false">全武器・4方向</button><button id="walk" aria-pressed="false">歩きを再生</button><button id="repeat" aria-pressed="false">攻撃を繰り返す</button><button id="pause" aria-pressed="false">一時停止</button><button id="next-frame">1コマ進む</button><label>速度 <select id="speed"><option value=".25">0.25倍</option><option value=".5">0.5倍</option><option value="1" selected>通常</option></select></label></div><div class="control-line"><span class="state-label" id="pose-label">待機</span><input id="timeline" type="range" min="0" max="999" value="0" aria-label="動作のコマを確認"><output id="frame-label">1 / 8</output></div><div class="frames">${Array.from({length:8},()=>'<i></i>').join('')}</div></section></div><aside class="panel"><h2>動作を、近くで見る</h2><div class="portrait"><canvas id="portrait" aria-label="装備と動作の拡大表示"></canvas><div class="caption">手元と足運びの拡大プレビュー</div></div><div class="row">${FACINGS.map(d=>`<button data-facing="${d}" aria-pressed="${d==='right'}">${({down:'前',left:'左',up:'後ろ',right:'右'})[d]}</button>`).join('')}</div><section id="appearance" class="section appearance"></section><div class="section"><label class="legend">装備する武器 <span class="weapon-count">代表 ${weapons.length} 種</span></label><input type="search" id="search" placeholder="武器名で探す" aria-label="武器名で検索"><select id="type" class="type-select" aria-label="武器の種類"><option value="all">すべての武器</option>${Object.entries(TYPES).filter(([key])=>ARMED_PROFILES.some(p=>p.type===key)).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select><div class="weapons" id="weapons"></div></div><div class="selected-name" id="weapon-name"></div><div class="selected-desc" id="weapon-desc"></div><div class="row"><button id="prev-weapon">前の武器</button><button id="next-weapon">次の武器</button></div><div class="section"><label class="check"><input id="anchors" type="checkbox">手首と肘の接続を見る</label><label class="check"><input id="compare" type="checkbox" checked>現行キャラと並べる</label></div><div class="section"><label class="legend">使用中の既存武器 · 元画像</label><canvas id="parts" width="512" height="180" aria-label="既存武器の元画像" style="width:100%;height:100px"></canvas></div><div id="diagnostic" role="status"></div><p class="footnote">既存の武器8種類を元画像のまま使用。<br>柄に手首を固定し、肘と肩を連動。<br>攻撃速度と踏み込みは現行ゲーム準拠。<br>飛ぶ弾は弓と銃だけ。<br>本番は変更していません。</p></aside></div></main>`;
const $=<T extends HTMLElement=HTMLElement>(s:string)=>document.querySelector<T>(s)!;
const canvas=$<HTMLCanvasElement>('#world'),ctx=canvas.getContext('2d')!,portrait=$<HTMLCanvasElement>('#portrait'),pc=portrait.getContext('2d')!;
const images=new Map<string,HTMLImageElement>();
let weapon:Weapon=weapons.find(w=>w.weaponType==='lance')!;
let bodyAtlas:Atlas,limbParts:LimbParts;
const originalWeapons=new Map<string,HTMLImageElement>();
let gallery=false,wardrobeGallery=false;let galleryAppearances:Appearance[]=[];
let ready=false,dir:Facing='right',showAnchors=false,compare=true;
let clock=0,previous=performance.now(),speed=1,attackStart=-10000,walking=false,repeat=false,paused=false,scrub:number|undefined;
let walkTime=0,zoom=2,ww=900,wh=600,pw=288,ph=240,camera={x:0,y:0},hover:Point|undefined;
const TILE=48,COLS=17,ROWS=13,STEP=205;
let pos:Point=[7,7],drawPos:Point=[7,7],step:{from:Point;to:Point;start:number}|undefined,path:Point[]=[];
const keys=new Set<string>(),keyDir:Record<string,Facing>={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};
const delta:Record<Facing,Point>={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]};
const barrels:Point[]=[[10,7],[10,5],[10,9]];const impactDone=new Set<number>();let hitAt=-10000,hitBarrel=-1,impactFired=false,attacks=0,hits=0;
let floor:HTMLImageElement,grass:HTMLImageElement,barrel:HTMLImageElement|undefined,old:HTMLImageElement;

function load(src:string){const cached=images.get(src);if(cached)return Promise.resolve(cached);return new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>{images.set(src,i);resolve(i);};i.onerror=()=>reject(Error('画像読み込み失敗: '+src));i.src=src;});}
const appearance=appearanceController($('#appearance'),load,a=>{bodyAtlas=a.body;limbParts=a.arms;canvas.dataset.gender=a.gender;canvas.dataset.costume=a.key;canvas.dataset.hair=a.hair;if(wardrobeGallery)void appearance.getAll().then(all=>galleryAppearances=all);});
$('#costume-gallery').onclick=async()=>{wardrobeGallery=!wardrobeGallery;gallery=false;$('#gallery').setAttribute('aria-pressed','false');$('#costume-gallery').setAttribute('aria-pressed',String(wardrobeGallery));if(wardrobeGallery){try{galleryAppearances=await appearance.getAll();}catch(e){say(String(e));}}};
function say(s:string){$('#diagnostic').textContent=s;}
function filtered(){const q=$<HTMLInputElement>('#search').value.trim().toLowerCase(),type=$<HTMLSelectElement>('#type').value;return weapons.filter(w=>(type==='all'||w.weaponType===type)&&(!q||w.name.toLowerCase().includes(q)||w.key.includes(q)));}
function renderWeapons(){const list=filtered(),scroll=$('#weapons').scrollTop;$('#weapons').innerHTML=list.map(w=>`<button class="weapon" data-key="${w.key}" aria-pressed="${w.key===weapon.key}" title="${w.name}"><img src="${w.icon}" alt="" style="width:44px;height:44px;object-fit:contain"><span>${w.name}</span></button>`).join('')||'<p>該当する武器はありません</p>';$('#weapons').scrollTop=scroll;}
$('#weapons').onclick=e=>{const b=(e.target as HTMLElement).closest<HTMLElement>('[data-key]');if(b)void selectWeapon(weapons.find(w=>w.key===b.dataset.key)!);};
$<HTMLInputElement>('#search').oninput=renderWeapons;$<HTMLSelectElement>('#type').onchange=renderWeapons;
async function selectWeapon(w:Weapon){weapon=w;attackStart=-10000;impactFired=false;scrub=undefined;paused=false;$('#pause').textContent='一時停止';
 const p=armedProfile(w.weaponType);$('#weapon-name').textContent=w.name;$('#weapon-desc').textContent=w.weaponType==='katana'?'既存の刀の柄を握り、踏み込みに合わせて斬り返す。':p.description;
 renderWeapons();const image=originalWeapons.get(w.key);if(image){const c=$<HTMLCanvasElement>('#parts'),g=c.getContext('2d')!;g.clearRect(0,0,c.width,c.height);const sw=w.directional?image.width/2:image.width,sh=w.directional?image.height/2:image.height,k=Math.min(c.width/sw,c.height/sh);g.drawImage(image,0,0,sw,sh,(c.width-sw*k)/2,0,sw*k,sh*k);}

 say(`${weapons.indexOf(w)+1} / ${weapons.length} · 既存画像・持ち手固定 · 音声なし`);
}
for(const [id,change]of [['#prev-weapon',-1],['#next-weapon',1]] as const)$(id).onclick=()=>{const list=filtered();if(!list.length)return;void selectWeapon(list[(Math.max(0,list.indexOf(weapon))+change+list.length)%list.length]);};
$<HTMLInputElement>('#anchors').onchange=e=>showAnchors=(e.target as HTMLInputElement).checked;
$<HTMLInputElement>('#compare').onchange=e=>compare=(e.target as HTMLInputElement).checked;
function face(d:Facing){dir=d;document.querySelectorAll<HTMLElement>('[data-facing]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.facing===dir)));}
document.querySelectorAll<HTMLElement>('[data-facing]').forEach(b=>b.onclick=()=>face(b.dataset.facing as Facing));
function attack(){if(!ready||!originalWeapons.has(weapon.key))return;if(!paused&&scrub===undefined&&clock-attackStart<armedProfile(weapon.weaponType).duration)return;paused=false;scrub=undefined;$('#pause').textContent='一時停止';$('#pause').setAttribute('aria-pressed','false');walking=false;$('#walk').setAttribute('aria-pressed','false');path=[];if(step){pos=[...step.to];drawPos=[...pos];step=undefined;}attackStart=clock;impactFired=false;impactDone.clear();attacks++;}
$('#attack').onclick=attack;
$('#gallery').onclick=()=>{wardrobeGallery=false;$('#costume-gallery').setAttribute('aria-pressed','false');gallery=!gallery;$('#gallery').setAttribute('aria-pressed',String(gallery));};
$('#walk').onclick=()=>{repeat=false;$('#repeat').setAttribute('aria-pressed','false');walking=!walking;paused=false;scrub=undefined;attackStart=-10000;$('#walk').setAttribute('aria-pressed',String(walking));$('#pause').textContent='一時停止';};
$('#repeat').onclick=()=>{repeat=!repeat;$('#repeat').setAttribute('aria-pressed',String(repeat));if(repeat)attack();};
$('#pause').onclick=()=>{paused=!paused;if(!paused&&scrub!==undefined){if(walking)walkTime=scrub*600;else attackStart=clock-scrub*armedProfile(weapon.weaponType).duration;scrub=undefined;}$('#pause').textContent=paused?'再生する':'一時停止';$('#pause').setAttribute('aria-pressed',String(paused));};
$('#next-frame').onclick=()=>{const st=state();paused=true;const f=(st.frame+1)%8;scrub=walking?f/8+.001:armedProfile(weapon.weaponType).phase[f]+.001;$('#pause').textContent='再生する';};
$<HTMLInputElement>('#timeline').oninput=e=>{paused=true;scrub=Number((e.target as HTMLInputElement).value)/1000;$('#pause').textContent='再生する';};
$<HTMLSelectElement>('#speed').onchange=e=>speed=Number((e.target as HTMLSelectElement).value);
$('#zoom').onclick=()=>{zoom=zoom===2?1:zoom===1?3:2;$('#zoom').textContent=`表示：${zoom}倍`;};
function blocked(x:number,y:number){return x<1||x>=COLS-1||y<1||y>=ROWS-1||barrels.some(p=>p[0]===x&&p[1]===y);}
function move(d:Facing){face(d);const v=delta[d],to:Point=[pos[0]+v[0],pos[1]+v[1]];if(blocked(...to))return;step={from:[...pos],to,start:clock};}
function findPath(from:Point,to:Point):Point[]{if(blocked(...to))return [];const queue:Point[]=[from],seen=new Map<string,Point|null>([[from.join(),null]]);for(let i=0;i<queue.length;i++){const p=queue[i];if(p[0]===to[0]&&p[1]===to[1]){const out:Point[]=[];let at:Point|null=p;while(at&&seen.get(at.join())){out.unshift(at);at=seen.get(at.join())!;}return out;}for(const v of Object.values(delta)){const n:Point=[p[0]+v[0],p[1]+v[1]];if(!blocked(...n)&&!seen.has(n.join())){seen.set(n.join(),p);queue.push(n);}}}return [];}
function pointer(e:PointerEvent):Point{const r=canvas.getBoundingClientRect();return [Math.floor((e.clientX-r.left-camera.x)/zoom/TILE),Math.floor((e.clientY-r.top-camera.y)/zoom/TILE)];}
function aim(target:Point){const dx=target[0]-drawPos[0],dy=target[1]-drawPos[1];if(Math.abs(dx)+Math.abs(dy)>.1)face(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');}
canvas.oncontextmenu=e=>e.preventDefault();canvas.onpointermove=e=>hover=pointer(e);canvas.onpointerleave=()=>hover=undefined;
canvas.onpointerdown=e=>{canvas.focus();const target=pointer(e);if(e.button===2){aim(target);attack();}else if(e.button===0){paused=false;scrub=undefined;walking=false;path=findPath(step?.to??pos,target);if(target[0]===pos[0]&&target[1]===pos[1]){walking=true;$('#walk').setAttribute('aria-pressed','true');}}};
window.addEventListener('keydown',e=>{if((e.target as HTMLElement).matches('input,select,textarea'))return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(keyDir[key]){e.preventDefault();keys.add(key);path=[];paused=false;scrub=undefined;walking=false;if(!step&&!state().isAttack)move(keyDir[key]);}if(e.code==='Space'&&!e.repeat){e.preventDefault();attack();}});
window.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));window.addEventListener('blur',()=>keys.clear());document.addEventListener('visibilitychange',()=>{keys.clear();previous=performance.now();});
document.querySelectorAll<HTMLElement>('[data-move]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(Object.keys(keyDir).find(k=>keyDir[k]===b.dataset.move)!);};b.onpointerup=b.onpointercancel=()=>keys.clear();});
function resize(){const dpr=Math.min(devicePixelRatio,2);const r=canvas.getBoundingClientRect(),p=portrait.getBoundingClientRect();ww=r.width;wh=r.height;pw=p.width;ph=p.height;canvas.width=Math.round(ww*dpr);canvas.height=Math.round(wh*dpr);portrait.width=Math.round(pw*dpr);portrait.height=Math.round(ph*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);pc.setTransform(dpr,0,0,dpr,0,0);}
new ResizeObserver(resize).observe(canvas.parentElement!);new ResizeObserver(resize).observe(portrait.parentElement!);
function state(){const p=armedProfile(weapon.weaponType),a=(clock-attackStart)/p.duration,isAttack=scrub!==undefined&&!walking||a>=0&&a<1,walkActive=walking||!!step,t=scrub??(isAttack?a:walkActive?(walkTime%600)/600:0);return {isAttack,t,walkActive,frame:armedFrame(p,t,walkActive),m:motionFor(p.type)};}
function actor(g:CanvasRenderingContext2D,x:number,y:number,magnify:number,preview=false){
 const s=state(),p=armedProfile(weapon.weaponType),image=originalWeapons.get(weapon.key);if(!image)return;
 const lunge=s.isAttack?classicLunge(p.type,s.t)*magnify:0;const v=delta[dir];g.save();g.translate(x+v[0]*lunge,y+v[1]*lunge);g.fillStyle='#020b0e65';g.beginPath();g.ellipse(0,0,12*magnify,3.5*magnify,0,0,Math.PI*2);g.fill();
 drawOriginalRig(g,bodyAtlas,limbParts,image,p.type,weapon.directional,dir,s.t,s.isAttack,s.walkActive,magnify,showAnchors);
 if(s.isAttack)drawArmedEffects(g,p,dir,s.t,magnify,originalMuzzle(p.type,dir,s.t));
 g.restore();
 if(preview){g.fillStyle='#91b5aa';g.font='10px sans-serif';g.textAlign='center';g.fillText(`${s.isAttack?weapon.name+'・従来の攻撃':s.walkActive?'武器を持って歩く':'構え'} · ${s.frame+1}/8`,pw/2,18);}
}
function oldActor(g:CanvasRenderingContext2D,x:number,y:number){if(!old)return;const s=state(),cols=old.width/96,row=ROW[dir],f=walking||step?2+Math.floor((walkTime%560)/560*18):0;g.drawImage(old,((row*28+f)%cols)*96,Math.floor((row*28+f)/cols)*96,96,96,x-21.76,y-38,43.52,43.52);g.fillStyle='#9db5a9';g.font='7px sans-serif';g.textAlign='center';g.fillText('現行',x,y+13);}
function drawWorld(){if(wardrobeGallery){drawCostumeGallery();return;}if(gallery){drawGallery();return;}ctx.clearRect(0,0,ww,wh);ctx.fillStyle='#09171d';ctx.fillRect(0,0,ww,wh);camera={x:ww/2-(8+(drawPos[0]<6.5?drawPos[0]-6.5:drawPos[0]>9?drawPos[0]-9:0))*TILE*zoom,y:wh*.53-(7+(drawPos[1]<5.5?drawPos[1]-5.5:drawPos[1]>8.5?drawPos[1]-8.5:0))*TILE*zoom};ctx.save();ctx.translate(camera.x,camera.y);ctx.scale(zoom,zoom);
 const startX=Math.max(0,Math.floor(-camera.x/zoom/TILE)),endX=Math.min(COLS,Math.ceil((ww-camera.x)/zoom/TILE)),startY=Math.max(0,Math.floor(-camera.y/zoom/TILE)),endY=Math.min(ROWS,Math.ceil((wh-camera.y)/zoom/TILE));
 for(let y=startY;y<endY;y++)for(let x=startX;x<endX;x++){const lawn=x===0||y===0||x===COLS-1||y===ROWS-1,img=lawn?grass:floor,cell=lawn?128:64,cols=img.width/cell,f=(x*3+y*7)%(lawn?64:6);ctx.drawImage(img,f%cols*cell,Math.floor(f/cols)*cell,cell,cell,x*TILE,y*TILE,TILE+.2,TILE+.2);ctx.strokeStyle='#07101030';ctx.lineWidth=.4;ctx.strokeRect(x*TILE,y*TILE,TILE,TILE);}
 if(hover&&!blocked(...hover)){ctx.strokeStyle='#b9d9c4aa';ctx.lineWidth=1/zoom;ctx.strokeRect(hover[0]*TILE+2,hover[1]*TILE+2,TILE-4,TILE-4);}
 const objects:{y:number;draw:()=>void}[]=barrels.map((p,i)=>({y:(p[1]+.8)*TILE,draw:()=>{const hit=i===hitBarrel?Math.max(0,1-(clock-hitAt)/250):0,shake=Math.sin((clock-hitAt)*.1)*hit*3;ctx.save();ctx.translate((p[0]+.5)*TILE+shake,(p[1]+.82)*TILE);ctx.rotate(Math.sin((clock-hitAt)*.09)*hit*.07);if(barrel)ctx.drawImage(barrel,-19,-35,38,38);else{ctx.fillStyle='#65482d';ctx.fillRect(-13,-29,26,30);ctx.strokeStyle='#b7aa79';ctx.strokeRect(-13,-24,26,5);ctx.strokeRect(-13,-8,26,5);}ctx.restore();if(hit){ctx.fillStyle='#fff1bc';ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillText('HIT',(p[0]+.5)*TILE,(p[1]+.1)*TILE-(1-hit)*10);}}}));
 objects.push({y:(drawPos[1]+.8)*TILE,draw:()=>actor(ctx,(drawPos[0]+.5)*TILE,(drawPos[1]+.82)*TILE,1)});
 if(compare)objects.push({y:(drawPos[1]+.8)*TILE,draw:()=>oldActor(ctx,(drawPos[0]-.6)*TILE,(drawPos[1]+.82)*TILE)});
 objects.sort((a,b)=>a.y-b.y).forEach(o=>o.draw());ctx.restore();
 const v=ctx.createRadialGradient(ww/2,wh/2,Math.min(ww,wh)*.25,ww/2,wh/2,Math.max(ww,wh)*.65);v.addColorStop(0,'#07131b00');v.addColorStop(1,'#07131bb0');ctx.fillStyle=v;ctx.fillRect(0,0,ww,wh);
}
function drawCostumeGallery(){ctx.fillStyle='#0c1b22';ctx.fillRect(0,0,ww,wh);const cols=6,rows=Math.ceil(galleryAppearances.length/cols)||3,cw=ww/cols,ch=(wh-130)/rows;galleryAppearances.forEach((a,i)=>{const x=i%cols*cw,y=75+Math.floor(i/cols)*ch;ctx.strokeStyle='#344d50';ctx.strokeRect(x,y,cw,ch);ctx.fillStyle='#e2c690';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText((a.gender==='male'?'男':'女')+' · '+a.name,x+cw/2,y+18);ctx.save();ctx.translate(x+cw/2,y+ch*.83);drawOriginalRig(ctx,a.body,a.arms,originalWeapons.get(weapon.key)!,weapon.weaponType,weapon.directional,dir,state().t,state().isAttack,state().walkActive,Math.min(2.4,(cw-16)/64,(ch-30)/65),showAnchors);ctx.restore();});}
function drawGallery(){ctx.fillStyle='#0c1b22';ctx.fillRect(0,0,ww,wh);const cw=ww/8,ch=(wh-100)/4;
 weapons.forEach((w,col)=>{(['down','left','right','up'] as Facing[]).forEach((facing,row)=>{const x=col*cw,y=50+row*ch;ctx.strokeStyle='#29434a';ctx.strokeRect(x,y,cw,ch);ctx.fillStyle='#d9d0b4';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText(TYPES[w.weaponType]+' / '+({down:'前',left:'左',right:'右',up:'後'})[facing],x+cw/2,y+14);ctx.save();ctx.translate(x+cw*.45,y+ch*.8);drawOriginalRig(ctx,bodyAtlas,limbParts,originalWeapons.get(w.key)!,w.weaponType,w.directional,facing,state().t,state().isAttack,state().walkActive,Math.min(1.7,(cw-8)/105,(ch-20)/70),showAnchors);ctx.restore();});});}
let lastHud=0;
function tick(now:number){const dt=Math.min(40,now-previous);previous=now;if(!paused&&!document.hidden)clock+=dt*speed;
 if(ready){const s=state(),a=(clock-attackStart)/armedProfile(weapon.weaponType).duration;
  if(!paused){if(s.isAttack){const profile=armedProfile(weapon.weaponType);for(let impact=0;impact<profile.impact.length;impact++){if(s.t>=profile.impact[impact]&&!impactDone.has(impact)){impactDone.add(impact);const v=delta[dir],r=profile.range;hitBarrel=barrels.findIndex(p=>{const dx=p[0]-pos[0],dy=p[1]-pos[1];return v[0]?dy===0&&dx*v[0]>0&&dx*v[0]<=r:dx===0&&dy*v[1]>0&&dy*v[1]<=r;});if(hitBarrel>=0){hitAt=clock;hits++;}}}}

   if(step){const t=Math.min(1,(clock-step.start)/STEP);drawPos=[step.from[0]+(step.to[0]-step.from[0])*t,step.from[1]+(step.to[1]-step.from[1])*t];walkTime+=dt*speed;if(t>=1){pos=[...step.to];step=undefined;}}
   if(!step&&!s.isAttack){const held=[...keys],key=held[held.length-1];if(key)move(keyDir[key]);else if(path.length){const n=path.shift()!;move(n[0]>pos[0]?'right':n[0]<pos[0]?'left':n[1]>pos[1]?'down':'up');}else if(repeat&&a>1.35)attack();}
   if(walking&&!step)walkTime+=dt*speed;
  }
  drawWorld();pc.clearRect(0,0,pw,ph);actor(pc,weapon.weaponType==='lance'?(dir==='right'?pw*.36:dir==='left'?pw*.64:pw/2):pw/2,ph-33,Math.min(2.6,(pw-24)/100,(ph-45)/88),true);
  if(now-lastHud>60){lastHud=now;const st=state();$('#pose-label').textContent=st.isAttack?weapon.name+'・従来の攻撃':(walking||step?'武器を持って歩く':'構え');$('#frame-label').textContent=`${st.frame+1} / 8`;if(scrub===undefined)$<HTMLInputElement>('#timeline').value=String(Math.floor(st.t*999));document.querySelectorAll('.frames i').forEach((el,i)=>el.classList.toggle('on',i===st.frame));$('#stage-status').textContent=`${TYPES[weapon.weaponType]} · ${({down:'前',left:'左',right:'右',up:'後ろ'})[dir]}\n${speed===1?'通常速度':speed+'倍速'} · マス ${pos.join(',')} · 命中 ${hits}`;canvas.dataset.tile=pos.join(',');canvas.dataset.frame=String(st.frame);canvas.dataset.motion=st.m;canvas.dataset.attacks=String(attacks);canvas.dataset.weapon=weapon.key;canvas.dataset.muted='true';}
 }
 requestAnimationFrame(tick);
}
async function boot(){try{
 await Promise.all(weapons.map(async w=>originalWeapons.set(w.key,await load(w.held))));
 await Promise.all([['handgun','gun'],['bow','bow']].map(async([type,file])=>registerVerticalRanged(type,await load('/assets/characters/wardrobe-v5/'+file+'-vertical.png'))));
 await appearance.update();
 [floor,grass,old]=await Promise.all(['/assets/terrain/ruins-floor-v1/1.png','/assets/online/town-grass-v1.png','/assets/characters/smooth-walk-v1/male-leather.webp'].map(load));
 try{barrel=await load('/assets/online/training-barrel-v1.png');}catch{/* procedural stand-in only if the existing barrel file is absent */}
 await selectWeapon(weapon);ready=true;$('.loading').hidden=true;resize();canvas.focus();
 }catch(e){$('.loading').textContent=String(e);$('.loading').classList.add('error');say(String(e));console.error(e);}}
void boot();requestAnimationFrame(tick);
