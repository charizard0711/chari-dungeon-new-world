import {Audio} from '../audio/manager';
import {partyCanSee} from './adventure/visibility';
import {IS_MOBILE,MAP_X,MAP_Y,MAP_W,MAP_H} from '../layout';
import './crystalHud.css';
/** Geometry shared by canvas HUD and the DOM inventory/chat docks. */
export function crystalPanel(scene:any,x:number,y:number,w:number,h:number,title?:string){
 const g=scene.add.graphics();g.fillStyle(0x0c2036,.98).fillRoundedRect(x,y,w,h,10);
 g.lineStyle(4,0x269ad5,.10).strokeRoundedRect(x,y,w,h,10);g.lineStyle(1,0x7edcff,.85).strokeRoundedRect(x,y,w,h,10);g.lineStyle(1,0x4e8eac,.3).strokeRoundedRect(x+4,y+4,w-8,h-8,7);
 const frame=scene.add.container(0,0,[g]);
 if(h>150&&scene.textures.exists('crystal_corner'))for(const [cx,cy,fx,fy] of [[x+21,y+21,false,false],[x+w-21,y+21,true,false],[x+21,y+h-21,false,true],[x+w-21,y+h-21,true,true]])frame.add(scene.add.image(cx,cy,'crystal_corner').setDisplaySize(44,44).setFlip(fx,fy).setAlpha(.85));
 if(title)frame.add(scene.add.text(x+(h>150?48:16),y+7,title,{fontFamily:'Meiryo',fontSize:'12px',color:'#d7f1ff',fontStyle:'bold'}));return frame;
}
/** Plain charcoal panels for information that needs maximum contrast. */
export function neutralHudPanel(scene:any,x:number,y:number,w:number,h:number,title?:string){
 const g=scene.add.graphics();g.fillStyle(0x202326,.99).fillRoundedRect(x,y,w,h,5);g.lineStyle(1,0xaab0b6,.85).strokeRoundedRect(x,y,w,h,5);g.lineStyle(1,0xffffff,.12).lineBetween(x+5,y+2,x+w-5,y+2);g.lineStyle(1,0x000000,.6).lineBetween(x+5,y+h-2,x+w-5,y+h-2);
 const root=scene.add.container(0,0,[g]);if(title)root.add(scene.add.text(x+12,y+7,title,{fontFamily:'Meiryo',fontSize:'12px',color:'#e8eaed',fontStyle:'bold'}));return root;
}
function resourceBar(g:any,x:number,y:number,w:number,h:number,ratio:number,health:boolean){
 ratio=Math.max(0,Math.min(1,ratio));const key=[x,y,w,h,ratio,health].join(':');if(g.getData('resource-key')===key)return;g.setData('resource-key',key);g.clear().fillStyle(health?0x33181c:0x181a1c).fillRoundedRect(x,y,w,h,h/2);
 if(ratio>0){g.fillStyle(health?0xce2235:0xb28d4c).fillRoundedRect(x,y,w*ratio,h,h/2);g.fillStyle(health?0xff4c59:0xe2c280,.9).fillRoundedRect(x+1,y+1,Math.max(1,w*ratio-2),Math.max(2,h*.35),h/4);}
 g.lineStyle(1,health?0x9c4a54:0x9e865c).strokeRoundedRect(x,y,w,h,h/2);
}
export function crystalMenu(h:any){
 const items=[['ui_nav_inventory','持ち物',()=>h.openInventory()],['ui_nav_codex','冒険図鑑',()=>h.setOverlay('codex')],['ui_nav_friends','フレンド',()=>h.townUI?.open('friends')],['ui_nav_guild','ギルド',()=>h.townUI?.open('guild')],['ui_nav_friends','パーティ',()=>h.townUI?.open('party')],['ui_nav_friends','エモート',()=>h.inboxUI?.emotes()],['ui_nav_damage_log','詳細ログ',()=>h.setOverlay('details')],['ui_online_map','マップ',()=>h.townUI?.openMap()]] as const;
 items.forEach(([icon,label,fn],i)=>{const x=1044+i%2*112,y=372+Math.floor(i/2)*47;const g=crystalPanel(h,x,y,108,41);h.add.image(x+20,y+20,icon).setDisplaySize(23,23);h.add.text(x+38,y+20,label,{fontFamily:'Meiryo',fontSize:'11px',color:'#e6f6ff'}).setOrigin(0,.5);h.add.zone(x,y,108,41).setOrigin(0).setInteractive({useHandCursor:true}).on('pointerover',()=>g.setAlpha(.75)).on('pointerout',()=>g.setAlpha(1)).on('pointerdown',()=>{Audio.playSe('click');fn();});});
}
export function crystalStatus(h:any){
 h.expText=undefined;h.lastExpRatio=undefined;h.miniNext=0;const style={fontFamily:'Meiryo',fontSize:'12px',color:'#e5e7ea'};neutralHudPanel(h,8,47,1028,43);const dividers=h.add.graphics();dividers.lineStyle(1,0x989fa5,.3).lineBetween(232,54,232,83).lineBetween(704,54,704,83);h.L.hpBar={x:246,y:75,w:188};
 h.statusText=h.add.text(20,61,'',{...style,fontSize:'13px'});h.hpLabel=h.add.text(246,52,'',{...style,fontSize:'11px'});h.hpBar=h.add.graphics();h.atkLabel=h.add.text(714,61,'',style);h.durabilityLabel=h.add.text(1054,347,'',{...style,fontSize:'9px'});
 h.expBar=h.add.graphics();neutralHudPanel(h,1044,47,228,129,'周辺マップ');h.miniGraphics=h.add.graphics();h.add.zone(1044,47,228,129).setOrigin(0).setInteractive({useHandCursor:true}).on('pointerdown',()=>h.townUI?.openMap());
 h.panel(1044,184,228,180,'装備');h.equipSlots=[];h.equipIconSize=49;
 for(const [kind,tag,x,y,index] of [['weapon','武器',1054,213,0],['armor','服',1164,213,1],['shield','盾',1164,279,2]] as const){const bg=h.add.graphics(),icon=h.add.image(x+28,y+29,'coin').setDisplaySize(49,49),name=h.add.text(x+76,y+29,tag,{...style,fontSize:'10px'}).setOrigin(.5),sub=h.add.text(0,0,'').setVisible(false);h.equipSlots.push({kind,tag,bg,icon,name,sub,rect:[x,y,100,60]});h.add.zone(x,y,100,60).setOrigin(0).setInteractive({useHandCursor:true}).on('pointerover',()=>h.showEquipmentTooltip(kind,x,y)).on('pointerout',()=>h.hideTooltip()).on('pointerdown',()=>{h.hideTooltip();h.pickSlot=index;h.setOverlay('pick');});}
 h.codexText=undefined;h.paperDoll=undefined;
}
export function crystalRefresh(h:any){
 const p=h.gs.player;h.statusText.setText(`${p.name}  Lv.${p.level}`);h.hpLabel.setText(`HP ${p.hp}/${p.hpMax}`);
 if(!h.expText)h.expText=h.add.text(IS_MOBILE?220:458,IS_MOBILE?88:52,'',{fontFamily:'Meiryo',fontSize:IS_MOBILE?'8px':'11px',color:'#bbb7ac'});
 h.expText.setText(`EXP ${p.exp} / ${p.expNext}`);h.expBar??=h.add.graphics();
 resourceBar(h.hpBar,IS_MOBILE?20:246,IS_MOBILE?95:75,IS_MOBILE?180:188,IS_MOBILE?9:10,p.hp/Math.max(1,p.hpMax),true);
 resourceBar(h.expBar,IS_MOBILE?220:458,IS_MOBILE?100:75,IS_MOBILE?148:235,IS_MOBILE?4:10,p.exp/Math.max(1,p.expNext),false);
 h.goldText?.setText(`${p.gold.toLocaleString()} G`);
}
export function crystalMiniMap(h:any,time:number){if(IS_MOBILE||!h.miniGraphics||time<(h.miniNext??0))return;h.miniNext=time+250;const sig=JSON.stringify([h.gs.packet.players,h.gs.packet.adventure?.floor,h.gs.packet.adventure?.snapshot.keys,h.gs.packet.adventure?.snapshot.lightTurns,h.gs.packet.mapPins]);if(h.miniSignature===sig)return;h.miniSignature=sig;const gs=h.gs,g=h.miniGraphics,p=gs.player;g.clear().fillStyle(0x171a1d).fillRect(1054,73,208,91);const sx=1056,sy=74,cell=5,cols=40,rows=17,ox=p.x-20,oy=p.y-8;for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const wx=ox+x,wy=oy+y;if(gs.inDungeon&&!partyCanSee(wx,wy,gs.packet.players,Infinity,(a,b)=>gs.blocked(a,b),gs.packet.adventure.snapshot))continue;g.fillStyle(gs.blocked(wx,wy)?0x292d31:0x747a80).fillRect(sx+x*cell,sy+y*cell,4,4);}h.miniNames??=[];for(const label of h.miniNames)label.destroy();h.miniNames=[];for(const a of gs.packet.players){const x=Math.max(0,Math.min(cols-1,a.x-ox)),y=Math.max(0,Math.min(rows-1,a.y-oy)),isSelf=a.character_id===gs.packet.active?.id;if(x>=0&&x<cols&&y>=0&&y<rows){const color=isSelf?0xffdd81:0x5af1ed;g.lineStyle(1,0x000000).fillStyle(color).fillCircle(sx+x*cell+2,sy+y*cell+2,isSelf?3.5:3).strokeCircle(sx+x*cell+2,sy+y*cell+2,isSelf?3.5:3);if(!isSelf)h.miniNames.push(h.add.text(Math.min(1210,sx+x*cell+6),sy+y*cell-6,a.name,{fontFamily:'Meiryo',fontSize:'9px',color:'#ffffff',stroke:'#000000',strokeThickness:3}).setDepth(20));}}for(const pin of gs.packet.mapPins??[]){const x=pin.x-ox,y=pin.y-oy;if(pin.floor===(gs.packet.adventure?.floor??1)&&x>=0&&x<cols&&y>=0&&y<rows)g.fillStyle(pin.scope==='party'?0xc58bff:0xff9f43).fillTriangle(sx+x*cell+2,sy+y*cell+6,sx+x*cell-2,sy+y*cell-3,sx+x*cell+6,sy+y*cell-3);}}
export function crystalFrames(h:any){const g=h.add.graphics();g.lineStyle(1,0x80ddff,.85).strokeRoundedRect(MAP_X-1,MAP_Y-1,MAP_W+2,MAP_H+2,8);}
