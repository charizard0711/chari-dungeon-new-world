import {createRailAudio} from './railAudio';
import {mountStationArchitecture,STATIONS,prepareStationArt} from './stations';
import {BOARDING_PANELS} from './stage';
import {railTilePath} from './railGeometry';
import {RAIL_ROUTE,railPose} from './railRoute';
import {partyCanSee,partySightRadius} from './visibility';
import {ADVENTURE_CONFIG as C} from './layout';
export function prepareRailArt(scene:any){
 if(scene.textures.exists('maze_rail_gate'))return;
 const atlas=scene.textures.get('maze_rail_atlas').getSourceImage() as HTMLImageElement;
 for(const [key,column]of [['maze_rail_gate',0],['maze_rail_tram',1]]as const){const c=document.createElement('canvas');c.width=atlas.width/2;c.height=atlas.height;c.getContext('2d')!.drawImage(atlas,column*c.width,0,c.width,c.height,0,0,c.width,c.height);scene.textures.addCanvas(key,c);}
}

export function railNow(scene:any){return (scene.packet.serverTime??Date.now())+performance.now()-(scene.packet.clockReceivedAt??performance.now());}
export function mountRailStations(scene:any){
 prepareRailArt(scene);prepareStationArt(scene);const architecture=mountStationArchitecture(scene),audio=createRailAudio(scene);const T=48,objects:any[]=[];
 const sheet=scene.textures.get('maze_rail_directions'),src=sheet.getSourceImage();if(!sheet.has('north')){const c=document.createElement('canvas');c.width=src.width;c.height=src.height;const ctx=c.getContext('2d')!;ctx.drawImage(src,0,0);const rgba=ctx.getImageData(0,0,c.width,c.height).data;for(const [i,name]of ['north','east','south','west'].entries()){const x0=Math.round((i%2)*src.width/2),y0=Math.round(Math.floor(i/2)*src.height/2),x1=Math.round((i%2+1)*src.width/2),y1=Math.round((Math.floor(i/2)+1)*src.height/2);let left=x1,top=y1,right=x0,bottom=y0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(rgba[(y*c.width+x)*4+3]>180){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}sheet.add(name,0,left,top,right-left+1,bottom-top+1);}}
 // Generate all six tiles from identical edge centres and gauge. Curves are tangent to straights.
 for(let frame=0;frame<6;frame++){const key='rail-connected-'+frame;if(scene.textures.exists(key))continue;const g=scene.add.graphics(),points=railTilePath(frame);
 g.fillStyle(0x30383b).fillRect(0,0,T,T);
 for(let y=2;y<T;y+=6)for(let x=2;x<T;x+=6)g.fillStyle((x+y)%12?0x465054:0x222c30).fillCircle(x+(y%3),y,2);
 for(let i=2;i<points.length;i+=6){const p=points[i],q=points[Math.min(i+1,points.length-1)],d=Math.hypot(q.x-p.x,q.y-p.y)||1,nx=-(q.y-p.y)/d,ny=(q.x-p.x)/d;g.lineStyle(5,0x39271d).lineBetween(p.x-nx*16,p.y-ny*16,p.x+nx*16,p.y+ny*16);g.lineStyle(3,0x8e6540).lineBetween(p.x-nx*16,p.y-ny*16-1,p.x+nx*16,p.y+ny*16-1);}
 for(const side of [-1,1]){const rail=points.map((p,i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],d=Math.hypot(b.x-a.x,b.y-a.y)||1;return{x:p.x-(b.y-a.y)/d*8*side,y:p.y+(b.x-a.x)/d*8*side};});for(const [width,color]of [[5,0x171b1e],[3,0x939da2],[1,0xe3e9e8]]){g.lineStyle(width,color);g.beginPath();g.moveTo(rail[0].x,rail[0].y);for(const p of rail.slice(1))g.lineTo(p.x,p.y);g.strokePath();}}
 g.generateTexture(key,T,T);g.destroy();}
 for(let i=0;i<RAIL_ROUTE.length;i++){const p=RAIL_ROUTE[i],a=RAIL_ROUTE[Math.max(0,i-1)],b=RAIL_ROUTE[Math.min(RAIL_ROUTE.length-1,i+1)];const dirs=[a,b].map(q=>q.x<p.x?'W':q.x>p.x?'E':q.y<p.y?'N':q.y>p.y?'S':'');let f=dirs.includes('N')||dirs.includes('S')?1:0;if(dirs.includes('N')&&dirs.includes('E'))f=2;if(dirs.includes('E')&&dirs.includes('S'))f=3;if(dirs.includes('S')&&dirs.includes('W'))f=4;if(dirs.includes('W')&&dirs.includes('N'))f=5;objects.push(scene.add.image((p.x+.5)*T,(p.y+.5)*T,'rail-connected-'+f).setDisplaySize(T,T).setDepth(p.y<0?-98:-1.7));}
 const stations=STATIONS.map(s=>({id:s.id,x:s.gateX,y:s.gateY,label:s.name}));
 const pads=BOARDING_PANELS.map(p=>{const g=scene.add.graphics().setDepth(-.8),text=scene.add.text((p.x+.5)*T,(p.y+.5)*T,'乗車',{fontFamily:'Meiryo',fontSize:'12px',fontStyle:'bold',color:'#efffff',stroke:'#082b36',strokeThickness:3}).setOrigin(.5).setDepth(-.7);objects.push(g,text);return{p,g,text};});
 const gates=stations.map(s=>{const gate=scene.add.image((s.x+.5)*T,(s.y+.5)*T,'station_modules_v4','part-12').setDisplaySize(76,76).setDepth(s.y+.9);const text=scene.add.text((s.x+.5)*T,(s.y-1)*T,'',{fontFamily:'Meiryo',fontSize:'12px',align:'center',color:'#a9f2e8',stroke:'#06121b',strokeThickness:4}).setOrigin(.5,1).setDepth(s.y+2);objects.push(gate,text);return{s,gate,text,opened:false};});
 const status=scene.add.text(20,160,'',{fontFamily:'Meiryo',fontSize:'14px',color:'#e8dba6',backgroundColor:'#07121bcc',padding:{x:8,y:6}}).setScrollFactor(0).setDepth(2102);objects.push(status);
 return{update(){const a=scene.packet.adventure;for(const {p,g,text}of pads){const open=!!a.railGates?.[p.id],pulse=.3+Math.sin(scene.time.now*.004)*.12;g.clear().fillStyle(open?0x42f4d9:0x5d8ca7,open?pulse:.16).fillRoundedRect(p.x*T+3,p.y*T+3,T-6,T-6,5).lineStyle(2,open?0xb1fff4:0x6e9bb3,.95).strokeRoundedRect(p.x*T+4,p.y*T+4,T-8,T-8,5);text.setAlpha(open?1:.65);}for(const g of gates){const{s,text,gate}=g,open=!!a.railGates?.[s.id],visible=partyCanSee(s.x,s.y,scene.packet.players,partySightRadius(a.snapshot),(x,y)=>C.rows[y]?.[x]!=='.',a.snapshot);text.setVisible(visible).setText(`${s.label} · 500G\n${open?'光るパネルを踏んで乗車':a.railUnlocked?'クリックで改札を開く':'ボス戦に参加すると解放'}`);if(open!==g.opened){g.opened=open;gate.setFrame(open?'part-13':'part-12');scene.tweens.add({targets:gate,alpha:{from:.6,to:1},duration:300});}}
 const trip=a.railTrip;audio.update(trip,railNow(scene));status.setVisible(!!trip);if(trip){const p=railPose(trip,railNow(scene));status.setText(`魔導列車 · ${trip.reverse?'入口駅':'ボス前駅'}へ\n${Math.round(p.progress*100)}% · 運賃500G`);}
 },destroy(){audio.destroy();architecture.destroy();objects.forEach(o=>o.destroy());}};
}
export function renderRailActor(scene:any,a:any,p:any){
 if(!p?.railTrip){if(a.railImage){a.railImage.destroy();a.railImage=undefined;a.renderer.sparkles?.setVisible(true);a.body.setVisible(true);a.shadow.setVisible(true);a.leftFoot.setVisible(true);a.rightFoot.setVisible(true);}return false;}
 const pose=railPose(p.railTrip,railNow(scene));scene.tweens.killTweensOf(a.anchor);a.queue=[];a.stepping=false;a.stepTarget=undefined;a.anchor.setPosition((pose.x+.5)*48,(pose.y+.45)*48);
 for(const o of [a.body,a.shadow,a.leftFoot,a.rightFoot,a.guildFlag,a.renderer.weapon,a.renderer.offhand,a.renderer.scabbard,a.renderer.waistFitting,a.renderer.sparkles,a.renderer.characterRig.image])o?.setVisible(false);
 for(const aura of ['swordAura','shieldAura','scabbardAura','fittingAura'])if(a.renderer[aura])a.renderer[aura].enabled=false;
 if(!a.railImage){a.railImage=scene.add.image(a.anchor.x,a.anchor.y,'maze_rail_directions');a.body.once('destroy',()=>a.railImage?.destroy());}
 a.railImage.setFrame({up:'north',right:'east',down:'south',left:'west'}[pose.dir]).setDisplaySize(pose.dir==='up'||pose.dir==='down'?90:180,pose.dir==='up'||pose.dir==='down'?180:90).setPosition(a.anchor.x,a.anchor.y-8+Math.sin(scene.time.now*.025)*.4).setDepth(pose.y+1);
 a.label.setPosition(a.anchor.x,a.anchor.y+47).setDepth(pose.y+2);return true;
}
