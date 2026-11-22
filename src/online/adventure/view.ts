import {drawMazeGround,mountMazeMechanics} from './mazeView';
import {isTap,startTapAction} from '../tapActions';
import {EncounterClock,telegraphLabel,enemyMoveDuration} from './encounterClock';
import {partyCanSee,partySightRadius} from './visibility';
import {ADVENTURE_CONFIG as C,ADVENTURE_AREAS,ADVENTURE_PROPS,adventureAreaAt} from './layout';
import {SCENERY,terrainFrame,BRIDGES} from './scenery';
import {MAP_X,MAP_Y,MAP_W,MAP_H} from '../../layout';
import {townPath} from '../gridPath';
const MOB_FRAMES:Record<string,{sheet:string;row:number}>={m_jelly:{sheet:'a',row:0},m_bat:{sheet:'a',row:3},m_moss:{sheet:'b',row:0},m_ghost:{sheet:'b',row:3},m_spider:{sheet:'c',row:0},m_guard:{sheet:'c',row:3},m_wisp:{sheet:'d',row:0},m_mush:{sheet:'d',row:3}};
const ATLAS:Record<string,string>={arch:'adventure_arch_v2',detail:'adventure_detail_v2',old:'adventure_props',npc:'online_npcs_v1'};
const DIRECTION={down:0,left:1,right:2,up:3};
export function mountAdventureView(scene:any){
 const T=48,floor=scene.packet.adventure.floor,w=floor===2?13:C.width,h=floor===2?11:C.height;
 scene.cameras.main.setViewport(MAP_X,MAP_Y,MAP_W,MAP_H).setBounds(0,0,w*T,h*T).setBackgroundColor('#07101b');
 const ground=(x:number,y:number)=>floor===2?x>=1&&y>=1&&x<=11&&y<=9:C.rows[y]?.[x]==='.';
 const sightWall=(x:number,y:number)=>!ground(x,y)||floor===1&&C.gates.some(g=>x>=g.x&&x<g.x+g.w&&y>=g.y&&y<g.y+g.h&&(g.key==='both'?!['amber','violet'].every(k=>scene.packet.adventure.snapshot.keys.includes(k)):!scene.packet.adventure.snapshot.keys.includes(g.key)));
 const fog=scene.add.graphics().setDepth(1000).setName('party-sight-fog'),flow=scene.add.graphics().setDepth(32);let sightSignature='';
 const grid=scene.add.graphics().setDepth(-2),props=new Map<string,any>(),gates=new Map<string,any>(),enemies=new Map<string,any>(),numbers:any[]=[],danger=scene.add.graphics().setDepth(34),traps=scene.add.graphics().setDepth(-1);
 if(floor===1)drawMazeGround(scene);else for(let y=1;y<=9;y++)for(let x=1;x<=11;x++)scene.add.image((x+.5)*T,(y+.5)*T,'maze_floor',0).setDisplaySize(T,T).setDepth(-5);
 const mechanisms=floor===1?mountMazeMechanics(scene):undefined;
 if(floor===1){
  for(const b of BRIDGES)scene.add.image((b.x+b.w/2)*T,(b.y+b.h/2)*T,'adventure_bridges_v3',b.vertical?0:1).setDisplaySize((b.w+(b.vertical?.55:0))*T,(b.h+(b.vertical?0:.55))*T).setDepth(-1.9);
  for(const a of ADVENTURE_AREAS)scene.add.text((a.x+a.w/2)*T,(a.y+a.h-1.4)*T,`${a.label}  ${a.name}`,{fontFamily:'Meiryo',fontSize:'25px',color:'#f5e1ab',backgroundColor:'#041118cd',padding:{x:12,y:6}}).setOrigin(.5,0).setDepth(70);
  for(const p of SCENERY)scene.add.image((p.x+.5)*T,(p.y+1)*T,ATLAS[p.atlas],p.frame).setOrigin(.5,1).setDisplaySize(p.w*T,p.h*T).setDepth(p.ground?-1.8:p.y+.65);
  for(const g of C.gates){const p=g.visual;gates.set(g.id,scene.add.image((p.x+.5)*T,(p.y+1)*T,'adventure_props',2).setOrigin(.5,1).setDisplaySize(p.w*T,p.h*T).setDepth(p.y+.7));}
 }else{scene.add.text(6*T,2*T,'第2層への入口',{fontFamily:'Meiryo',fontSize:'23px',color:'#ffe4a1'}).setOrigin(.5);scene.add.text(6*T,3.2*T,'この先は今後追加予定です。\n入口クリスタルから町や到達済みの層へ移動できます。',{fontFamily:'Meiryo',fontSize:'14px',color:'#bdd6de',align:'center'}).setOrigin(.5);}
 const interactProps:any[]=floor===1?ADVENTURE_PROPS:[{id:'entry_crystal',frame:14,x:5,y:6,size:86,kind:'portal'}];
 for(const p of interactProps){
  const key=p.kind==='blessing'?'maze_fountain_'+(scene.packet.adventure.snapshot.fountainKind==='normal'?'healing':scene.packet.adventure.snapshot.fountainKind??'healing'):p.kind==='chest'?`online_chest_${p.chestType??'common'}`:ATLAS[p.atlas??'detail'],frame=p.kind==='chest'||p.kind==='blessing'?undefined:p.frame;
  const image=scene.add.image((p.x+.5)*T,(p.y+1)*T,key,frame).setOrigin(.5,1).setDisplaySize(p.w?p.w*T:p.size,p.h?p.h*T:p.size).setDepth(p.y+.8).setInteractive();props.set(p.id,image);
  image.on('pointerdown',(pointer:any,_x:any,_y:any,event:any)=>{event?.stopPropagation();if(!(pointer.rightButtonDown()||isTap(pointer))||scene.busy||scene.hud?.overlayMode!=='none')return;if(isTap(pointer))startTapAction(scene,{x:p.x,y:p.y,reach:1,run:()=>scene.interactAdventure(p.id)});else scene.interactAdventure(p.id);});image.on('pointerover',()=>scene.adventureHover=p.id);image.on('pointerout',()=>scene.adventureHover=undefined);
 }
 let signature='',warningSignature='',hp=scene.player.hp;const encounterClock=new EncounterClock();
 function hit(n:any){n.hitUntil=scene.time.now+220;scene.tweens.killTweensOf(n.body);n.body.setAngle(-5).setX(-3).setTint(0xffced5);scene.tweens.add({targets:n.body,angle:4,x:3,duration:45,yoyo:true,repeat:1,onComplete:()=>{if(n.body.active)n.body.setAngle(0).setX(0).clearTint();}});}
 function createEnemy(e:any){
  const mob=MOB_FRAMES[e.key],directional=e.boss||e.elite||mob,key=e.boss?'adventure_vesper_v2':e.elite?'adventure_guardians_v2':mob?'adventure_mobs_'+mob.sheet:e.key,size=e.boss?114:e.elite?82:54;
  const body=scene.add.image(0,0,key,directional?(e.elite?(e.id==='weaver'?4:0):(mob?.row??0)*4)+(DIRECTION[e.dir as keyof typeof DIRECTION]??0):undefined).setOrigin(.5,1).setDisplaySize(size,size).setInteractive();
  const shadow=scene.add.ellipse(0,-2,size*.45,8,0x000000,.25),bar=scene.add.graphics(),label=scene.add.text(0,-size-12,e.name,{fontFamily:'Meiryo',fontSize:e.boss?'14px':'10px',color:e.boss?'#ffceef':'#e4d9bd',stroke:'#081018',strokeThickness:3}).setOrigin(.5),root=scene.add.container((e.x+.5)*T,(e.y+.95)*T,[shadow,body,bar,label]).setDepth(e.y+.85).setName('adventure-enemy-'+e.id);
  const n={mob,key,root,body,bar,label,size,hp:e.hp,x:e.x,y:e.y,dir:e.dir??'down',moving:false,attackBeat:e.attackBeat??-1,hitUntil:0,dead:false,queue:[] as {x:number;y:number}[],stepTarget:undefined as {x:number;y:number}|undefined,stepping:false,stepDuration:480,lastFacing:e.dir??'down'};
  body.on('pointerdown',(pointer:any,_x:any,_y:any,event:any)=>{event?.stopPropagation();if(scene.busy||scene.hud?.overlayMode!=='none')return;const target=scene.packet.adventure.snapshot.enemies.find((m:any)=>m.id===e.id);if(!target||target.hp<=0)return;if(isTap(pointer)){scene.tapEnemy(target.x,target.y);return;}if(pointer.rightButtonDown()){const dx=target.x-scene.player.x,dy=target.y-scene.player.y;void scene.performAttack(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');}else{const choices=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:target.x+dx,y:target.y+dy})).filter(p=>!scene.blocked(p.x,p.y)&&!scene.enemyAt(p.x,p.y));choices.sort((a,b)=>Math.abs(a.x-scene.player.x)+Math.abs(a.y-scene.player.y)-Math.abs(b.x-scene.player.x)-Math.abs(b.y-scene.player.y));scene.destination=choices[0];}});return n;
 }
 function advanceEnemy(n:any){
  if(n.stepping||n.dead||!n.root.active)return;
  const next=n.queue.shift();if(!next){n.moving=false;n.dir=n.lastFacing;return;}
  n.stepTarget=next;n.stepping=true;n.moving=true;
  const dx=(next.x+.5)*T-n.root.x,dy=(next.y+.95)*T-n.root.y;n.dir=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
  scene.tweens.add({targets:n.root,x:(next.x+.5)*T,y:(next.y+.95)*T,duration:n.stepDuration,ease:'Linear',onComplete:()=>{n.stepping=false;n.stepTarget=undefined;advanceEnemy(n);}});
 }
 const turnText=scene.add.text(12,10,'',{fontFamily:'Meiryo',fontSize:'14px',color:'#e7f5ff',backgroundColor:'#102536ed',padding:{x:10,y:7}}).setScrollFactor(0).setDepth(2100),intentMarkers=scene.add.graphics().setDepth(38);
 const sync=()=>{const a=scene.packet.adventure;if(!a)return;const state=a.snapshot;encounterClock.observe(scene.packet.serverTime??state.simAtMs,scene.packet.clockReceivedAt??performance.now(),scene.packet.clockLatencyMs);const next=JSON.stringify(state);if(next===signature)return;signature=next;
  if(floor===1){
   for(const g of C.gates)gates.get(g.id)?.setVisible(!(g.key==='both'?state.keys.includes('amber')&&state.keys.includes('violet'):state.keys.includes(g.key)));
   for(const p of ADVENTURE_PROPS){const image=props.get(p.id);image?.setVisible(p.id!=='stairs'||state.stairs);if(p.kind==='chest')image?.setTexture(`online_chest_${state.goldChests?.includes(p.id)?'rare':'common'}${state.opened.includes(p.id)?'-open':''}`).setDisplaySize(43,43);}
   traps.clear();for(const web of state.webs??[]){traps.lineStyle(1,0xc8ebef,.6).strokeCircle((web.x+.5)*T,(web.y+.5)*T,T*.32).lineBetween(web.x*T+8,web.y*T+8,(web.x+1)*T-8,(web.y+1)*T-8).lineBetween(web.x*T+8,(web.y+1)*T-8,(web.x+1)*T-8,web.y*T+8);}if(!state.trapDisabled)for(const t of C.traps)traps.fillStyle(0xf94149,.2).fillRect(t.x*T,t.y*T,T,T);
   const warnings=JSON.stringify(state.telegraphs.map((warn:any)=>[warn.id,warn.source,warn.resolvesAt,warn.mode,warn.remaining,warn.tiles]));
   if(warnings!==warningSignature){warningSignature=warnings;danger.clear();for(const n of numbers)n.text.destroy();numbers.length=0;
    for(const warn of state.telegraphs)for(const t of warn.tiles){danger.fillStyle(0xe32b53,.4).fillRect(t.x*T+2,t.y*T+2,T-4,T-4).lineStyle(2,0xffd06b,.9).strokeRect(t.x*T+2,t.y*T+2,T-4,T-4);
     const deadline=warn.resolvesAt??encounterClock.now(performance.now())+(warn.remaining??3)*1000;
     const text=scene.add.text((t.x+.5)*T,(t.y+.5)*T,warn.mode==='turn'?`${warn.remaining}T`:telegraphLabel(deadline,encounterClock.now(performance.now())),{fontFamily:'Meiryo',fontSize:'17px',fontStyle:'bold',color:'#fff8cf',stroke:'#49132a',strokeThickness:4}).setOrigin(.5).setDepth(36);numbers.push({text,deadline,turns:warn.mode==='turn'?warn.remaining:undefined,lastLabel:''});
    }
   }
   for(const e of state.enemies){let n=enemies.get(e.id);if(e.hp<=0){if(n&&!n.dead){n.dead=true;n.queue=[];scene.tweens.killTweensOf(n.root);hit(n);scene.tweens.add({targets:n.root,alpha:0,duration:230,onComplete:()=>{n.root.destroy();enemies.delete(e.id);}});}continue;}if(!n){n=createEnemy(e);enemies.set(e.id,n);}if(n.dead)continue;
    n.root.setAlpha(e.hidden?.12:e.key==='m_ghost'&&!e.vulnerable?.4:1);n.lastFacing=e.dir??n.lastFacing;
    if(n.x!==e.x||n.y!==e.y){
     const start=n.stepTarget??{x:Math.round(n.root.x/T-.5),y:Math.round(n.root.y/T-.95)};
     const route=Math.abs(start.x-e.x)+Math.abs(start.y-e.y)===1?[{x:e.x,y:e.y}]:townPath(start,e,[],(x,y)=>scene.blocked(x,y));
     if(route.length&&route.length<=8){n.queue=route;n.stepDuration=enemyMoveDuration(e.moveIntervalMs,route.length);advanceEnemy(n);}
     else if(!n.stepping){n.root.setPosition((e.x+.5)*T,(e.y+.95)*T);n.moving=false;}
     n.x=e.x;n.y=e.y;
    }else if(!n.moving)n.dir=n.lastFacing;
    if(e.hp<n.hp)hit(n);n.hp=e.hp;if((e.attackBeat??-1)>n.attackBeat){n.attackBeat=e.attackBeat;if(e.rangedAttack){const target=scene.packet.players.find((p:any)=>p.character_id===e.target);if(target){const bolt=scene.add.circle(n.root.x,n.root.y-18,5,0x9ce6ff).setDepth(35);scene.tweens.add({targets:bolt,x:(target.x+.5)*T,y:(target.y+.5)*T,duration:175,onComplete:()=>bolt.destroy()});}}if(n.hitUntil<scene.time.now){scene.tweens.killTweensOf(n.body);scene.tweens.add({targets:n.body,angle:n.dir==='left'?-12:12,duration:75,yoyo:true,onComplete:()=>n.body.active&&n.body.setAngle(0)});}}
    const bw=e.boss?100:e.elite?64:38;n.bar.clear().fillStyle(0x21121e,.95).fillRect(-bw/2,-n.size,bw,5).fillStyle(e.boss?0xe775ce:0xb5d26e).fillRect(-bw/2,-n.size,bw*e.hp/e.max,5);
   }
  }
  if(scene.player.hp<hp)scene.log(`敵の攻撃で${hp-scene.player.hp}ダメージ。`);hp=scene.player.hp;
 };
 sync();return{sync,update(){mechanisms?.update();const now=encounterClock.now(performance.now());const turn=scene.bossPlanning?scene.packet.adventure.snapshot.turn:undefined;turnText.setVisible(!!turn);if(turn)turnText.setText(`共通ターン ${turn.number} · ${Math.max(0,(turn.deadline-now)/1000).toFixed(1)}秒\n${scene.packet.adventure.intent?'選択済み · 締切まで変更できます':'移動・攻撃を1手選ぶ · 未入力は待機'}`);intentMarkers.clear();for(const intent of scene.packet.adventure.intents??[]){if(intent.action==='move'&&intent.payload.x!==undefined&&intent.payload.y!==undefined)intentMarkers.lineStyle(3,intent.characterId===scene.packet.active?.id?0x63cfff:0x81e7ac,.95).strokeRect(intent.payload.x*T+4,intent.payload.y*T+4,T-8,T-8);}for(const n of numbers){const label=n.turns!==undefined?`${n.turns}T`:telegraphLabel(n.deadline,now);if(label!==n.lastLabel){n.text.setText(label);n.lastLabel=label;}}const allies=scene.packet.players,cinematic=scene.packet.adventure.snapshot.bossEncounter?.phase==='opening'&&scene.player.x>=41&&scene.player.x<=58&&scene.player.y>=3&&scene.player.y<=22,canSee=(x:number,y:number)=>cinematic&&x>=41&&x<=58&&y>=3&&y<=22||partyCanSee(x,y,allies,radius,sightWall,scene.packet.adventure.snapshot),radius=partySightRadius(scene.packet.adventure.snapshot),sig=JSON.stringify([cinematic,radius,scene.packet.adventure.snapshot.lightTurns,scene.packet.adventure.snapshot.keys,allies.map((p:any)=>[p.x,p.y])]);if(sig!==sightSignature){sightSignature=sig;fog.clear().fillStyle(0x030912,1);for(let y=0;y<h;y++){let x=0;while(x<w){if(canSee(x,y)){x++;continue;}const start=x;while(x<w&&!canSee(x,y))x++;fog.fillRect(start*T,y*T,(x-start)*T+.5,T+.5);}}}for(const p of interactProps){const image=props.get(p.id);if(image?.input)image.input.enabled=partyCanSee(p.x,p.y,allies,radius,sightWall,scene.packet.adventure.snapshot);if(scene.adventureHover===p.id&&!partyCanSee(p.x,p.y,allies,radius,sightWall,scene.packet.adventure.snapshot))scene.adventureHover=undefined;}flow.clear();if(floor===1){const falls=[...SCENERY.filter(p=>p.atlas==='arch'&&p.frame===6).map(p=>({x:(p.x+.5)*T,y:(p.y+1)*T,h:p.h*T*.7})),...ADVENTURE_PROPS.filter(p=>p.id==='spring'||p.id==='fountain').map(p=>({x:(p.x+.5)*T,y:(p.y+1)*T,h:p.h*T*.7}))];for(const f of falls){for(let i=0;i<8;i++){const dy=(scene.time.now*.14+i*f.h/8)%f.h;flow.lineStyle(1.4,0xc2fffa,.2+(i%3)*.12).lineBetween(f.x-6+(i%3)*5,f.y-f.h+dy,f.x-6+(i%3)*5,f.y-f.h+Math.min(f.h,dy+16));}flow.lineStyle(1,0x9ff9ff,.25).strokeEllipse(f.x,f.y-4,14+(scene.time.now*.04)%22,4);}}for(const [id,n]of enemies){if(n.dead)continue;const visible=partyCanSee(n.x,n.y,allies,radius,sightWall,scene.packet.adventure.snapshot);n.root.setVisible(visible).setDepth(n.root.y/T-.1);if(n.body.input)n.body.input.enabled=visible;if(!visible)continue;const direction=DIRECTION[n.dir as keyof typeof DIRECTION]??0;if(id==='vesper')n.body.setFrame(direction+(n.moving?(1+Math.floor(scene.time.now/100)%2)*4:0));else if(id==='guardian'||id==='weaver')n.body.setFrame((id==='weaver'?4:0)+direction);else if(n.mob)n.body.setFrame(n.mob.row*4+direction+(n.moving?(1+Math.floor(scene.time.now/100)%2)*4:0));if(n.hitUntil<scene.time.now)n.body.y=n.moving?-Math.abs(Math.sin(scene.time.now*.02))*2:Math.sin(scene.time.now*.003+id.length)*.6;}if(scene.packet.adventure?.snapshot.telegraphs.length)danger.setAlpha(.75+Math.sin(scene.time.now*.012)*.2);},destroy(){mechanisms?.destroy();}};
}
