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
 prepareRailArt(scene);const T=48,objects:any[]=[];
 const sheet=scene.textures.get('maze_rail_directions'),src=sheet.getSourceImage();if(!sheet.has('north'))for(const [i,name]of ['north','east','south','west'].entries())sheet.add(name,0,(i%2)*src.width/2,Math.floor(i/2)*src.height/2,src.width/2,src.height/2);
 const tracks=scene.textures.get('maze_tracks'),img=tracks.getSourceImage();if(!tracks.has('0'))for(let i=0;i<6;i++)tracks.add(String(i),0,(i%3)*img.width/3,Math.floor(i/3)*img.height/2,img.width/3,img.height/2);
 for(let i=0;i<RAIL_ROUTE.length;i++){const p=RAIL_ROUTE[i],a=RAIL_ROUTE[Math.max(0,i-1)],b=RAIL_ROUTE[Math.min(RAIL_ROUTE.length-1,i+1)];const dirs=[a,b].map(q=>q.x<p.x?'W':q.x>p.x?'E':q.y<p.y?'N':q.y>p.y?'S':'');let f=dirs.includes('N')||dirs.includes('S')?1:0;if(dirs.includes('N')&&dirs.includes('E'))f=2;if(dirs.includes('E')&&dirs.includes('S'))f=3;if(dirs.includes('S')&&dirs.includes('W'))f=4;if(dirs.includes('W')&&dirs.includes('N'))f=5;objects.push(scene.add.image((p.x+.5)*T,(p.y+.5)*T,'maze_tracks',String(f)).setDisplaySize(T,T).setDepth(-1.7));}
 const stations=[{id:'entry',x:49,y:83,bx:49,by:88,label:'入口駅'},{id:'boss',x:53,y:26,bx:54,by:28,label:'ボス前駅'}];
 const gates=stations.map(s=>{const gate=scene.add.image((s.x+.5)*T,(s.y+.5)*T,'maze_rail_gate').setDisplaySize(76,76).setDepth(s.y+.9);const text=scene.add.text((s.x+.5)*T,(s.y-1)*T,'',{fontFamily:'Meiryo',fontSize:'12px',align:'center',color:'#a9f2e8',stroke:'#06121b',strokeThickness:4}).setOrigin(.5,1).setDepth(s.y+2);objects.push(gate,text);return{s,gate,text,opened:false};});
 const status=scene.add.text(20,160,'',{fontFamily:'Meiryo',fontSize:'14px',color:'#e8dba6',backgroundColor:'#07121bcc',padding:{x:8,y:6}}).setScrollFactor(0).setDepth(2102);objects.push(status);
 return{update(){const a=scene.packet.adventure;for(const g of gates){const{s,text,gate}=g,open=!!a.railGates?.[s.id],visible=partyCanSee(s.x,s.y,scene.packet.players,partySightRadius(a.snapshot),(x,y)=>C.rows[y]?.[x]!=='.',a.snapshot);text.setVisible(visible).setText(`${s.label} · 500G\n${open?'改札開放 · 列車まで進む':a.railUnlocked?'クリックで改札を開く':'ボス戦に参加すると解放'}`);if(open!==g.opened){g.opened=open;scene.tweens.add({targets:gate,displayWidth:open?24:76,x:(s.x+.5)*T+(open?-27:0),duration:400,ease:'Sine.easeInOut'});}}
 const trip=a.railTrip;status.setVisible(!!trip);if(trip){const p=railPose(trip,railNow(scene));status.setText(`魔導列車 · ${trip.reverse?'入口駅':'ボス前駅'}へ\n${Math.round(p.progress*100)}% · 運賃500G`);}
 },destroy(){objects.forEach(o=>o.destroy());}};
}
export function renderRailActor(scene:any,a:any,p:any){
 if(!p?.railTrip){if(a.railImage){a.railImage.destroy();a.railImage=undefined;a.renderer.sparkles?.setVisible(true);a.body.setVisible(true);a.shadow.setVisible(true);a.leftFoot.setVisible(true);a.rightFoot.setVisible(true);}return false;}
 const pose=railPose(p.railTrip,railNow(scene));scene.tweens.killTweensOf(a.anchor);a.queue=[];a.stepping=false;a.stepTarget=undefined;a.anchor.setPosition((pose.x+.5)*48,(pose.y+.45)*48);
 for(const o of [a.body,a.shadow,a.leftFoot,a.rightFoot,a.guildFlag,a.renderer.weapon,a.renderer.offhand,a.renderer.scabbard,a.renderer.waistFitting,a.renderer.sparkles,a.renderer.characterRig.image])o?.setVisible(false);
 for(const aura of ['swordAura','shieldAura','scabbardAura','fittingAura'])if(a.renderer[aura])a.renderer[aura].enabled=false;
 if(!a.railImage){a.railImage=scene.add.image(a.anchor.x,a.anchor.y,'maze_rail_directions');a.body.once('destroy',()=>a.railImage?.destroy());}
 a.railImage.setFrame({up:'north',right:'east',down:'south',left:'west'}[pose.dir]).setDisplaySize(110,110).setPosition(a.anchor.x,a.anchor.y-8+Math.sin(scene.time.now*.025)*.4).setDepth(pose.y+1);
 a.label.setPosition(a.anchor.x,a.anchor.y+47).setDepth(pose.y+2);return true;
}
