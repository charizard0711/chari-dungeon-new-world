import Phaser from 'phaser';
import {houses,props,ground,blocked,TILE as T,MIN_X,MAX_X,MIN_Y,MAX_Y,type Point} from './map';
import {townPath} from '../online/gridPath';
import {plazaObjects} from './plaza';
import {CharacterRig} from '../online/characterRig';
import {PLAYER_WALK_FRAMES,playerFrameIndex} from '../playerAppearance';
import type {Dir} from '../types';
import './style.css';

document.body.innerHTML=`<header><div><small>CHARI DUNGEON: ZERO</small><h1>花と石畳の町</h1></div><span class="badge">操作できるローカルデモ · 無音</span><nav><button id="overview" class="selected">全体を見る</button><button id="plazaView">広場を見る</button><button id="walk">歩いて見る</button><button id="plaza">中央広場へ</button><button id="grid">マスを表示</button></nav></header><main id="stage"><div id="loading">町のパーツを読み込んでいます…</div></main><footer><span id="status">クリックで移動 · 矢印 / WASDで歩く · マウスホイールで拡大縮小</span><span>住宅 12軒 / 庭・塀・門に当たり判定あり</span></footer><dialog id="detail"><button id="close">閉じる ×</button><h2></h2><p></p><small>町の見た目と道幅を確認するデモです。購入・サーバー保存は行いません。</small></dialog>`;
const el=(id:string)=>document.getElementById(id)!;
const W=(MAX_X-MIN_X+1)*T,H=(MAX_Y-MIN_Y+1)*T;
class TownDemo extends Phaser.Scene{
 body!:Phaser.GameObjects.Image;rig!:CharacterRig;shadow!:Phaser.GameObjects.Ellipse;cursor!:Phaser.GameObjects.Rectangle;grid!:Phaser.GameObjects.Graphics;
 position:Point={x:12,y:14};path:Point[]=[];moving=false;dir:Dir='down';stepStart=0;keys!:Record<string,Phaser.Input.Keyboard.Key>;overview=true;
 constructor(){super('TownGardenDemo');}
 preload(){
  for(const k of ['estate','barber','lottery','market'])this.load.image(k,`assets/online/town-services-v1/${k}.png`);
  this.load.on('progress',(v:number)=>el('loading').textContent=`町のパーツを読み込んでいます… ${Math.round(v*100)}%`);
  for(let i=0;i<12;i++)this.load.image('house'+i,`assets/online/town-garden-v2/house-${i}.webp`);
  for(const k of ['wallH','wallV','post','gate','oak','cypress','shrub','flowers','lamp','bench','statue','banner'])this.load.image(k,`assets/online/town-garden-v2/${k}.webp`);
  for(let i=0;i<6;i++)this.load.image('tile'+i,`assets/online/town-garden-v2/tile-${i}.webp`);
  this.load.image('coolPaving','assets/online/town-garden-v2/cool-paving-v1.png');
  this.load.spritesheet('floor','assets/terrain/ruins-floor-v1/1.png',{frameWidth:64,frameHeight:64});
  this.load.spritesheet('oldprops','assets/online/town-props-v2.png',{frameWidth:512,frameHeight:512});
  this.load.spritesheet('npcs','assets/online/warehouse-v1/npcs.webp',{frameWidth:128,frameHeight:128});
  this.load.spritesheet('player_male_leather','assets/characters/smooth-walk-v1/male-leather.webp',{frameWidth:96,frameHeight:96});
  for(const [k,p]of Object.entries({warehouse:'online/warehouse-v1/warehouse.webp',booth:'online/housing-v1/booth.webp',gacha:'online/gacha-v2.webp',barrel:'online/training-barrel-v1.png',fountain:'terrain/objects/healing-fountain-pixel.png'}))this.load.image(k,'assets/'+p);
 }
 create(){
  el('loading').remove();this.cameras.main.setBackgroundColor('#162b25').setBounds(MIN_X*T,MIN_Y*T,W,H);
  for(let i=0;i<6;i++){const texture=this.textures.get('tile'+i),source=texture.getSourceImage();for(let row=0;row<4;row++)for(let col=0;col<4;col++)texture.add(row*4+col,0,col*source.width/4,row*source.height/4,source.width/4,source.height/4);}
  const paving=this.textures.get('coolPaving'),pavingSource=paving.getSourceImage();
  for(let style=0;style<4;style++)for(let row=0;row<4;row++)for(let col=0;col<4;col++)paving.add(style*16+row*4+col,0,(style%2*4+col)*pavingSource.width/8,(Math.floor(style/2)*4+row)*pavingSource.height/8,pavingSource.width/8,pavingSource.height/8);
  // The pale plaza quadrant contains 3 x 3 slabs, not 4 x 4.
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)paving.add(100+row*3+col,0,col*pavingSource.width/6,row*pavingSource.height/6,pavingSource.width/6,pavingSource.height/6);
  // Bake only the repeating floor. Every house, gate and garden object remains an individual sprite.
  const floor=this.add.renderTexture(MIN_X*T,MIN_Y*T,W,H).setOrigin(0).setDepth(-1000);
  const stamp=this.make.image({key:'tile2',add:false}).setOrigin(0);
  for(let y=MIN_Y;y<=MAX_Y;y++)for(let x=MIN_X;x<=MAX_X;x++){
   const kind=ground(x,y),central=x>=0&&x<=24&&y>=0&&y<=18;
   const garden=houses.find(h=>x===h.doorX&&y>h.doorY&&y<=h.plotY+12);
   const luxury=garden?.tier===9&&y<=garden.doorY+2;
   const style=central?0:luxury||Math.abs(x-12)<=2&&(Math.abs(y+6)<=1||Math.abs(y-22)<=1)?3:garden?2:1;
   const grass=!central&&kind==='grass';
   stamp.setTexture(grass?'tile2':'coolPaving',central?100+(y%3)*3+x%3:(grass?0:style*16)+((y-MIN_Y)%4)*4+(x-MIN_X)%4).setDisplaySize(T+.3,T+.3).clearTint();floor.draw(stamp,(x-MIN_X)*T,(y-MIN_Y)*T);
  }stamp.destroy();
  // Ivory curbs follow actual paving edges without changing the walkable tiles.
  const trim=this.add.graphics().setDepth(-950),paved=(x:number,y:number)=>x>=MIN_X&&x<=MAX_X&&y>=MIN_Y&&y<=MAX_Y&&ground(x,y)!=='grass';
  for(let y=MIN_Y;y<=MAX_Y;y++)for(let x=MIN_X;x<=MAX_X;x++)if(paved(x,y)){
   trim.fillStyle(0xe9e2cb,.95);const px=x*T,py=y*T;
   if(!paved(x-1,y))trim.fillRect(px,py,6,T);if(!paved(x+1,y))trim.fillRect(px+T-6,py,6,T);
   if(!paved(x,y-1))trim.fillRect(px,py,T,6);if(!paved(x,y+1))trim.fillRect(px,py+T-6,T,6);
  }
  trim.lineStyle(1.5,0x56656b,.65);for(let y=0;y<=18;y++)for(let x=0;x<=24;x++)trim.strokeRect(x*T,y*T,T,T);
  trim.lineStyle(7,0xe9e2cb,.9).strokeCircle(12.5*T,9.5*T,2.3*T);
  trim.lineStyle(2,0xb6a16c,.65).strokeCircle(12.5*T,9.5*T,2.45*T);
  this.grid=this.add.graphics().setDepth(-900).setVisible(false).lineStyle(1,0x121e18,.25);
  for(let x=MIN_X;x<=MAX_X+1;x++)this.grid.lineBetween(x*T,MIN_Y*T,x*T,(MAX_Y+1)*T);
  for(let y=MIN_Y;y<=MAX_Y+1;y++)this.grid.lineBetween(MIN_X*T,y*T,(MAX_X+1)*T,y*T);
  for(const p of props){
   const wall=p.kind==='wallH'||p.kind==='wallV';
   this.art(p.kind,p.x,p.y,p.w*T,p.h*T*(p.kind==='wallH'?.7:p.kind==='wallV'?1.2:1),undefined,wall?.62:1);
   if(p.kind==='lamp'){const light=this.add.ellipse((p.x+.5)*T,(p.y-.65)*T,35,35,0xffd77a,.09).setDepth(p.y+1.1);this.tweens.add({targets:light,alpha:.45,duration:1200+(p.x+25)*20,yoyo:true,repeat:-1});}
  }
  for(const h of houses){const building=this.art('house'+h.art,h.x+h.w/2-.5,h.doorY,h.w*T,(h.h+.5)*T).setInteractive({useHandCursor:true});
   building.on('pointerdown',()=>{if(this.overview){this.tweens.killTweensOf(this.body);this.moving=false;this.path=[];this.position={x:h.doorX,y:h.doorY+1};this.place();this.setView(false);}else this.path=townPath(this.position,{x:h.doorX,y:h.doorY+1},[],blocked);});
   building.on('pointerover',()=>el('status').textContent=`${h.price/10000}万Gの${h.tier===9?'豪華な屋敷':h.tier===5?'邸宅':'小さな家'} · ${h.id} · 庭の門から入れます`);
  }
  for(const o of plazaObjects){const art=this.art(o.key,o.x+(o.w-1)/2,o.y+o.h-1,o.w*T,o.artH*T,'frame'in o?o.frame:undefined);if(o.label){art.setInteractive({useHandCursor:true});art.on('pointerover',()=>el('status').textContent=o.label+' · 配置確認デモ');}}
  const fountain=this.art('fountain',12,10,144,144);this.tweens.add({targets:fountain,alpha:.88,duration:1600,yoyo:true,repeat:-1});
  this.shadow=this.add.ellipse(0,0,26,10,0x000000,.27);
  this.body=this.add.image(0,0,'player_male_leather',0).setDisplaySize(43.52,43.52);this.rig=new CharacterRig(this);this.place();
  this.cursor=this.add.rectangle(0,0,T,T,0xf0d69c,.08).setStrokeStyle(2,0xf0d69c,.75).setDepth(200).setVisible(false);
  this.input.on('pointermove',(p:Phaser.Input.Pointer)=>{const v=p.positionToCamera(this.cameras.main) as Phaser.Math.Vector2,x=Math.floor(v.x/T),y=Math.floor(v.y/T);this.cursor.setPosition((x+.5)*T,(y+.5)*T).setVisible(!blocked(x,y));});
  this.input.on('pointerdown',(p:Phaser.Input.Pointer,objects:unknown[])=>{if(objects.length)return;const v=p.positionToCamera(this.cameras.main) as Phaser.Math.Vector2,target={x:Math.floor(v.x/T),y:Math.floor(v.y/T)};this.path=townPath(this.position,target,[],blocked);});
  this.input.on('wheel',(_p:unknown,_o:unknown,_dx:number,dy:number)=>{this.overview=false;this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom*(dy>0?.85:1.15),.18,2));this.follow();});
  this.keys=this.input.keyboard!.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D') as Record<string,Phaser.Input.Keyboard.Key>;
  this.input.keyboard!.on('keydown',()=>{this.path=[];if(this.overview)this.setView(false);});
  window.addEventListener('blur',()=>{this.input.keyboard?.resetKeys();this.path=[];});
  el('plazaView').onclick=()=>{this.setView(true);this.cameras.main.setZoom(Math.min(this.scale.width/(27*T),this.scale.height/(22*T)));this.cameras.main.centerOn(12.5*T,9*T);};el('overview').onclick=()=>this.setView(true);el('walk').onclick=()=>this.setView(false);
  el('plaza').onclick=()=>{this.tweens.killTweensOf(this.body);this.moving=false;this.path=[];this.position={x:12,y:14};this.place();this.setView(false);};
  el('grid').onclick=()=>{this.grid.setVisible(!this.grid.visible);el('grid').classList.toggle('selected',this.grid.visible);};
  el('close').onclick=()=>document.querySelector<HTMLDialogElement>('dialog')!.close();
  this.scale.on('resize',()=>this.setView(this.overview));this.setView(true);
  el('stage').dataset.ready='true';el('stage').dataset.objects=String(props.length+houses.length);
 }
 art(key:string,x:number,y:number,w:number,h:number,frame?:number,origin=1){return this.add.image((x+.5)*T,(y+1)*T,key,frame).setOrigin(.5,origin).setDisplaySize(w,h).setDepth(y+.8);}
 place(){this.body.setPosition((this.position.x+.5)*T,(this.position.y+.5)*T);this.shadow.setPosition(this.body.x,this.body.y+18);}
 setView(all:boolean){this.overview=all;const cam=this.cameras.main;cam.stopFollow();cam.useBounds=!all;cam.setZoom(all?Math.min(this.scale.width/W,this.scale.height/H)*.98:1.25);if(all)cam.centerOn((MIN_X+MAX_X+1)*T/2,(MIN_Y+MAX_Y+1)*T/2);else this.follow();el('overview').classList.toggle('selected',all);el('walk').classList.toggle('selected',!all);}
 follow(){this.cameras.main.centerOn(this.body.x,this.body.y);}
 update(time:number){
  if(!this.body)return;
  if(!this.moving){let next=this.path.shift();for(const [names,dx,dy]of [[['UP','W'],0,-1],[['DOWN','S'],0,1],[['LEFT','A'],-1,0],[['RIGHT','D'],1,0]] as const){if(names.some(n=>this.keys[n]?.isDown)){next={x:this.position.x+dx,y:this.position.y+dy};break;}}
   if(next&&!blocked(next.x,next.y)){this.dir=next.x>this.position.x?'right':next.x<this.position.x?'left':next.y>this.position.y?'down':'up';this.position=next;this.moving=true;this.stepStart=time;this.tweens.add({targets:this.body,x:(next.x+.5)*T,y:(next.y+.5)*T,duration:155,onComplete:()=>{this.moving=false;}});}
  }
  const phase=(time/480)%1;this.body.setDepth(this.body.y/T+.3).setData('walkPhase',phase);
  const frame=this.moving?PLAYER_WALK_FRAMES[Math.floor(phase*18)]:'idle';this.body.setFrame(playerFrameIndex(this.dir,frame));this.rig.update(this.body,null,null,this.dir,frame,'male',time-this.stepStart,true);
  this.shadow.setPosition(this.body.x,this.body.y+18).setDepth(this.body.depth-.01);if(!this.overview)this.follow();
  el('stage').dataset.tile=`${this.position.x},${this.position.y}`;
 }
}
new Phaser.Game({type:Phaser.AUTO,parent:'stage',backgroundColor:'#162b25',audio:{noAudio:true},scale:{mode:Phaser.Scale.RESIZE,width:el('stage').clientWidth,height:el('stage').clientHeight},render:{antialias:true,roundPixels:true},scene:TownDemo});
