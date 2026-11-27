import frames from '../../bossIntroFrames.json';
import {bossStage} from './stage';
import {terrainFrame} from './scenery';
import {playBossStab}from '../actionAudio';
export const BOSS_INTRO_MS=14000,SMASH_MS=3800,SMASH_IMPACT_MS=1800;
export function bossCinematicLocked(a:any,now:number){const b=a?.snapshot?.bossEncounter;return bossStage(a)&&!!b&&(b.phase==='opening'||b.phase==='battle'&&b.smash&&now<b.smash.at+b.smash.duration);}
export function preloadBossCinematic(scene:any){if(!scene.textures.exists('crystal_pit'))scene.load.image('crystal_pit_source','assets/online/combat-fx-v2/crystal-pit.png');scene.load.audio('boss_sword_stab','assets/online/action-audio-v1/boss-sword-stab.wav');for(const key of ['walk','attack'])scene.load.image('boss_intro_'+key,`assets/online/boss-intro-demo-v2/${key}.png`);}
const clamp=(n:number)=>Math.max(0,Math.min(1,n)),ease=(n:number)=>{n=clamp(n);return n*n*(3-2*n);};
const poses=[...frames.walk,...frames.attack];
/** Fracture the existing map texture at its original size; no decorative slab is added. */
export function fracturedFloorTexture(scene:any,frame:number,stage=3){
 if(stage===3){if(!scene.textures.exists('crystal_pit')){const source=scene.textures.get('crystal_pit_source').getSourceImage(),canvas=document.createElement('canvas');canvas.width=canvas.height=128;canvas.getContext('2d')!.drawImage(source,0,0,128,128);scene.textures.addCanvas('crystal_pit',canvas);scene.textures.remove('crystal_pit_source');}return 'crystal_pit';}
 const key=`boss_floor_${frame}_${stage}`;if(scene.textures.exists(key))return key;
 const texture=scene.textures.get('maze_floor'),f=texture.get(frame),img=texture.getSourceImage(),c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d')!;
 g.fillStyle='#170e18';g.fillRect(0,0,128,128);const edge=[[0,0],[64,0],[128,0],[128,64],[128,128],[64,128],[0,128],[0,64],[0,0]];
 for(let i=0;i<8;i++){const a=edge[i],b=edge[i+1],angle=(i+.5)*Math.PI/4-Math.PI*.75,d=stage===1?.6:stage===2?2.4:1.5,dx=Math.cos(angle)*d,dy=Math.sin(angle)*d;g.save();g.beginPath();g.moveTo(64+dx,64+dy);g.lineTo(a[0]+dx,a[1]+dy);g.lineTo(b[0]+dx,b[1]+dy);g.closePath();g.clip();g.drawImage(img,f.cutX,f.cutY,f.cutWidth,f.cutHeight,dx,dy,128,128);g.restore();}
 for(let i=0;i<8;i++){const e=edge[i],dx=e[0]-64,dy=e[1]-64;g.beginPath();g.moveTo(64,64);g.lineTo(64+dx*.35+3,64+dy*.35-2);g.lineTo(64+dx*.7-2,64+dy*.7+2);g.lineTo(64+dx*.93,64+dy*.93);g.strokeStyle='#09060e';g.lineWidth=stage===1?2:5;g.stroke();g.strokeStyle=stage===2?'#be6ee4':'#643778';g.lineWidth=1;g.stroke();}
 g.fillStyle='#030208';g.beginPath();g.ellipse(64,64,4,13,0,0,Math.PI*2);g.fill();scene.textures.addCanvas(key,c);return key;
}
export function mountBossCinematic(scene:any){
 const T=48;for(const [name,list]of Object.entries(frames)){const tex=scene.textures.get('boss_intro_'+name);if(!tex.has(0))for(const [i,f]of list.entries())tex.add(i,0,f.x,f.y,f.w,f.h);}
 const body=scene.add.image(0,0,'boss_intro_walk',0).setDepth(40).setVisible(false),shadow=scene.add.ellipse(0,0,92,24,0x000000,.5).setDepth(1).setVisible(false),fx=scene.add.graphics().setDepth(45),bars=scene.add.graphics().setScrollFactor(0).setDepth(2200),label=scene.add.text(0,0,'',{fontFamily:'Meiryo',fontSize:'20px',color:'#f2e2ff',stroke:'#110a20',strokeThickness:4}).setScrollFactor(0).setDepth(2201).setOrigin(.5);
 const rubble=new Map<string,any>();let following=false,lastStamp='';
 const now=()=>(scene.packet.serverTime??Date.now())+performance.now()-(scene.packet.clockReceivedAt??performance.now());
 return {update(){const a=scene.packet.adventure,b=a?.snapshot.bossEncounter,active=bossCinematicLocked(a,now());scene.bossCinematicActive=active;body.setVisible(active);shadow.setVisible(active);fx.clear();bars.clear();label.setVisible(active);
  const tiles=a?.snapshot.brokenFloors??[];const needed=new Set<string>();
  for(const p of tiles){const id=p.x+','+p.y;needed.add(id);if(!rubble.has(id))rubble.set(id,scene.add.image((p.x+.5)*T,(p.y+.5)*T,fracturedFloorTexture(scene,terrainFrame(undefined,p.x,p.y))).setDisplaySize(T,T).setDepth(-3.8));}
  // The introductory stab scars one real floor tile cosmetically; phase attacks make their three tiles solid.
  if(b?.phase==='battle'||b?.phase==='opening'&&now()-b.at>=9670){const id='intro';needed.add(id);if(!rubble.has(id))rubble.set(id,scene.add.image(50.5*T,11.5*T,fracturedFloorTexture(scene,terrainFrame(undefined,50,11),1)).setDisplaySize(T,T).setDepth(-3.8));}
  for(const [id,o]of rubble)if(!needed.has(id)){o.destroy();rubble.delete(id);}
  if(!active){if(following){following=false;const actor=scene.actors.get(scene.packet.active?.id);if(actor)scene.cameraFollow?.follow(actor.anchor);}return;}
  if(scene.hud?.overlayMode==='inbox')scene.hud.inboxUI?.close();
  if(scene.hud?.overlayMode&&scene.hud.overlayMode!=='none')scene.hud.setOverlay('none');
  scene.stopClickPath();scene.clearMoveInput();scene.moveQueue.length=0;
  const intro=b.phase==='opening',smash=b.smash,passed=now()-(intro?b.at:smash.at),t=intro?passed:passed<1800?8370+passed*1300/1800:9670+(passed-1800),bx=intro?50:smash.x,by=intro?10:smash.y,end=(by+1.08)*T;
  let f=8,x=(bx+.5)*T,y=end;
  if(intro&&t<2100){f=0;y=(4.2+ease((t-400)/1700))*T;}
  else if(intro&&t<6300){const step=(t-2100)/1050,foot=step%1,num=Math.floor(step);f=(num%2)*4+(foot<.34?0:foot<.62?1:foot<.82?2:3);y=5.2*T+(end-5.2*T)*(num+ease((foot-.12)/.76))/4+(foot<.2?Math.sin(foot/.2*Math.PI)*2:0);x+=Math.sin(foot*Math.PI)*(num%2?1:-1);}
  if(t>=6500&&t<7500){const p=clamp((t-6500)/1000);f=[8,9,16,15][p<.18?0:p<.44?1:p<.7?2:3];x+=ease(p)*6;}
  if(t>=7500&&t<7720){const p=clamp((t-7500)/220);f=[10,13,12,11][Math.min(3,Math.floor(p*4))];x+=6-15*(1-Math.pow(1-p,3));}
  if(t>=7720&&t<8370){f=[14,17][Math.min(1,Math.floor((t-7720)/650*2))];x-=9*(1-ease((t-7720)/650));}
  if(t>=8370&&t<9420){f=18+Math.min(2,Math.floor((t-8370)/1050*3));y-=4*ease((t-8370)/1050);}
  if(t>=9420&&t<9670){f=21+Math.min(1,Math.floor((t-9420)/250*2));y-=7-15*ease((t-9420)/250);}
  if(t>=9670){f=23;y+=8;}
  const p=poses[f];body.setTexture('boss_intro_'+(f<8?'walk':'attack'),f<8?f:f-8).setOrigin(p.ax,p.ay).setPosition(x,y).setDisplaySize(178.5,178.5*p.h/p.w);shadow.setPosition(x,y-4);body.setDepth(y/T+2);
  scene.cameraFollow?.stop();following=true;scene.cameras.main.centerOn((bx+.5)*T,(intro?8.6:by+.5)*T);
  const vp=scene.cameras.main;bars.fillStyle(0x000000,.85).fillRect(0,0,vp.width,23).fillRect(0,vp.height-23,vp.width,23);label.setPosition(vp.width/2,vp.height-49).setText(intro?(t>10900?'結晶門の守護者 ヴェスパー':''):passed<1800?'大地が震える…':'結晶の衝撃');
  if(t>=7500&&t<7970){const q=clamp((t-7500)/220),fade=1-clamp((t-7720)/250);for(let i=0;i<5;i++){const endAngle=.05+q*Math.PI,start=Math.max(.05,endAngle-(.35+q*1.7));fx.lineStyle(8-i*1.3,i?0xa65dff:0xf4deff,fade*(.6-i*.1));fx.beginPath();for(let n=0;n<=32;n++){const an=start+(endAngle-start)*n/32,px=(bx+.5)*T+Math.cos(an)*(115+i),py=end-84+Math.sin(an)*(30+i);if(n===0)fx.moveTo(px,py);else fx.lineTo(px,py);}fx.strokePath();}}
  const hit=t-9670;if(hit>=0&&hit<1100){const q=hit/1100;fx.lineStyle(3,0xd0a0ff,(1-q)*.8).strokeEllipse((bx+.5)*T,(by+1.5)*T,35+q*350,12+q*90);for(let i=0;i<22;i++){const an=i*2.39996,d=(30+i%5*9)*Math.min(1,hit/400),lift=Math.sin(Math.min(1,hit/800)*Math.PI)*(18+i%4*6);fx.fillStyle(0xc4a4b6,(1-q)*.7).fillTriangle((bx+.5)*T+Math.cos(an)*d,(by+1.5)*T+Math.sin(an)*d*.3-lift,(bx+.5)*T+Math.cos(an)*d+4,(by+1.5)*T+Math.sin(an)*d*.3-lift+3,(bx+.5)*T+Math.cos(an)*d+1,(by+1.5)*T+Math.sin(an)*d*.3-lift-4);}
   const stamp=(intro?b.at:smash.at)+':impact';if(lastStamp!==stamp){lastStamp=stamp;scene.cameras.main.shake(260,.004);if(hit<250)playBossStab(scene);}}
 },destroy(){body.destroy();shadow.destroy();fx.destroy();bars.destroy();label.destroy();for(const o of rubble.values())o.destroy();scene.bossCinematicActive=false;}};
}
