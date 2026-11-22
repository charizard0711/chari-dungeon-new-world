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
 if(title)frame.add(scene.add.text(x+16,y+7,title,{fontFamily:'Meiryo',fontSize:'12px',color:'#d7f1ff',fontStyle:'bold'}));return frame;
}
export function crystalMenu(h:any){
 const items=[['ui_nav_inventory','持ち物',()=>h.openInventory()],['ui_nav_codex','冒険図鑑',()=>h.setOverlay('codex')],['ui_nav_friends','フレンド',()=>h.townUI?.open('friends')],['ui_nav_guild','ギルド',()=>h.townUI?.open('guild')],['ui_nav_friends','パーティ',()=>h.townUI?.open('party')],['ui_nav_settings','設定',()=>h.showSettings()],['ui_nav_damage_log','詳細ログ',()=>h.setOverlay('details')],['ui_online_map','マップ',()=>h.townUI?.openMap()]] as const;
 items.forEach(([icon,label,fn],i)=>{const x=1044+i%2*112,y=372+Math.floor(i/2)*47;const g=crystalPanel(h,x,y,108,41);h.add.image(x+20,y+20,icon).setDisplaySize(23,23);h.add.text(x+38,y+20,label,{fontFamily:'Meiryo',fontSize:'11px',color:'#e6f6ff'}).setOrigin(0,.5);h.add.zone(x,y,108,41).setOrigin(0).setInteractive({useHandCursor:true}).on('pointerover',()=>g.setAlpha(.75)).on('pointerout',()=>g.setAlpha(1)).on('pointerdown',()=>{Audio.playSe('click');fn();});});
}
export function crystalStatus(h:any){
 h.expText=undefined;h.miniNext=0;const style={fontFamily:'Meiryo',fontSize:'12px',color:'#dfedff'};h.panel(8,47,1028,43);h.L.hpBar={x:287,y:64,w:158};
 h.statusText=h.add.text(20,61,'',style);h.hpLabel=h.add.text(198,61,'',style);h.hpBar=h.add.graphics();h.atkLabel=h.add.text(660,61,'',style);h.durabilityLabel=h.add.text(1054,347,'',{...style,fontSize:'9px'});
 h.panel(1044,47,228,129,'周辺マップ');h.miniGraphics=h.add.graphics();h.add.zone(1044,47,228,129).setOrigin(0).setInteractive({useHandCursor:true}).on('pointerdown',()=>h.townUI?.openMap());
 h.panel(1044,184,228,180,'装備');h.equipSlots=[];h.equipIconSize=49;
 for(const [kind,tag,x,y,index] of [['weapon','武器',1054,213,0],['armor','服',1164,213,1],['shield','盾',1164,279,2]] as const){const bg=h.add.graphics(),icon=h.add.image(x+28,y+29,'coin').setDisplaySize(49,49),name=h.add.text(x+76,y+29,tag,{...style,fontSize:'10px'}).setOrigin(.5),sub=h.add.text(0,0,'').setVisible(false);h.equipSlots.push({kind,tag,bg,icon,name,sub,rect:[x,y,100,60]});h.add.zone(x,y,100,60).setOrigin(0).setInteractive({useHandCursor:true}).on('pointerover',()=>h.showEquipmentTooltip(kind,x,y)).on('pointerout',()=>h.hideTooltip()).on('pointerdown',()=>{h.hideTooltip();h.pickSlot=index;h.setOverlay('pick');});}
 h.codexText=undefined;h.paperDoll=undefined;
}
export function crystalRefresh(h:any){if(IS_MOBILE)return;const p=h.gs.player;h.statusText.setText(`${p.name}  Lv.${p.level}`).setFontSize(13);h.hpLabel.setText(`HP ${p.hp}/${p.hpMax}`).setFontSize(11);if(!h.expText)h.expText=h.add.text(460,61,'',{fontFamily:'Meiryo',fontSize:'11px',color:'#aacbdd'});h.expText.setText(`EXP ${p.exp} / ${p.expNext}`);h.goldText?.setText(`${p.gold.toLocaleString()} G`).setFontSize(16);}
export function crystalMiniMap(h:any,time:number){if(IS_MOBILE||!h.miniGraphics||time<(h.miniNext??0))return;h.miniNext=time+250;const gs=h.gs,g=h.miniGraphics,p=gs.player;g.clear().fillStyle(0x06101e).fillRect(1054,73,208,91);const sx=1056,sy=74,cell=5,cols=40,rows=17,ox=p.x-20,oy=p.y-8;for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const wx=ox+x,wy=oy+y;if(gs.inDungeon&&!partyCanSee(wx,wy,gs.packet.players,3,(a,b)=>gs.blocked(a,b),gs.packet.adventure.snapshot))continue;g.fillStyle(gs.blocked(wx,wy)?0x1f384a:0x688b9c).fillRect(sx+x*cell,sy+y*cell,4,4);}for(const a of gs.packet.players){const x=a.x-ox,y=a.y-oy;if(x>=0&&x<cols&&y>=0&&y<rows)g.fillStyle(a.character_id===gs.packet.active?.id?0xffdd81:0x5af1ed).fillCircle(sx+x*cell+2,sy+y*cell+2,2.8);}}
export function crystalFrames(h:any){const g=h.add.graphics();g.lineStyle(1,0x80ddff,.85).strokeRoundedRect(MAP_X-1,MAP_Y-1,MAP_W+2,MAP_H+2,8);}
