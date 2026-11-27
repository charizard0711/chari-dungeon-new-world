import {mountEffectPanels} from './effectPanels';
import {mountBossCinematic} from './bossCinematic';
import {bossStage,inStage} from './stage';
import {streamTerrain,TERRAIN_CHUNK} from './terrainChunks';
import {drawContinuousWalls} from './continuousWalls';
import {ADVENTURE_CONFIG as C} from './layout';
import {terrainFrame} from './scenery';
import {townSoundLevel} from '../presentation';
const T=48;
export function drawMazeGround(scene:any){
 const floor=scene.make.image({x:0,y:0,key:'maze_floor',add:false}).setOrigin(0).setDisplaySize(T,T);
 const arena=bossStage(scene.packet.adventure);const ground=(x:number,y:number)=>inStage(arena,x,y)&&C.rows[y]?.[x]==='.';
 streamTerrain(scene,C.width,C.height,(cx,cy)=>{
 const rt=scene.add.renderTexture(cx*T,cy*T,TERRAIN_CHUNK*T,TERRAIN_CHUNK*T).setOrigin(0).setDepth(-5);
 rt.beginDraw();for(let y=cy;y<Math.min(cy+TERRAIN_CHUNK,C.height);y++)for(let x=cx;x<Math.min(cx+TERRAIN_CHUNK,C.width);x++){
 if(x>=94&&x<=97&&y>=36&&y<=37)continue;
 if(ground(x,y)){floor.setFrame(terrainFrame(undefined,x,y));rt.batchDraw(floor,(x-cx)*T,(y-cy)*T);}}
 rt.endDraw();return rt;});
 scene.events.once('shutdown',()=>floor.destroy());drawContinuousWalls(scene);const a=C.boss.approach,g=scene.add.graphics().setDepth(-4.8);g.lineStyle(2,0xd8b56d,.9).lineBetween(a.x*T+5,a.y*T+2,a.x*T+5,(a.y+a.h)*T-2).lineBetween((a.x+a.w)*T-5,a.y*T+2,(a.x+a.w)*T-5,(a.y+a.h)*T-2);for(let y=a.y;y<a.y+a.h;y++)g.lineStyle(1,0xf2d38f,.7).strokeRect(a.x*T+11,y*T+10,a.w*T-22,T-20);
}
export function mountMazeMechanics(scene:any){
 const cinematic=mountBossCinematic(scene),panels=mountEffectPanels(scene);
 const g=scene.add.graphics().setDepth(-1),bars=scene.add.graphics().setDepth(27),emerging=scene.add.image(50.5*T,5*T,'vesper_greatsword',0).setOrigin(.5,.9).setDisplaySize(138,151).setDepth(26).setVisible(false);
 const cageOpen=scene.add.image(50.5*T,6*T,'maze_cage_open').setOrigin(.5,1).setDisplaySize(3.4*T,3.4*T).setDepth(25),cageClosed=scene.add.image(50.5*T,6*T,'maze_cage_closed').setOrigin(.5,1).setDisplaySize(3.4*T,3.4*T).setDepth(27);
 const buff=scene.add.text(12,75,'',{fontFamily:'Meiryo',fontSize:'14px',color:'#ceffe1',backgroundColor:'#16382ee8',padding:{x:8,y:7}}).setScrollFactor(0).setDepth(2101),notice=scene.add.text(12,125,'',{fontFamily:'Meiryo',fontSize:'13px',color:'#ffe8ad',backgroundColor:'#15202ce0',padding:{x:8,y:7}}).setScrollFactor(0).setDepth(2101);
 let lastBridge='',lastBoss='',initial=true;
 function motor(x:number,y:number){if(Math.abs(scene.player.x-x)+Math.abs(scene.player.y-y)>12)return;const volume=townSoundLevel(scene.registry.get('onlineAudio'),scene.sound.mute,scene.game.config.audio.noAudio||new URLSearchParams(location.search).get('mute')==='1','equip');if(volume>0)scene.sound.play('maze_motor',{volume});}
 return {update(){const a=scene.packet.adventure;if(!a||a.floor!==1)return;const s=a.snapshot,bridge=s.bridge??{phase:'down',at:0},boss=s.bossEncounter??{phase:'waiting',at:0};const now=(scene.packet.serverTime??Date.now())+performance.now()-(scene.packet.clockReceivedAt??performance.now());
  if(!initial&&bridge.phase!==lastBridge)motor(92,39);if(!initial&&boss.phase!==lastBoss&&['opening','returning'].includes(boss.phase))motor(50,7);lastBridge=bridge.phase;lastBoss=boss.phase;initial=false;
  g.clear();bars.clear();if(!bossStage(a)){g.fillStyle(0x030710).fillRect(94*T,36*T,4*T,2*T);
  const raised=bridge.phase==='up'?1:bridge.phase==='rising'?Math.min(1,Math.max(0,(now-bridge.at)/1200)):Math.max(0,1-(now-bridge.at)/800);
  if(raised>0)for(let y=36;y<=37;y++)for(let x=94;x<=97;x++){g.fillStyle(0x65777c,raised).fillRect(x*T+2,y*T+(1-raised)*T+2,T-4,(T-4)*raised).lineStyle(2,0xc0a66c,raised).strokeRect(x*T+2,y*T+(1-raised)*T+2,T-4,(T-4)*raised);}
  g.fillStyle(bridge.phase==='down'?0x354759:0x5ddcca).fillRect(92*T+5,39*T+5,T-10,T-10).lineStyle(3,0xf1d48b).strokeRect(92*T+5,39*T+5,T-10,T-10);
  }const arena=bossStage(a);const phase=boss.phase;cinematic.update();panels.update();const n=boss.padCount??0;for(let i=0;arena&&i<n;i++){const x=(47+i*2)*T,y=15*T;g.fillStyle(0x5ddedb,.25+Math.sin(scene.time.now*.005)*.12).fillRect(x+3,y+3,T-6,T-6).lineStyle(2,0xa1fff1).strokeRect(x+3,y+3,T-6,T-6);}
  const opening=phase==='opening'?Math.min(1,(now-boss.at)/1600):phase==='returning'?1-Math.min(1,(now-boss.at)/1600):['battle','cleared'].includes(phase)?1:0;
  cageClosed.setVisible(arena).setAlpha(1-opening);cageOpen.setVisible(arena).setAlpha(opening);
  emerging.setVisible(arena&&phase==='returning');if(emerging.visible)emerging.setPosition(50.5*T,(5+Math.max(0,Math.min(1,phase==='opening'?(now-boss.at-900)/1700:1-(now-boss.at)/1800))*5)*T);
  if(['opening','battle','returning'].includes(phase)){const rear=C.boss.rear;bars.fillStyle(0x342934).fillRect(rear.x*T,rear.y*T,rear.w*T,T);bars.lineStyle(4,0xd3b57d);for(let x=rear.x*T+6;x<(rear.x+rear.w)*T;x+=12)bars.lineBetween(x,rear.y*T,x,(rear.y+1)*T);bars.fillStyle(0x342934).fillRect(49*T,23*T,2*T,T);bars.lineStyle(4,0xd3b57d);for(let x=49*T+6;x<51*T;x+=12)bars.lineBetween(x,23*T,x,24*T);}
  buff.setVisible(false);
  const inBoss=scene.player.x>=41&&scene.player.x<=58&&scene.player.y>=3&&scene.player.y<=24,nearBridge=scene.player.x>=89&&scene.player.x<=104&&scene.player.y>=32&&scene.player.y<=41;
  notice.setVisible(inBoss||nearBridge).setText(inBoss?(phase==='waiting'?'全員が別々の光る床に乗ると開始':phase==='opening'?'封印の檻が開く…':phase==='battle'?'ボス戦中：出口は封鎖されています':phase==='returning'?'全滅：守護者が檻へ戻る…':'討伐成功：出口を開放しました'):(bridge.phase==='down'?'別の仲間に右のパネルを踏んでもらおう':bridge.phase==='rising'?'道がせり上がっています…':'道・宝物室に仲間がいる間は道を保持します'));
 },destroy(){panels.destroy();cinematic.destroy();cageOpen.destroy();cageClosed.destroy();g.destroy();bars.destroy();emerging.destroy();buff.destroy();notice.destroy();}};
}
