import type Phaser from 'phaser';
import {mountTownLoading} from '../townLoading';
import {partyCanSee,partySightRadius} from './visibility';
import {ADVENTURE_CONFIG as C} from './layout';
export function prepareRailArt(scene:any){
 if(scene.textures.exists('maze_rail_gate'))return;
 const atlas=scene.textures.get('maze_rail_atlas').getSourceImage() as HTMLImageElement;
 for(const [key,column]of [['maze_rail_gate',0],['maze_rail_tram',1]]as const){const c=document.createElement('canvas');c.width=atlas.width/2;c.height=atlas.height;c.getContext('2d')!.drawImage(atlas,column*c.width,0,c.width,c.height,0,0,c.width,c.height);scene.textures.addCanvas(key,c);}
}
export function mountRailStations(scene:any){
 prepareRailArt(scene);const T=48,objects:any[]=[];
 const stations=[{x:49,y:80,end:55,label:'入口駅'},{x:53,y:26,end:55,label:'ボス前駅'}];
 const labels=stations.map(s=>{const rail=scene.add.graphics().setDepth(-1.7);objects.push(rail);rail.lineStyle(3,0x819da1);for(const dy of [13,30])rail.lineBetween((s.x-1)*T,(s.y+1)*T+dy,s.end*T,(s.y+1)*T+dy);rail.lineStyle(4,0x69503b);for(let x=(s.x-1)*T;x<s.end*T;x+=14)rail.lineBetween(x,(s.y+1)*T+7,x,(s.y+1)*T+36);
 const tram=scene.add.image((s.end-1)*T,(s.y+1.5)*T,'maze_rail_tram').setDisplaySize(2.2*T,2.2*T).setDepth(s.y+1.6);objects.push(tram);
 const text=scene.add.text((s.x+.5)*T,(s.y-1)*T,'',{fontFamily:'Meiryo',fontSize:'12px',align:'center',color:'#a9f2e8',stroke:'#06121b',strokeThickness:4}).setOrigin(.5,1).setDepth(s.y+2);objects.push(text);return{s,text,tram};});
 return{update(){const a=scene.packet.adventure;for(const {s,text,tram}of labels){const visible=partyCanSee(s.x,s.y,scene.packet.players,partySightRadius(a.snapshot),(x,y)=>C.rows[y]?.[x]!=='.',a.snapshot);text.setVisible(visible).setText(`${s.label}\n${a.railUnlocked?'改札解放 · 右クリック / タップで乗車':'ボス戦に参加すると解放'}`);tram.setTint(a.railUnlocked?0xffffff:0x647378);}},destroy(){objects.forEach(o=>o.destroy());}};
}
/** A continuous rail journey: acceleration, cruise and braking share one distance clock. */
export function mountRailLoading(scene:Phaser.Scene,toBoss:boolean){
 const loading=mountTownLoading(scene,toBoss?'ボス前駅へ':'入口駅へ');
 for(const e of loading.root.querySelectorAll<HTMLElement>('.town-entry-caption,.town-entry-painting'))e.style.display='none';
 const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=600;canvas.style.cssText='position:absolute;z-index:1;inset:0;width:100%;height:100%;object-fit:contain;background:#030912';loading.root.append(canvas);
 const ctx=canvas.getContext('2d')!,tram=new Image(),stone=new Image();tram.src='assets/online/railway-v1/tram-motion.png';stone.src='assets/online/wall-demo-v1/walls.png';
 const started=performance.now(),duration=6200;let previous=started,distance=0,raf=0,disposed=false;
 function draw(now:number){if(disposed)return;const elapsed=now-started,t=Math.min(1,elapsed/duration),speed=Math.min(1,t/.22,(1-t)/.22),dt=Math.min(50,now-previous);previous=now;distance+=Math.max(0,speed)*dt*.95;
 ctx.fillStyle='#06121c';ctx.fillRect(0,0,1000,600);
 if(stone.complete&&stone.naturalWidth){for(let x=-(distance*.3%300)-300;x<1000;x+=300){ctx.globalAlpha=.32;ctx.drawImage(stone,0,0,stone.width/3,stone.height/3,x,30,300,340);}ctx.globalAlpha=1;}
 // Tunnel supports and crystal lamps parallax behind the carriage.
 for(let x=-(distance*.65%240);x<1100;x+=240){ctx.fillStyle='#132c38';ctx.fillRect(x,35,28,352);ctx.fillStyle='#34505c';ctx.fillRect(x,35,5,350);ctx.fillStyle='#62e8dc';ctx.fillRect(x+7,150,14,24);ctx.fillStyle='#6dffe624';ctx.beginPath();ctx.arc(x+14,162,45,0,7);ctx.fill();}
 ctx.fillStyle='#16232a';ctx.fillRect(0,388,1000,212);
 // Continuous steel rails with fast moving sleepers, all tied to the same speed.
 for(let x=-(distance%42);x<1050;x+=42){ctx.fillStyle='#66503d';ctx.fillRect(x,398,12,58);ctx.fillStyle='#b39160';ctx.fillRect(x,398,12,3);}
 for(const y of [407,440]){ctx.fillStyle='#293c43';ctx.fillRect(0,y,1000,9);ctx.fillStyle='#a8c4c6';ctx.fillRect(0,y,1000,3);}
 const size=480,px=175+Math.min(1,t/.22)*80;const frame=speed>.03?Math.floor(distance/26)%3:0;
 if(tram.complete&&tram.naturalWidth){const sw=tram.width/3;ctx.drawImage(tram,frame*sw,0,sw,tram.height,px,440-size*.78+(speed>.15?Math.sin(distance*.12)*.65:0),size,size);}
 if(t>.76){const x=1000-(t-.76)/.24*260;ctx.fillStyle='#263d48';ctx.fillRect(x,355,220,34);ctx.fillStyle='#d5b573';ctx.fillRect(x,355,220,4);ctx.font='18px Meiryo';ctx.fillStyle='#e7d9b3';ctx.fillText(toBoss?'ボス前駅':'入口駅',x+25,345);}
 ctx.font='bold 27px Meiryo';ctx.fillStyle='#e8d9ad';ctx.textAlign='center';ctx.fillText(toBoss?'入口駅 → ボス前駅':'ボス前駅 → 入口駅',500,65);ctx.font='18px Meiryo';ctx.fillStyle='#a3d9dd';ctx.fillText(t<.22?'発車・加速中':t<.78?'魔導列車で移動中':t<1?'減速・まもなく到着':'到着',500,535);ctx.textAlign='left';ctx.fillStyle='#25444d';ctx.fillRect(200,560,600,4);ctx.fillStyle='#76e2d2';ctx.fillRect(200,560,600*t,4);
 raf=requestAnimationFrame(draw);}
 raf=requestAnimationFrame(draw);const destroy=()=>{disposed=true;cancelAnimationFrame(raf);loading.destroy();};let timer:ReturnType<typeof setTimeout>|undefined;
 return{...loading,destroy(){clearTimeout(timer);destroy();},finish(done:()=>void){timer=setTimeout(()=>{if(!disposed){destroy();done();}},Math.max(0,duration-(performance.now()-started)));}};
}
