import {ADVENTURE_CONFIG as C} from './layout';
import {terrainFrame} from './scenery';
import {townSoundLevel} from '../presentation';
const T=48;
export function drawMazeGround(scene:any){
 const floor=scene.add.image(0,0,'maze_floor').setOrigin(0).setDisplaySize(T,T).setVisible(false),wall=scene.add.image(0,0,'adventure_wall').setOrigin(0).setDisplaySize(T,T).setVisible(false),royal=scene.add.image(0,0,'maze_boss_wall').setOrigin(0).setDisplaySize(T,T).setVisible(false);
 const ground=(x:number,y:number)=>C.rows[y]?.[x]==='.';
 for(let cy=0;cy<C.height;cy+=16)for(let cx=0;cx<C.width;cx+=16){const rt=scene.add.renderTexture(cx*T,cy*T,16*T,16*T).setOrigin(0).setDepth(-5);for(let y=cy;y<Math.min(cy+16,C.height);y++)for(let x=cx;x<Math.min(cx+16,C.width);x++){
  if(x>=94&&x<=97&&y>=36&&y<=37)continue;
  if(ground(x,y)){floor.setFrame(terrainFrame(undefined,x,y));rt.draw(floor,(x-cx)*T,(y-cy)*T);}
  else if([-1,0,1].some(dy=>[-1,0,1].some(dx=>ground(x+dx,y+dy))))rt.draw(x>=40&&x<=59&&y>=2&&y<=23?royal:wall,(x-cx)*T,(y-cy)*T);
 }}floor.destroy();wall.destroy();royal.destroy();
}
export function mountMazeMechanics(scene:any){
 const g=scene.add.graphics().setDepth(-1),bars=scene.add.graphics().setDepth(27),emerging=scene.add.image(50.5*T,5*T,'adventure_vesper_v2',0).setDisplaySize(114,114).setDepth(26).setVisible(false);
 const buff=scene.add.text(12,75,'',{fontFamily:'Meiryo',fontSize:'14px',color:'#ceffe1',backgroundColor:'#16382ee8',padding:{x:8,y:7}}).setScrollFactor(0).setDepth(2101),notice=scene.add.text(12,125,'',{fontFamily:'Meiryo',fontSize:'13px',color:'#ffe8ad',backgroundColor:'#15202ce0',padding:{x:8,y:7}}).setScrollFactor(0).setDepth(2101);
 let lastBridge='',lastBoss='',initial=true;
 function motor(x:number,y:number){if(Math.abs(scene.player.x-x)+Math.abs(scene.player.y-y)>12)return;const volume=townSoundLevel(scene.registry.get('onlineAudio'),scene.sound.mute,scene.game.config.audio.noAudio||new URLSearchParams(location.search).get('mute')==='1','equip');if(volume>0)scene.sound.play('maze_motor',{volume});}
 return {update(){const a=scene.packet.adventure;if(!a||a.floor!==1)return;const s=a.snapshot,bridge=s.bridge??{phase:'down',at:0},boss=s.bossEncounter??{phase:'waiting',at:0};const now=(scene.packet.serverTime??Date.now())+performance.now()-(scene.packet.clockReceivedAt??performance.now());
  if(!initial&&bridge.phase!==lastBridge)motor(92,39);if(!initial&&boss.phase!==lastBoss&&['opening','returning'].includes(boss.phase))motor(50,7);lastBridge=bridge.phase;lastBoss=boss.phase;initial=false;
  g.clear();bars.clear();g.fillStyle(0x030710).fillRect(94*T,36*T,4*T,2*T);
  const raised=bridge.phase==='up'?1:bridge.phase==='rising'?Math.min(1,Math.max(0,(now-bridge.at)/1200)):Math.max(0,1-(now-bridge.at)/800);
  if(raised>0)for(let y=36;y<=37;y++)for(let x=94;x<=97;x++){g.fillStyle(0x65777c,raised).fillRect(x*T+2,y*T+(1-raised)*T+2,T-4,(T-4)*raised).lineStyle(2,0xc0a66c,raised).strokeRect(x*T+2,y*T+(1-raised)*T+2,T-4,(T-4)*raised);}
  g.fillStyle(bridge.phase==='down'?0x354759:0x5ddcca).fillRect(92*T+5,39*T+5,T-10,T-10).lineStyle(3,0xf1d48b).strokeRect(92*T+5,39*T+5,T-10,T-10);
  const phase=boss.phase;if(phase==='opening'){scene.cameras.main.stopFollow();scene.cameras.main.centerOn(50.5*T,8*T);}const n=boss.padCount??0;for(let i=0;i<n;i++){const x=(47+i*2)*T,y=15*T;g.fillStyle(0x5ddedb,.25+Math.sin(scene.time.now*.005)*.12).fillRect(x+3,y+3,T-6,T-6).lineStyle(2,0xa1fff1).strokeRect(x+3,y+3,T-6,T-6);}
  const opening=phase==='opening'?Math.min(1,(now-boss.at)/1600):phase==='returning'?1-Math.min(1,(now-boss.at)/1600):['battle','cleared'].includes(phase)?1:0;
  bars.fillStyle(0x060911).fillRect(49*T,3*T,3*T,3*T).lineStyle(5,0xb49a60).strokeRect(49*T,3*T,3*T,3*T);
  bars.lineStyle(4,0x9eabba);for(let x=49*T+10;x<52*T;x+=16)if(opening<1)bars.lineBetween(x,3*T,x,(6-opening*3)*T);
  emerging.setVisible(['opening','returning'].includes(phase));if(emerging.visible)emerging.setPosition(50.5*T,(5+Math.max(0,Math.min(1,phase==='opening'?(now-boss.at-900)/1700:1-(now-boss.at)/1800))*5)*T);
  if(['opening','battle','returning'].includes(phase)){bars.fillStyle(0x342934).fillRect(49*T,23*T,2*T,T);bars.lineStyle(4,0xd3b57d);for(let x=49*T+6;x<51*T;x+=12)bars.lineBetween(x,23*T,x,24*T);}
  const multiplier=s.fountainBuffs?.[scene.packet.active?.id]??1;buff.setText(multiplier>1?`✧ 泉の祝福　攻撃・防御 ×${multiplier}\nフロアクリアまで`:'').setVisible(multiplier>1);
  const inBoss=scene.player.x>=41&&scene.player.x<=58&&scene.player.y>=3&&scene.player.y<=24,nearBridge=scene.player.x>=89&&scene.player.x<=104&&scene.player.y>=32&&scene.player.y<=41;
  notice.setVisible(inBoss||nearBridge).setText(inBoss?(phase==='waiting'?'全員が別々の光る床に乗ると開始':phase==='opening'?'封印の檻が開く…':phase==='battle'?'ボス戦中：出口は封鎖されています':phase==='returning'?'全滅：守護者が檻へ戻る…':'討伐成功：出口を開放しました'):(bridge.phase==='down'?'別の仲間に右のパネルを踏んでもらおう':bridge.phase==='rising'?'道がせり上がっています…':'道・宝物室に仲間がいる間は道を保持します'));
 },destroy(){g.destroy();bars.destroy();emerging.destroy();buff.destroy();notice.destroy();}};
}
