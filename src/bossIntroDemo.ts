import Phaser from 'phaser';
import frames from './bossIntroFrames.json';

// Local preview only: no account, multiplayer connection or production scene changes.
const W=1280,H=720,T=64,BX=640,END=430,IMPACT=9670;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{n=clamp(n);return n*n*(3-2*n);};
let elapsed=0,paused=false,rate=1,ready=false;
const slider=document.querySelector<HTMLInputElement>('#timeline')!,phase=document.querySelector<HTMLElement>('#phase')!,clock=document.querySelector<HTMLElement>('#clock')!;
const poses=[...frames.walk,...frames.attack];
class Intro extends Phaser.Scene{
 boss!:Phaser.GameObjects.Image;ghost!:Phaser.GameObjects.Image;ground!:Phaser.GameObjects.Image;closed!:Phaser.GameObjects.Image;open!:Phaser.GameObjects.Image;door!:Phaser.GameObjects.Graphics;fx!:Phaser.GameObjects.Graphics;shade!:Phaser.GameObjects.Graphics;shadow!:Phaser.GameObjects.Ellipse;title!:Phaser.GameObjects.Text;tag!:Phaser.GameObjects.Text;lastFrame=-1;blend=0;lastTime=0;
 preload(){this.load.image('walk','assets/online/boss-intro-demo-v2/walk.png');this.load.image('attack','assets/online/boss-intro-demo-v2/attack.png');this.load.spritesheet('floor','assets/online/adventure-v2/floors.webp',{frameWidth:128,frameHeight:128});this.load.image('cage-closed','assets/online/maze-v2/cage-closed.png');this.load.image('cage-open','assets/online/maze-v2/cage-open.png');this.load.spritesheet('player','assets/characters/player/male-leather.png',{frameWidth:40,frameHeight:40});}
 create(){
  for(const [key,list]of Object.entries(frames))for(const [i,f]of list.entries())this.textures.get(key).add(i,0,f.x,f.y,f.w,f.h);
  this.prepareFloorDamage();
  this.cameras.main.setBackgroundColor('#03060c');
  for(let y=1;y<=10;y++)for(let x=3;x<=16;x++){const tile=this.add.image(x*T,y*T,'floor',13).setDisplaySize(T,T).setTint((x+y)%3===0?0x8d6670:0xb8888c).setDepth(-10);if(x===10&&y===7)this.ground=tile;}
  const border=this.add.graphics().setDepth(-4);for(let x=2;x<=17;x++){border.fillStyle(0x313345).fillRect(x*T-32,36,T,64).lineStyle(2,0x797083).strokeRect(x*T-32,36,T,64);border.fillStyle(0x171822).fillRect(x*T-32,98,T,22);}for(let y=2;y<=10;y++)for(const x of [2,17])border.fillStyle(0x292a39).fillRect(x*T-32,y*T-32,T,64).lineStyle(2,0x656075).strokeRect(x*T-32,y*T-32,T,64);
  // Deep room beyond the door: boss starts in darkness, rather than spawning in the arena.
  this.add.rectangle(BX,130,206,165,0x020209).setDepth(-3);this.add.ellipse(BX,160,180,65,0x55228e,.2).setDepth(-2);
  this.open=this.add.image(BX,215,'cage-open').setOrigin(.5,1).setDisplaySize(245,245).setDepth(10);
  this.closed=this.add.image(BX,215,'cage-closed').setOrigin(.5,1).setDisplaySize(245,245).setDepth(11);
  this.door=this.add.graphics().setDepth(12);this.fx=this.add.graphics().setDepth(40);this.shade=this.add.graphics().setDepth(100);

  this.shadow=this.add.ellipse(BX,END-8,125,34,0x000000,.5).setDepth(0);
  this.ghost=this.add.image(BX,END,'walk',0).setDepth(5).setVisible(false);
  this.boss=this.add.image(BX,110,'walk',0).setDepth(6);
  this.add.ellipse(BX,606,40,12,0x000000,.6);this.add.image(BX,595,'player',24).setDisplaySize(74,74).setOrigin(.5,.8).setDepth(9);this.add.text(BX,630,'PLAYER',{fontSize:'11px',color:'#aebdcd',letterSpacing:3}).setOrigin(.5).setDepth(10);
  for(const x of [280,1000])for(const y of [170,470]){const glow=this.add.graphics().setDepth(-1);for(let r=55;r>0;r-=5)glow.fillStyle(0xa933dd,.008).fillCircle(x,y,r);this.add.rectangle(x,y+18,10,40,0x343044).setDepth(2);this.add.ellipse(x,y,13,24,0xb96fff).setDepth(3);this.add.ellipse(x,y-2,6,14,0xe8bbff).setDepth(4);}
  this.title=this.add.text(BX,551,'結晶門の守護者 ヴェスパー',{fontFamily:'Yu Mincho,serif',fontSize:'30px',color:'#eee5ff',stroke:'#120c22',strokeThickness:5,letterSpacing:4}).setOrigin(.5).setDepth(110).setAlpha(0);
  this.tag=this.add.text(BX,517,'GUARDIAN OF THE CRYSTAL GATE',{fontSize:'11px',color:'#ba95e2',letterSpacing:6}).setOrigin(.5).setDepth(110).setAlpha(0);
  ready=true;elapsed=0;
 }
 prepareFloorDamage(){
  const img=this.textures.get('floor').getSourceImage()as HTMLImageElement;
  for(let stage=1;stage<=3;stage++){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d')!;g.fillStyle='#21141c';g.fillRect(0,0,128,128);
   const edge=[[0,0],[64,0],[128,0],[128,64],[128,128],[64,128],[0,128],[0,64],[0,0]];
   for(let i=0;i<8;i++){const a=edge[i],b=edge[i+1],angle=(i+.5)*Math.PI/4-Math.PI*.75,d=stage===1?.6:stage===2?2.4:1.5,dx=Math.cos(angle)*d,dy=Math.sin(angle)*d;g.save();g.beginPath();g.moveTo(64+dx,64+dy);g.lineTo(a[0]+dx,a[1]+dy);g.lineTo(b[0]+dx,b[1]+dy);g.closePath();g.clip();g.drawImage(img,128,384,128,128,dx,dy,128,128);g.restore();}
   for(let i=0;i<8;i++){const e=edge[i],dx=e[0]-64,dy=e[1]-64;g.beginPath();g.moveTo(64,64);g.lineTo(64+dx*.35+3,64+dy*.35-2);g.lineTo(64+dx*.7-2,64+dy*.7+2);g.lineTo(64+dx*.9,64+dy*.9);g.strokeStyle='#150b15';g.lineWidth=stage===1?1.5:3;g.stroke();g.strokeStyle=stage===2?'#b764d3':'#673970';g.lineWidth=.7;g.stroke();}
   g.fillStyle='#0b0710';g.beginPath();g.ellipse(64,64,3,10,0,0,Math.PI*2);g.fill();this.textures.addCanvas('fractured-floor-'+stage,c);
  }
 }
 pose(frame:number,x:number,y:number,scale=1){
  const apply=(image:Phaser.GameObjects.Image,n:number)=>{const f=poses[n],key=n<8?'walk':'attack',index=n<8?n:n-8;image.setTexture(key,index).setOrigin(f.ax,f.ay).setPosition(x,y).setDisplaySize(238*scale,238*scale*f.h/f.w);};
  if(frame!==this.lastFrame){if(this.lastFrame>=0)apply(this.ghost,this.lastFrame);this.ghost.setVisible(this.lastFrame>=0);this.blend=this.lastFrame<0?elapsed-22:elapsed;this.lastFrame=frame;}
  apply(this.boss,frame);const alpha=clamp((elapsed-this.blend)/(elapsed>=7500&&elapsed<7720?10:22));this.boss.setAlpha(alpha);this.ghost.setAlpha(1-alpha);if(alpha>=1)this.ghost.setVisible(false);
 }
 update(_time:number,delta:number){if(!ready)return;if(!paused)elapsed=Math.min(14000,elapsed+Math.min(delta,50)*rate);const t=elapsed;let f=0,x=BX,y=126,scale=1,label='封印の扉が開く';
  const opening=ease((t-400)/1700);this.closed.setAlpha(1-opening).setY(215-opening*38);this.open.setAlpha(opening);this.door.clear();if(t<2300)this.door.fillStyle(0x03020c,.5*(1-opening)).fillRect(BX-83,50,166,160);
  if(t<2100){y=126+opening*30;}
  else if(t<6300){const p=clamp((t-2100)/4200),step=(t-2100)/1050,foot=step%1,number=Math.floor(step);f=(number%2)*4+(foot<.34?0:foot<.62?1:foot<.82?2:3);y=156+(END-156)*(number+ease((foot-.12)/.76))/4+(foot<.2?Math.sin(foot/.2*Math.PI)*2.8:0);x=BX+(number%2?1:-1)*Math.sin(foot*Math.PI)*1.6;label='重い足取りで部屋から歩み出る';}
  else{y=END;f=8;label='大剣を構える';}
  if(t>=6500&&t<7500){const p=clamp((t-6500)/1000);f=[8,9,16,15][p<.18?0:p<.44?1:p<.7?2:3];label='深く溜める';x=BX+ease(p)*8;y=END+ease(p)*3;}
  if(t>=7500&&t<7720){const p=clamp((t-7500)/220);f=[10,13,12,11][Math.min(3,Math.floor(p*4))];label='一気に振り抜く';x=BX+8-20*(1-Math.pow(1-p,3));scale=1.025;}
  if(t>=7720&&t<8370){f=[14,17][Math.min(1,Math.floor((t-7720)/650*2))];label='斬撃の余韻';x=BX-12*(1-ease((t-7720)/650));}
  if(t>=8370&&t<9420){f=18+Math.min(2,Math.floor((t-8370)/1050*3));label='頭上へ大きく振り上げる';y=END-5*ease((t-8370)/1050);}
  if(t>=9420&&t<IMPACT){f=21+Math.min(1,Math.floor((t-9420)/(IMPACT-9420)*2));label='地面へ突き刺す';y=END-9+20*ease((t-9420)/(IMPACT-9420));}
  if(t>=IMPACT){f=23;label=t<10800?'床が砕け、衝撃が広がる':'剣を地面に突き立てたまま威圧';y=END+11;}
  this.pose(f,x,y,scale);this.shadow.setPosition(x,y-6).setAlpha(t<2100?.15:.5);this.boss.setDepth(y<210?4:15);this.ghost.setDepth(this.boss.depth-.1);
  this.fx.clear();
  // Wide horizontal crescent with fading layered trails, not a rotating whole-body cutout.
  if(t>=7500&&t<7970){const p=clamp((t-7500)/220),fade=1-clamp((t-7720)/250);for(let i=0;i<7;i++){const end=.05+p*Math.PI,start=Math.max(.05,end-(.35+p*1.7));this.fx.lineStyle(11-i*1.4,i<2?0xffedff:0xa35bff,fade*(.6-i*.07));this.fx.beginPath();for(let n=0;n<=40;n++){const a=start+(end-start)*n/40,px=BX+Math.cos(a)*(153+i*2),py=END-112+Math.sin(a)*(40+i*2);if(n===0)this.fx.moveTo(px,py);else this.fx.lineTo(px,py);}this.fx.strokePath();}}
  if(t>=2100&&t<6300){const step=(t-2100)/1050,contact=step%1;if(contact<.22){const p=contact/.22,side=Math.floor(step)%2?1:-1;this.fx.lineStyle(1,0xc6a0a0,(1-p)*.24).strokeEllipse(BX+side*17,y+3,20+p*34,5+p*9);for(let i=0;i<6;i++)this.fx.fillStyle(0xa98a83,(1-p)*.35).fillCircle(BX+side*17+Math.cos(i)*p*22,y+Math.sin(i)*p*5-p*6,2);}}
  const hit=t-IMPACT;if(hit<0)this.ground.setTexture('floor',13);else this.ground.setTexture('fractured-floor-'+(hit<85?1:hit<440?2:3));
  if(hit>=0&&hit<1200){const p=hit/1200;for(let i=0;i<2;i++)this.fx.lineStyle(5-i*2,0xcb9aff,(1-p)*(.7-i*.2)).strokeEllipse(BX,448,45+p*470+i*18,15+p*120+i*7);for(let i=0;i<28;i++){const a=i*2.39996,dist=(40+i%7*10)*Math.min(1,hit/450),dy=-Math.sin(Math.min(1,hit/800)*Math.PI)*(22+i%5*8);this.fx.fillStyle(i%3?0x8d697e:0xdbbaff,(1-p)*.9).fillTriangle(BX+Math.cos(a)*dist,448+Math.sin(a)*dist*.35+dy,BX+Math.cos(a)*dist+6,450+Math.sin(a)*dist*.35+dy,BX+Math.cos(a)*dist+2,442+Math.sin(a)*dist*.35+dy);}}
  const shake=hit>=0&&hit<450?(1-hit/450)*5:0;this.cameras.main.setScroll(Math.sin(hit*.1)*shake,Math.cos(hit*.13)*shake);
  this.shade.clear().fillStyle(0x000000,.95).fillRect(0,0,W,32).fillRect(0,H-32,W,32);if(hit>=0&&hit<140)this.shade.fillStyle(0xe8d2ff,(1-hit/140)*.5).fillRect(0,32,W,H-64);
  const show=ease((t-10900)/800);this.title.setAlpha(show);this.tag.setAlpha(show);if(show)this.fx.lineStyle(1,0xa77bcc,show*.8).lineBetween(380,578,900,578);
  phase.textContent=label;slider.value=String(t);clock.textContent=`${(t/1000).toFixed(1)} / 14.0秒`;
 }
}
const game=new Phaser.Game({type:Phaser.AUTO,parent:'stage',width:W,height:H,backgroundColor:'#03060c',audio:{noAudio:true},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Intro});
document.querySelector<HTMLButtonElement>('#replay')!.onclick=()=>{elapsed=0;paused=false;(game.scene.scenes[0]as Intro).lastFrame=-1;document.querySelector('#pause')!.textContent='一時停止';};
document.querySelector<HTMLButtonElement>('#pause')!.onclick=e=>{paused=!paused;(e.currentTarget as HTMLButtonElement).textContent=paused?'再生':'一時停止';};
document.querySelector<HTMLSelectElement>('#speed')!.onchange=e=>{rate=Number((e.currentTarget as HTMLSelectElement).value);};
slider.oninput=()=>{elapsed=Number(slider.value);paused=true;(game.scene.scenes[0]as Intro).lastFrame=-1;document.querySelector('#pause')!.textContent='再生';};
