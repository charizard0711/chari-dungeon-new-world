import {ADVENTURE_CONFIG as C,ADVENTURE_AREAS,ADVENTURE_PROPS,adventureAreaAt} from './layout';
import {SCENERY,terrainFrame} from './scenery';
import {MAP_X,MAP_Y,MAP_W,MAP_H} from '../../layout';
import {townPath} from '../gridPath';
const DIRECTION={down:0,left:1,right:2,up:3};
export function mountAdventureView(scene:any){
 const T=48,floor=scene.packet.adventure.floor,w=floor===2?13:C.width,h=floor===2?11:C.height;
 scene.cameras.main.setViewport(MAP_X,MAP_Y,MAP_W,MAP_H).setBounds(0,0,w*T,h*T).setBackgroundColor('#07101b');
 const ground=(x:number,y:number)=>floor===2?x>=1&&y>=1&&x<=11&&y<=9:C.rows[y]?.[x]==='.';
 const grid=scene.add.graphics().setDepth(-2),props=new Map<string,any>(),gates=new Map<string,any>(),enemies=new Map<string,any>(),numbers:any[]=[],danger=scene.add.graphics().setDepth(34),traps=scene.add.graphics().setDepth(-1);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(!ground(x,y)&&x%3===0&&[[0,-1],[1,-1],[2,-1],[0,1],[1,1],[2,1]].some(([dx,dy])=>ground(x+dx,y+dy)))scene.add.image((x+1.5)*T,(y+1.3)*T,'adventure_arch_v2',0).setDisplaySize(3.3*T,2.8*T).setDepth(-8);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(ground(x,y)){scene.add.image((x+.5)*T,(y+.5)*T,'adventure_floor_v2',floor===2?11:terrainFrame(adventureAreaAt(x,y)?.id,x,y)).setDisplaySize(T+.4,T+.4).setDepth(-5);grid.lineStyle(1,0x142128,.32).strokeRect(x*T,y*T,T,T);}
 if(floor===1){
  for(const a of ADVENTURE_AREAS)scene.add.text((a.x+a.w/2)*T,(a.y+.2)*T,a.name,{fontFamily:'Meiryo',fontSize:'14px',color:'#eddbab',stroke:'#0a1720',strokeThickness:4}).setOrigin(.5).setDepth(1);
  for(const p of SCENERY)scene.add.image((p.x+.5)*T,(p.y+1)*T,p.atlas==='detail'?'adventure_detail_v2':'adventure_arch_v2',p.frame).setOrigin(.5,1).setDisplaySize(p.w*T,p.h*T).setDepth(p.ground?-3:p.y+.65);
  for(const g of C.gates)gates.set(g.id,scene.add.image((g.x+.5)*T,(g.y+g.h)*T,'adventure_props',2).setOrigin(.5,1).setDisplaySize(Math.max(2,g.w)*T,Math.max(3,g.h)*T).setDepth(g.y+.7));
 }else{scene.add.text(6*T,2*T,'第2層への入口',{fontFamily:'Meiryo',fontSize:'23px',color:'#ffe4a1'}).setOrigin(.5);scene.add.text(6*T,3.2*T,'この先は今後追加予定です。\n入口クリスタルから町や到達済みの層へ移動できます。',{fontFamily:'Meiryo',fontSize:'14px',color:'#bdd6de',align:'center'}).setOrigin(.5);}
 const interactProps=floor===1?ADVENTURE_PROPS:[{id:'entry_crystal',frame:14,x:5,y:6,size:86,kind:'portal'}];
 for(const p of interactProps){
  const key=p.id==='entry_crystal'?'adventure_detail_v2':p.kind==='chest'?`online_chest_${p.id==='treasure'?'rare':'common'}`:p.id==='spring'||p.id==='fountain'?'adventure_arch_v2':p.frame<0?'online_npcs_v1':'adventure_props',frame=p.id==='entry_crystal'?14:p.kind==='chest'?undefined:p.id==='spring'||p.id==='fountain'?6:p.frame<0?4:p.frame;
  const image=scene.add.image((p.x+.5)*T,(p.y+1)*T,key,frame).setOrigin(.5,1).setDisplaySize(p.kind==='chest'?43:p.id==='spring'||p.id==='fountain'?150:p.size,p.kind==='chest'?43:p.id==='spring'||p.id==='fountain'?210:p.size).setDepth(p.y+.8).setInteractive();props.set(p.id,image);
  image.on('pointerdown',(pointer:any,_x:any,_y:any,event:any)=>{event?.stopPropagation();if(!pointer.rightButtonDown()||scene.busy||scene.hud?.overlayMode!=='none')return;void scene.action('interact',{id:p.id}).then(()=>{if(p.id==='entry_crystal')scene.hud?.townUI?.openBoard();else if(p.kind==='chest')scene.log(p.id==='treasure'?'金の宝箱を開けました。':'宝箱を開けました。');else if(p.kind==='merchant')scene.log('ポーションを20Gで購入しました。');else if(p.kind==='heal')scene.log('体力が回復しました。');}).catch((e:Error)=>scene.log(e.message));});image.on('pointerover',()=>scene.adventureHover=p.id);image.on('pointerout',()=>scene.adventureHover=undefined);
 }
 let signature='',hp=scene.player.hp;
 function hit(n:any){n.hitUntil=scene.time.now+220;scene.tweens.killTweensOf(n.body);n.body.setAngle(-5).setX(-3).setTint(0xffced5);scene.tweens.add({targets:n.body,angle:4,x:3,duration:45,yoyo:true,repeat:1,onComplete:()=>{if(n.body.active)n.body.setAngle(0).setX(0).clearTint();}});}
 function createEnemy(e:any){
  const directional=e.boss||e.elite,key=e.boss?'adventure_vesper_v2':e.elite?'adventure_guardians_v2':e.key,size=e.boss?114:e.elite?82:54;
  const body=scene.add.image(0,0,key,directional?(e.id==='weaver'?4:0)+(DIRECTION[e.dir as keyof typeof DIRECTION]??0):undefined).setOrigin(.5,1).setDisplaySize(size,size).setInteractive();
  const shadow=scene.add.ellipse(0,-2,size*.45,8,0x000000,.25),bar=scene.add.graphics(),label=scene.add.text(0,-size-12,e.name,{fontFamily:'Meiryo',fontSize:e.boss?'14px':'10px',color:e.boss?'#ffceef':'#e4d9bd',stroke:'#081018',strokeThickness:3}).setOrigin(.5),root=scene.add.container((e.x+.5)*T,(e.y+.95)*T,[shadow,body,bar,label]).setDepth(e.y+.85).setName('adventure-enemy-'+e.id);
  const n={root,body,bar,label,size,hp:e.hp,x:e.x,y:e.y,dir:e.dir??'down',moving:false,attackBeat:e.attackBeat??-1,hitUntil:0,dead:false};
  body.on('pointerdown',(pointer:any,_x:any,_y:any,event:any)=>{event?.stopPropagation();if(scene.busy||scene.hud?.overlayMode!=='none')return;const target=scene.packet.adventure.snapshot.enemies.find((m:any)=>m.id===e.id);if(!target||target.hp<=0)return;if(pointer.rightButtonDown()){const dx=target.x-scene.player.x,dy=target.y-scene.player.y;void scene.performAttack(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');}else{const choices=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:target.x+dx,y:target.y+dy})).filter(p=>!scene.blocked(p.x,p.y)&&!scene.enemyAt(p.x,p.y));choices.sort((a,b)=>Math.abs(a.x-scene.player.x)+Math.abs(a.y-scene.player.y)-Math.abs(b.x-scene.player.x)-Math.abs(b.y-scene.player.y));scene.destination=choices[0];}});return n;
 }
 const sync=()=>{const a=scene.packet.adventure;if(!a)return;const state=a.snapshot,next=JSON.stringify(state);if(next===signature)return;signature=next;
  if(floor===1){
   for(const g of C.gates)gates.get(g.id)?.setVisible(!state.keys.includes(g.key));
   for(const p of ADVENTURE_PROPS){const image=props.get(p.id);image?.setVisible(p.id!=='stairs'||state.stairs);if(p.kind==='chest')image?.setTexture(`online_chest_${p.id==='treasure'?'rare':'common'}${state.opened.includes(p.id)?'-open':''}`).setDisplaySize(43,43);}
   traps.clear();if(!state.trapDisabled)for(const t of C.traps)traps.fillStyle(0xf94149,.2).fillRect(t.x*T,t.y*T,T,T);
   danger.clear();for(const n of numbers)n.destroy();numbers.length=0;for(const warn of state.telegraphs)for(const t of warn.tiles){danger.fillStyle(0xe32b53,.4).fillRect(t.x*T+2,t.y*T+2,T-4,T-4).lineStyle(2,0xffd06b,.9).strokeRect(t.x*T+2,t.y*T+2,T-4,T-4);numbers.push(scene.add.text((t.x+.5)*T,(t.y+.5)*T,String(warn.remaining??3),{fontFamily:'Meiryo',fontSize:'19px',fontStyle:'bold',color:'#fff8cf',stroke:'#49132a',strokeThickness:4}).setOrigin(.5).setDepth(36));}
   for(const e of state.enemies){let n=enemies.get(e.id);if(e.hp<=0){if(n&&!n.dead){n.dead=true;hit(n);scene.tweens.add({targets:n.root,alpha:0,duration:230,onComplete:()=>{n.root.destroy();enemies.delete(e.id);}});}continue;}if(!n){n=createEnemy(e);enemies.set(e.id,n);}if(n.dead)continue;
    if(n.x!==e.x||n.y!==e.y){const route=townPath({x:Math.round(n.root.x/T-.5),y:Math.round(n.root.y/T-.95)},e,[],(x,y)=>scene.blocked(x,y));scene.tweens.killTweensOf(n.root);n.moving=true;const waypoints=route.length&&route.length<=8?route:[{x:e.x,y:e.y}];let i=0;const step=()=>{if(!n.root.active||n.dead)return;const p=waypoints[i++];if(!p){n.moving=false;return;}const dx=(p.x+.5)*T-n.root.x,dy=(p.y+.95)*T-n.root.y;n.dir=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';scene.tweens.add({targets:n.root,x:(p.x+.5)*T,y:(p.y+.95)*T,duration:Math.max(70,150/waypoints.length),ease:'Linear',onComplete:step});};step();n.x=e.x;n.y=e.y;}else if(!n.moving)n.dir=e.dir??n.dir;n.root.setDepth(e.y+.85);
    if(e.hp<n.hp)hit(n);n.hp=e.hp;if((e.attackBeat??-1)>n.attackBeat){n.attackBeat=e.attackBeat;if(n.hitUntil<scene.time.now){scene.tweens.killTweensOf(n.body);scene.tweens.add({targets:n.body,angle:n.dir==='left'?-12:12,duration:75,yoyo:true,onComplete:()=>n.body.active&&n.body.setAngle(0)});}}
    const bw=e.boss?100:e.elite?64:38;n.bar.clear().fillStyle(0x21121e,.95).fillRect(-bw/2,-n.size,bw,5).fillStyle(e.boss?0xe775ce:0xb5d26e).fillRect(-bw/2,-n.size,bw*e.hp/e.max,5);
   }
  }
  if(scene.player.hp<hp)scene.log(`敵の攻撃で${hp-scene.player.hp}ダメージ。`);hp=scene.player.hp;
 };
 sync();return{sync,update(){for(const [id,n]of enemies){if(n.dead)continue;const direction=DIRECTION[n.dir as keyof typeof DIRECTION]??0;if(id==='vesper')n.body.setFrame(direction+(n.moving?(1+Math.floor(scene.time.now/100)%2)*4:0));else if(id==='guardian'||id==='weaver')n.body.setFrame((id==='weaver'?4:0)+direction);if(n.hitUntil<scene.time.now)n.body.y=n.moving?-Math.abs(Math.sin(scene.time.now*.02))*2:Math.sin(scene.time.now*.003+id.length)*.6;}if(scene.packet.adventure?.snapshot.telegraphs.length)danger.setAlpha(.75+Math.sin(scene.time.now*.012)*.2);},destroy(){}};
}
