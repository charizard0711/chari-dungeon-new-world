import Phaser from 'phaser';

// Local preview only: no account, multiplayer connection or production scene changes.
const W=1280,H=720,T=64,BX=640,END=407,IMPACT=9670;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{n=clamp(n);return n*n*(3-2*n);};
let elapsed=0,paused=false,rate=1,ready=false;
const slider=document.querySelector<HTMLInputElement>('#timeline')!,phase=document.querySelector<HTMLElement>('#phase')!,clock=document.querySelector<HTMLElement>('#clock')!;
const origins=[.65,.6,.43,.72,.65,.51,.5,.5],feet=[.974,.974,.962,.962,.925,.936,.953,.953];
class Intro extends Phaser.Scene{
 boss!:Phaser.GameObjects.Image;ghost!:Phaser.GameObjects.Image;ground!:Phaser.GameObjects.Image;closed!:Phaser.GameObjects.Image;open!:Phaser.GameObjects.Image;door!:Phaser.GameObjects.Graphics;fx!:Phaser.GameObjects.Graphics;shade!:Phaser.GameObjects.Graphics;shadow!:Phaser.GameObjects.Ellipse;title!:Phaser.GameObjects.Text;tag!:Phaser.GameObjects.Text;lastFrame=-1;blend=0;lastTime=0;
 preload(){const base='assets/online/boss-intro-demo-v1/';this.load.image('intro-boss',base+'boss.png');this.load.image('intro-ground',base+'ground.png');this.load.spritesheet('floor','assets/online/adventure-v2/floors.webp',{frameWidth:128,frameHeight:128});this.load.image('cage-closed','assets/online/maze-v2/cage-closed.png');this.load.image('cage-open','assets/online/maze-v2/cage-open.png');this.load.spritesheet('player','assets/characters/player/male-leather.png',{frameWidth:40,frameHeight:40});}
 create(){
  for(const [key,cols,rows]of [['intro-boss',4,2],['intro-ground',2,2]]as const){const tex=this.textures.get(key),img=tex.getSourceImage()as HTMLImageElement;for(let i=0;i<cols*rows;i++){const x=Math.round(i%cols*img.width/cols);let y=Math.round(Math.floor(i/cols)*img.height/rows),bottom=Math.round((Math.floor(i/cols)+1)*img.height/rows);if(key==='intro-boss'){if(i<4)bottom=390;if(i===5)y=390;}tex.add(i,0,x,y,Math.round((i%cols+1)*img.width/cols)-x,bottom-y);}}
  this.cameras.main.setBackgroundColor('#03060c');
  for(let y=1;y<=10;y++)for(let x=3;x<=16;x++)this.add.image(x*T,y*T,'floor',13).setDisplaySize(T,T).setTint((x+y)%3===0?0x8d6670:0xb8888c).setDepth(-10);
  const border=this.add.graphics().setDepth(-4);for(let x=2;x<=17;x++){border.fillStyle(0x313345).fillRect(x*T-32,36,T,64).lineStyle(2,0x797083).strokeRect(x*T-32,36,T,64);border.fillStyle(0x171822).fillRect(x*T-32,98,T,22);}for(let y=2;y<=10;y++)for(const x of [2,17])border.fillStyle(0x292a39).fillRect(x*T-32,y*T-32,T,64).lineStyle(2,0x656075).strokeRect(x*T-32,y*T-32,T,64);
  // Deep room beyond the door: boss starts in darkness, rather than spawning in the arena.
  this.add.rectangle(BX,130,206,165,0x020209).setDepth(-3);this.add.ellipse(BX,160,180,65,0x55228e,.2).setDepth(-2);
  this.open=this.add.image(BX,215,'cage-open').setOrigin(.5,1).setDisplaySize(245,245).setDepth(10);
  this.closed=this.add.image(BX,215,'cage-closed').setOrigin(.5,1).setDisplaySize(245,245).setDepth(11);
  this.door=this.add.graphics().setDepth(12);this.fx=this.add.graphics().setDepth(40);this.shade=this.add.graphics().setDepth(100);
  this.ground=this.add.image(BX,END+12,'intro-ground',0).setDisplaySize(96,96).setDepth(-2).setAlpha(0);
  this.shadow=this.add.ellipse(BX,END-8,125,34,0x000000,.5).setDepth(0);
  this.ghost=this.add.image(BX,END,'intro-boss',0).setDepth(5).setVisible(false);
  this.boss=this.add.image(BX,110,'intro-boss',0).setDepth(6);
  this.add.ellipse(BX,606,40,12,0x000000,.6);this.add.image(BX,595,'player',24).setDisplaySize(74,74).setOrigin(.5,.8).setDepth(9);this.add.text(BX,630,'PLAYER',{fontSize:'11px',color:'#aebdcd',letterSpacing:3}).setOrigin(.5).setDepth(10);
  for(const x of [280,1000])for(const y of [170,470]){const glow=this.add.graphics().setDepth(-1);for(let r=55;r>0;r-=5)glow.fillStyle(0xa933dd,.008).fillCircle(x,y,r);this.add.rectangle(x,y+18,10,40,0x343044).setDepth(2);this.add.ellipse(x,y,13,24,0xb96fff).setDepth(3);this.add.ellipse(x,y-2,6,14,0xe8bbff).setDepth(4);}
  this.title=this.add.text(BX,551,'結晶門の守護者 ヴェスパー',{fontFamily:'Yu Mincho,serif',fontSize:'30px',color:'#eee5ff',stroke:'#120c22',strokeThickness:5,letterSpacing:4}).setOrigin(.5).setDepth(110).setAlpha(0);
  this.tag=this.add.text(BX,517,'GUARDIAN OF THE CRYSTAL GATE',{fontSize:'11px',color:'#ba95e2',letterSpacing:6}).setOrigin(.5).setDepth(110).setAlpha(0);
  ready=true;elapsed=0;
 }
 pose(frame:number,x:number,y:number,scale=1){if(frame!==this.lastFrame){this.ghost.setFrame(Math.max(0,this.lastFrame)).setOrigin(origins[Math.max(0,this.lastFrame)],feet[Math.max(0,this.lastFrame)]).setPosition(x,y).setDisplaySize(238,238*this.ghost.frame.cutHeight/this.ghost.frame.cutWidth).setVisible(this.lastFrame>=0);this.blend=this.lastFrame<0?elapsed-70:elapsed;this.lastFrame=frame;}this.boss.setFrame(frame).setOrigin(origins[frame],feet[frame]).setPosition(x,y).setDisplaySize(238*scale,238*scale*this.boss.frame.cutHeight/this.boss.frame.cutWidth);const alpha=clamp((elapsed-this.blend)/70);this.boss.setAlpha(alpha);this.ghost.setAlpha(1-alpha);if(alpha>=1)this.ghost.setVisible(false);}
 update(_time:number,delta:number){if(!ready)return;if(!paused)elapsed=Math.min(14000,elapsed+Math.min(delta,50)*rate);const t=elapsed;let f=0,x=BX,y=126,scale=1,label='封印の扉が開く';
  const opening=ease((t-400)/1700);this.closed.setAlpha(1-opening).setY(215-opening*38);this.open.setAlpha(opening);this.door.clear();if(t<2300)this.door.fillStyle(0x03020c,.5*(1-opening)).fillRect(BX-83,50,166,160);
  if(t<2100){y=126+opening*30;}
  else if(t<6300){const p=clamp((t-2100)/4200),step=(t-2100)/420;f=Math.floor(step)%2;y=156+(END-156)*p-Math.abs(Math.sin(step*Math.PI))*3;x=BX+Math.sin(step*Math.PI)*2;label='重い足取りで部屋から歩み出る';}
  else{y=END;f=1;label='大剣を構える';}
  if(t>=6800&&t<7350){f=2;label='横薙ぎの溜め';x=BX+ease((t-6800)/550)*5;}
  if(t>=7350&&t<7720){f=3;label='大きく横薙ぎ';x=BX+5-12*ease((t-7350)/370);scale=1.03;}
  if(t>=7720&&t<8370){f=4;label='斬撃の余韻';x=BX-7*(1-ease((t-7720)/650));}
  if(t>=8370&&t<9420){f=5;label='頭上へ大きく振り上げる';y=END-5*ease((t-8370)/1050);}
  if(t>=9420&&t<IMPACT){f=6;label='地面へ突き刺す';y=END-9+20*ease((t-9420)/(IMPACT-9420));}
  if(t>=IMPACT){f=7;label=t<10800?'床が砕け、衝撃が広がる':'剣を地面に突き立てたまま威圧';y=END+11;}
  this.pose(f,x,y,scale);this.shadow.setPosition(x,y-6).setAlpha(t<2100?.15:.5);this.boss.setDepth(y<210?4:15);this.ghost.setDepth(this.boss.depth-.1);
  this.fx.clear();
  // Wide horizontal crescent with fading layered trails, not a rotating whole-body cutout.
  if(t>=7310&&t<8000){const p=clamp((t-7310)/480),fade=1-clamp((t-7670)/330);for(let i=0;i<6;i++){const end=Math.PI+.05,start=end-(.4+p*2.4);this.fx.lineStyle(10-i*1.3,i<2?0xeedbff:0x9e4bff,fade*(.48-i*.06));this.fx.beginPath();for(let n=0;n<=36;n++){const a=start+(end-start)*n/36,px=BX+Math.cos(a)*(153+i*2),py=END-112+Math.sin(a)*(48+i*2);if(n===0)this.fx.moveTo(px,py);else this.fx.lineTo(px,py);}this.fx.strokePath();}}
  const hit=t-IMPACT;this.ground.setAlpha(t>=IMPACT?1:0).setFrame(hit<85?1:hit<440?2:3);
  if(hit>=0&&hit<1200){const p=hit/1200;for(let i=0;i<2;i++)this.fx.lineStyle(5-i*2,0xcb9aff,(1-p)*(.7-i*.2)).strokeEllipse(BX,END+10,45+p*470+i*18,15+p*120+i*7);for(let i=0;i<28;i++){const a=i*2.39996,dist=(40+i%7*10)*Math.min(1,hit/450),dy=-Math.sin(Math.min(1,hit/800)*Math.PI)*(22+i%5*8);this.fx.fillStyle(i%3?0x8d697e:0xdbbaff,(1-p)*.9).fillTriangle(BX+Math.cos(a)*dist,END+16+Math.sin(a)*dist*.35+dy,BX+Math.cos(a)*dist+6,END+18+Math.sin(a)*dist*.35+dy,BX+Math.cos(a)*dist+2,END+10+Math.sin(a)*dist*.35+dy);}}
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
