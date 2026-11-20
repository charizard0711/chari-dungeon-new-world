import {ADVENTURE_CONFIG as C,ADVENTURE_AREAS,ADVENTURE_PROPS,adventureBlocked,adventureAreaAt} from './layout';
import {MAP_X,MAP_Y,MAP_W,MAP_H} from '../../layout';
export function mountAdventureView(scene:any){
 const T=48,room=scene.packet.adventure,floor=room.floor;scene.cameras.main.setViewport(MAP_X,MAP_Y,MAP_W,MAP_H).setBounds(0,0,(floor===2?13:C.width)*T,(floor===2?11:C.height)*T).setBackgroundColor('#070e18');
 const baseBlocked=(x:number,y:number)=>floor===2?x<1||y<1||x>11||y>9:C.rows[y]?.[x]!=='.';const w=floor===2?13:C.width,h=floor===2?11:C.height;
 const grid=scene.add.graphics().setDepth(-5);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  if(!baseBlocked(x,y)){const area=adventureAreaAt(x,y);scene.add.image((x+.5)*T,(y+.5)*T,'online_town_floor',(x*7+y*3)%6).setDisplaySize(T,T).setTint(area?.id==='boss'?0xb4a0d5:area?.id==='treasury'?0xe8d49c:area?.id==='tree'?0xb7ceb1:0xb9bfca).setDepth(-10);grid.lineStyle(1,0x101823,.4).strokeRect(x*T,y*T,T,T);}
  else if([[0,1],[1,0],[0,-1],[-1,0]].some(([dx,dy])=>!baseBlocked(x+dx,y+dy))){const key='adventure_wall';scene.add.image((x+.5)*T,(y+.35)*T,scene.textures.exists(key)?key:'online_town_floor',0).setDisplaySize(T+2,T+13).setTint(x>70?0x9a81b4:0xb0bac4).setDepth(y+.3);}
 }
 const propImages=new Map<string,any>(),gateImages=new Map<string,any>(),enemies=new Map<string,{sprite:any;bar:any;label:any;hp:number}>(),danger=scene.add.graphics().setDepth(35),traps=scene.add.graphics().setDepth(1);
 if(floor===1){
  for(const a of ADVENTURE_AREAS){scene.add.text((a.x+a.w/2)*T,(a.y+.3)*T,a.name,{fontFamily:'Meiryo',fontSize:'15px',color:'#e9d69c',stroke:'#06111e',strokeThickness:4}).setOrigin(.5).setDepth(1);}
  for(const p of ADVENTURE_PROPS){const key=p.frame<0?'online_npcs_v1':'adventure_props',frame=p.frame<0?4:p.frame;const image=scene.add.image((p.x+.5)*T,(p.y+1)*T,key,frame).setOrigin(.5,1).setDisplaySize(p.size,p.size).setDepth(p.y+.7).setInteractive();propImages.set(p.id,image);image.on('pointerdown',(pointer:any,_x:any,_y:any,event:any)=>{event?.stopPropagation();if(pointer.rightButtonDown()&&scene.hud?.overlayMode==='none')void scene.action('interact',{id:p.id}).then(()=>{if(p.kind==='portal')scene.hud?.townUI?.openBoard();else scene.log(p.kind==='merchant'?'ポーションを20Gで購入しました。':'遺跡の設備を利用しました。');}).catch((e:Error)=>scene.log(e.message));});image.on('pointerover',()=>scene.adventureHover=p.id);image.on('pointerout',()=>scene.adventureHover=undefined);}
  for(const g of C.gates)gateImages.set(g.id,scene.add.image((g.x+.5)*T,(g.y+2)*T,'adventure_props',2).setDisplaySize(100,145).setDepth(g.y+.8));
  // Crystalline cliffs and small cascades surround the routes, leaving the tile grid clear.
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)if(baseBlocked(x,y)&&(x*13+y*7)%37===0&&[[0,1],[1,0],[0,-1],[-1,0]].some(([dx,dy])=>!baseBlocked(x+dx,y+dy)))scene.add.image((x+.5)*T,(y+1)*T,'adventure_props',x>57?3:4).setOrigin(.5,1).setDisplaySize(75,105).setDepth(y+.5);
 }else{scene.add.text(6*T,3*T,'第2層への入口',{fontFamily:'Meiryo',fontSize:'25px',color:'#ffe5a0'}).setOrigin(.5);scene.add.text(6*T,4.3*T,'次の階層は今後追加予定です。\n部屋メニューから到達済みエリアや町へ戻れます。',{fontFamily:'Meiryo',fontSize:'16px',color:'#a9c9d2',align:'center'}).setOrigin(.5);}
 let signature='',hp=scene.player.hp;
 const sync=()=>{const a=scene.packet.adventure;if(!a)return;const state=a.snapshot;const next=JSON.stringify(state);if(next===signature)return;signature=next;
  if(floor===1){
   for(const g of C.gates)gateImages.get(g.id)?.setVisible(!state.keys.includes(g.key));
   for(const p of ADVENTURE_PROPS){const image=propImages.get(p.id);image?.setVisible(p.id!=='stairs'||state.stairs);if(state.opened.includes(p.id))image?.setAlpha(.35);}
   traps.clear();if(!state.trapDisabled)for(const t of C.traps)traps.fillStyle(0xff364b,.18+Math.sin(scene.time.now*.003)*.08).fillRect(t.x*T,t.y*T,T,T).lineStyle(1,0xfb5966,.6).strokeRect(t.x*T,t.y*T,T,T);
   danger.clear();for(const warn of state.telegraphs)for(const t of warn.tiles)danger.fillStyle(0xff3959,.45).fillRect(t.x*T+2,t.y*T+2,T-4,T-4).lineStyle(2,0xffd36f,.9).strokeRect(t.x*T+2,t.y*T+2,T-4,T-4);
   for(const e of state.enemies){let n=enemies.get(e.id);if(e.hp<=0){if(n){n.sprite.destroy();n.bar.destroy();n.label.destroy();enemies.delete(e.id);}continue;}
    if(!n){const sprite=scene.add.image((e.x+.5)*T,(e.y+.6)*T,e.key).setDisplaySize(e.boss?128:e.elite?80:55,e.boss?128:e.elite?80:55).setDepth(e.y+.75).setInteractive();sprite.on('pointerdown',(pointer:any,_x:any,_y:any,event:any)=>{event?.stopPropagation();if(scene.hud?.overlayMode!=='none')return;const target=scene.packet.adventure.snapshot.enemies.find((m:any)=>m.id===e.id);if(!target||target.hp<=0)return;if(pointer.rightButtonDown()){const dx=target.x-scene.player.x,dy=target.y-scene.player.y;void scene.performAttack(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');}else{const options=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:target.x+dx,y:target.y+dy})).filter(p=>!scene.blocked(p.x,p.y));options.sort((a,b)=>Math.abs(a.x-scene.player.x)+Math.abs(a.y-scene.player.y)-Math.abs(b.x-scene.player.x)-Math.abs(b.y-scene.player.y));scene.destination=options[0];}});n={sprite,bar:scene.add.graphics(),label:scene.add.text((e.x+.5)*T,(e.y-.2)*T,e.name,{fontFamily:'Meiryo',fontSize:e.boss?'15px':'10px',color:e.boss?'#ffbbec':'#e6d6c8',stroke:'#0c1018',strokeThickness:3}).setOrigin(.5),hp:e.hp};enemies.set(e.id,n);}
    const px=(e.x+.5)*T,py=(e.y+.6)*T;if(Math.abs(n.sprite.x-px)>.1||Math.abs(n.sprite.y-py)>.1){scene.tweens.killTweensOf(n.sprite);scene.tweens.add({targets:n.sprite,x:px,y:py,duration:200});}n.sprite.setDepth(e.y+.75);if(e.hp<n.hp){n.sprite.setTint(0xffb7c1);scene.time.delayedCall(150,()=>n?.sprite?.active&&n.sprite.clearTint());}n.hp=e.hp;n.label.setPosition(px,py-(e.boss?75:e.elite?50:36)).setDepth(e.y+1);const bw=e.boss?100:e.elite?64:42,by=py-(e.boss?65:e.elite?44:30);n.bar.clear().setDepth(e.y+1).fillStyle(0x22121b,.95).fillRect(px-bw/2,by,bw,5).fillStyle(e.boss?0xe86fc3:0xb5ce6c,1).fillRect(px-bw/2,by,bw*e.hp/e.max,5);
   }
  }
  if(scene.player.hp<hp)scene.log(`敵の攻撃で${hp-scene.player.hp}ダメージ。`);hp=scene.player.hp;
 };
 sync();return{sync,update(){if(scene.packet.adventure?.snapshot.telegraphs.length)danger.setAlpha(.65+Math.sin(scene.time.now*.012)*.3);},destroy(){}};
}
