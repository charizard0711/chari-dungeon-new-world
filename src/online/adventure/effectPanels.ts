import {GAME_W,GAME_H,MAP_X,MAP_Y}from '../../layout';
import './effectPanels.css';
const kinds=['heal','paralysis','attack_up','defense_down','attack_down','defense_up'];
const names:Record<string,string>={paralysis:'麻痺：次の移動・攻撃・スキル・道具使用を1回休みます。',attack_up:'攻撃アップ：攻撃力×1.2。泉とは別に乗算。元のパネルが壊れるかフロアクリアで終了。',defense_up:'防御アップ：防御力×1.2。泉とは別に乗算。元のパネルが壊れるかフロアクリアで終了。',attack_down:'攻撃ダウン：攻撃力×0.8。元のパネルが壊れるかフロアクリアで終了。',defense_down:'防御ダウン：防御力×0.8。元のパネルが壊れるかフロアクリアで終了。'};
function speedPanelTexture(scene:any){
 if(scene.textures.exists('speed_panel'))return scene.textures.get('speed_panel').getSourceImage() as HTMLCanvasElement;
 const panel=document.createElement('canvas');panel.width=panel.height=64;
 const g=panel.getContext('2d')!;
 const grade=g.createLinearGradient(0,0,0,64);grade.addColorStop(0,'#284746');grade.addColorStop(1,'#182e31');
 g.fillStyle='#172824';g.fillRect(0,0,64,64);g.fillStyle=grade;g.fillRect(3,3,58,58);
 g.strokeStyle='#b4a06d';g.lineWidth=2;g.strokeRect(3,3,58,58);g.strokeStyle='#638b6e';g.strokeRect(7,7,50,50);
 g.strokeStyle='#92f1ad';g.lineWidth=4;g.lineJoin='round';g.shadowColor='#48e399';g.shadowBlur=6;
 for(const y of [30,44]){g.beginPath();g.moveTo(20,y);g.lineTo(32,y-10);g.lineTo(44,y);g.stroke();}
 scene.textures.addCanvas('speed_panel',panel);
 return panel;
}
export function preloadEffectPanels(scene:any){if(!scene.textures.exists('effect_panels_v1'))scene.load.image('effect_panels_v1','assets/online/effect-panels-v1/panels.png');}
export function mountEffectPanels(scene:any){
 const texture=scene.textures.get('effect_panels_v1'),source=texture.getSourceImage()as HTMLImageElement;
 // Crop away the presentation gutter: only the original square floor asset is rendered.
 const rects=[[53,28,460,455],[537,28,464,455],[1022,28,466,455],[53,527,460,453],[537,527,464,453],[1022,527,466,453]];
 const urls:Record<string,string>={};for(let i=0;i<6;i++){const [x,y,w,h]=rects[i];if(!texture.has(kinds[i]))texture.add(kinds[i],0,x,y,w,h);const c=document.createElement('canvas');c.width=c.height=64;c.getContext('2d')!.drawImage(source,x,y,w,h,0,0,64,64);urls[kinds[i]]=c.toDataURL();}
 urls.speed_up=speedPanelTexture(scene).toDataURL();
 const images=new Map<string,any>(),electric=scene.add.graphics().setDepth(120),root=document.createElement('div');root.className='effect-status-strip chari-game-cursor';root.setAttribute('aria-label','フロアの状態効果');document.body.append(root);
 const tooltip=document.createElement('div');tooltip.className='effect-status-tooltip';tooltip.role='tooltip';tooltip.hidden=true;root.append(tooltip);let signature='';
 const fit=()=>{const r=scene.game.canvas.getBoundingClientRect();Object.assign(root.style,{left:r.left+(MAP_X+8)*r.width/GAME_W+'px',top:r.top+(MAP_Y+8)*r.height/GAME_H+'px',transform:`scale(${r.width/GAME_W},${r.height/GAME_H})`});};const resize=new ResizeObserver(fit);resize.observe(scene.game.canvas);window.addEventListener('resize',fit);fit();
 const show=(text:string)=>{tooltip.textContent=text;tooltip.hidden=false;};
 let disposed=false;const destroy=()=>{if(disposed)return;disposed=true;for(const o of images.values())o.destroy();electric.destroy();resize.disconnect();window.removeEventListener('resize',fit);root.remove();};scene.events.once('shutdown',destroy);
 return {update(){const a=scene.packet.adventure,s=a?.snapshot,cid=scene.packet.active?.id;if(!a||a.floor!==1||!cid)return;const now=(scene.packet.serverTime??Date.now())+performance.now()-(scene.packet.clockReceivedAt??performance.now()),used=s.panelHealUsed?.[cid]??[];
  const speedUntil=s.speedPanelUntil?.[cid]??0,speedLeft=Math.max(0,Math.ceil((speedUntil-now)/1000));
  const seen=new Set<string>();for(const p of s.effectPanels??[]){if(p.destroyed)continue;seen.add(p.id);let image=images.get(p.id);if(!image){image=scene.add.image((p.x+.5)*48,(p.y+.5)*48,p.kind==='speed_up'?'speed_panel':'effect_panels_v1',p.kind==='speed_up'?undefined:p.kind).setDisplaySize(48,48).setDepth(-3.7);images.set(p.id,image);}image.setAlpha((p.kind==='heal'&&used.includes(p.id)||p.kind==='speed_up'&&speedUntil>0)?.28:.94);}
  for(const [id,o]of images)if(!seen.has(id)){o.destroy();images.delete(id);}
  const buffs=s.panelBuffs?.[cid]??{},stun=s.panelParalysis?.[cid]??0,fountain=s.fountainBuffs?.[cid]??1,light=s.lightTurns?.[cid]??0,next=JSON.stringify([buffs,stun,fountain,light,speedLeft]);
  root.hidden=scene.hud?.overlayMode!=='none'||!!scene.bossCinematicActive;
  if(next!==signature){signature=next;for(const b of root.querySelectorAll('button'))b.remove();tooltip.hidden=true;const add=(label:string,image?:string,symbol?:string)=>{const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',label);if(image){const img=document.createElement('img');img.src=image;img.alt='';button.append(img);}else button.textContent=symbol??'';button.onmouseenter=()=>show(label);button.onfocus=()=>show(label);button.onmouseleave=()=>tooltip.hidden=true;button.onblur=()=>tooltip.hidden=true;button.onclick=e=>{e.stopPropagation();show(label);};root.insertBefore(button,tooltip);};
   if(fountain>1)add(`泉の祝福：攻撃・防御×${fountain}。パネルとは別に乗算。フロアクリアまで。`,`assets/terrain/objects/${s.fountainKind==='gold'?'gold':s.fountainKind==='silver'?'silver':'healing'}-fountain-pixel.png`);
   for(const kind of ['attack_up','defense_up','attack_down','defense_down'])if(buffs[kind])add(names[kind],urls[kind]);
   if(speedLeft>0)add(`移動速度＋30％：残り${speedLeft}秒`,urls.speed_up);
   if(stun>0)add(names.paralysis,urls.paralysis);if(light>0)add(`壁越しの光：あと${light}ターン。壁の向こうと透明な敵が見えます。`,undefined,'☀');
  }
  electric.clear();for(const player of scene.packet.players){const shock=s.panelShocks?.[player.character_id]??0;if(!(s.panelParalysis?.[player.character_id]>0||now-shock<850))continue;const actor=scene.actors.get(player.character_id);if(!actor)continue;const x=actor.anchor.x,y=actor.anchor.y;for(const side of [-1,1]){const jitter=Math.sin(now*.032+side)*3;electric.lineStyle(2,0xffdf62,.9).beginPath().moveTo(x+side*12,y-35).lineTo(x+side*(18+jitter),y-20).lineTo(x+side*9,y-21).lineTo(x+side*(17-jitter),y-4).strokePath();}}
 },destroy};
}
