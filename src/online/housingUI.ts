import {HOUSES,HOUSING_DISTRICTS,houseFurniture,houseAtDoor,HOUSING_STALL,gardenFence,housingGround} from './housingCatalog';
import {MAP_X,MAP_Y,MAP_W,MAP_H} from '../layout';
import {TOWN_MIN_X,TOWN_MIN_Y,TOWN_COLUMNS,TOWN_ROWS,TOWN_TILE as T,townBlocked} from './townLayout';
import './housing.css';
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
export function mountHousingUI(scene:any){
 let root:HTMLElement|undefined,mode:'sale'|'settings'='sale',district='north',selected=HOUSES[0].id,pending=false,confirm='';
 const close=()=>{root?.remove();root=undefined;scene.housingModal=false;if(scene.hud?.overlayMode==='housing'){scene.hud.overlayMode='none';scene.hud.townUI?.refresh();}};
 function open(next:'sale'|'settings',id?:string){if(scene.busy)return;scene.stopClickPath();scene.clearMoveInput();scene.housingModal=true;if(scene.hud){scene.hud.overlayMode='housing';scene.hud.townUI?.refresh();}mode=next;confirm='';if(id){selected=id;district=HOUSES.find(h=>h.id===id)?.district??district;}root?.remove();root=node('section');root.className='housing-modal';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',next==='sale'?'住宅案内所':'家の入室設定');document.body.append(root);render();}
 async function act(action:string,payload:Record<string,unknown>){if(pending)return;pending=true;try{await scene.action(action,payload);confirm=action==='house_settings'?'設定を保存しました。':action==='house_buy'?'家を購入しました。':action==='house_sell'?'家を売却し、購入価格の70％を受け取りました。':'';if(root)render();}catch(e){confirm=(e as Error).message;if(root)render();}finally{pending=false;if(root)render();}}
 function render(){if(!root)return;root.replaceChildren();const header=node('header'),title=node('h2',mode==='sale'?'住宅案内所 · 住まいを探す':'水晶 · 入室設定'),exit=node('button','閉じる');exit.onclick=close;header.append(title,exit);root.append(header);
  if(mode==='settings'){
   const h=scene.packet.house;if(!h){close();return;}root.append(node('p',`${h.ownerName}の家 · ${h.name}`));if(!h.mine){root.append(node('p','持ち主だけが設定できます。'));return;}
   const friends=node('input');friends.type='checkbox';friends.checked=h.allowFriends;const guild=node('input');guild.type='checkbox';guild.checked=h.allowGuild;
   const f=node('label','フレンドの入室を許可する '),g=node('label','同じギルドのメンバーの入室を許可する ');f.prepend(friends);g.prepend(guild);root.append(f,g,node('p','両方OFFなら持ち主だけが入れます。権限を外した訪問者は次の更新で外に戻ります。'));
   const save=node('button','設定を保存');save.disabled=pending;save.onclick=()=>void act('house_settings',{allow_friends:friends.checked,allow_guild:guild.checked});root.append(save,node('p',confirm));return;
  }
  root.append(node('p',`所持金 ${(scene.packet.active?.gold??0).toLocaleString()} G · キャラクターごとに1軒 · 持ち主本人はここで購入価格の70％で売却できます`));
  const tabs=node('nav');for(const d of HOUSING_DISTRICTS){const b=node('button',d.name);b.classList.toggle('selected',district===d.id);b.onclick=()=>{district=d.id;selected=HOUSES.find(h=>h.district===d.id)!.id;confirm='';render();};tabs.append(b);}root.append(tabs);
  const content=node('div');content.className='housing-catalog';const list=node('div');list.className='housing-house-list';
  for(const h of HOUSES.filter(h=>h.district===district)){const owned=scene.packet.houses?.find((x:any)=>x.id===h.id),b=node('button');b.className='housing-card'+(selected===h.id?' selected':'');const icon=node('div');icon.className='housing-thumbnail';icon.style.backgroundImage=`url(assets/online/housing-v1/${h.district}.webp)`;icon.style.backgroundPosition=`${(h.tier-1)%3*50}% ${Math.floor((h.tier-1)/3)*50}%`;b.append(icon,node('strong',h.name),node('span',`${h.price.toLocaleString()} G`),node('small',owned?.ownerId?`${owned.ownerName}の家`:`${h.width-2}×${h.height-2}マス · 販売中`));b.onclick=()=>{selected=h.id;confirm='';render();};list.append(b);}
  const h=HOUSES.find(h=>h.id===selected)!,owned=scene.packet.houses?.find((x:any)=>x.id===h.id),detail=node('aside');detail.append(node('h3',h.name),node('p',`${h.price.toLocaleString()} G`),node('p',`室内 ${h.width-2}×${h.height-2}マス。ベッド・机・入室設定の水晶付き。${h.tier===9?'最高級の寝室、長椅子とグランドピアノを備えた超豪華邸宅。':''}`),node('p',`扉の位置 (${h.doorX}, ${h.doorY})。購入後は住宅区の扉から入れます。`));
  const buy=node('button',owned?.ownerId?`${owned.ownerName}が所有`:confirm===`buy:${h.id}`?'この家を購入する':`${h.price.toLocaleString()} Gで購入`);buy.disabled=pending||!!owned?.ownerId||!!scene.packet.houses?.some((x:any)=>x.mine)||(scene.packet.active?.gold??0)<h.price;buy.onclick=()=>{if(confirm!==`buy:${h.id}`){confirm=`buy:${h.id}`;render();return;}void act('house_buy',{house_id:h.id});};detail.append(buy);if(owned?.mine){const refund=owned.resalePrice??Math.floor(h.price*.7),sell=node('button',confirm===`sell:${h.id}`?`${refund.toLocaleString()} Gで売却を確定`:`この家を売却 · ${refund.toLocaleString()} G`);sell.disabled=pending;sell.onclick=()=>{if(confirm!==`sell:${h.id}`){confirm=`sell:${h.id}`;render();return;}void act('house_sell',{house_id:h.id});};detail.append(sell);}detail.append(node('p',confirm.startsWith('sell:')?'購入価格の70％が戻ります。家の所有権と入室設定は解除され、訪問者は町へ戻ります。もう一度押すと確定します。':confirm.startsWith('buy:')?'購入すると所持金から差し引かれます。もう一度押すと確定します。':confirm));content.append(list,detail);root.append(content);
 }
 return{sale:(id?:string)=>open('sale',id),settings:()=>open('settings'),close,destroy:close};
}
export function mountHousingTown(scene:any){
 const grass=scene.add.tileSprite((TOWN_MIN_X+TOWN_COLUMNS/2)*T,(TOWN_MIN_Y+TOWN_ROWS/2)*T,TOWN_COLUMNS*T,TOWN_ROWS*T,'online_town_grass',0).setTileScale(T/128).setDepth(-1000);
 const grid=scene.add.graphics().setDepth(-998);
 // Garden lawns are walkable; only the visible stone-and-iron fence is solid.
 for(const h of HOUSES){
  scene.add.tileSprite((h.x+h.w/2)*T,(h.doorY+2)*T,h.w*T,3*T,'online_town_grass',0).setTileScale(T/128).setDepth(-997);
  const path=scene.add.graphics().setDepth(-996);path.fillStyle(0xb9ad83,.8);
  for(let y=h.doorY+1;y<h.doorY+4;y++)path.fillRoundedRect((h.doorX+.16)*T,(y+.15)*T,T*.68,T*.7,4);
 }
 const ground=(x:number,y:number)=>(x>=1&&x<=23&&y>=1&&y<=17)||(x>=9&&x<=15&&y>=-2&&y<=20)||(y>=7&&y<=11&&x>=-2&&x<=26)||housingGround(x,y);
 for(let y=TOWN_MIN_Y;y<TOWN_MIN_Y+TOWN_ROWS;y++)for(let x=TOWN_MIN_X;x<TOWN_MIN_X+TOWN_COLUMNS;x++){
  const perimeter=!ground(x,y)&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>ground(x+dx,y+dy));
  if(!perimeter&&!gardenFence(x,y))continue;
  const fence=scene.add.graphics().setPosition(x*T,y*T).setDepth(y+.85);
  const isFence=(xx:number,yy:number)=>gardenFence(xx,yy)||!ground(xx,yy)&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>ground(xx+dx,yy+dy));
  const vertical=isFence(x,y-1)||isFence(x,y+1),horizontal=isFence(x-1,y)||isFence(x+1,y);
  if(vertical){fence.fillStyle(0x283733).fillRect(18,-4,15,T+8);fence.fillStyle(0x879184).fillRect(18,-4,6,T+8);fence.lineStyle(1,0x172324,.8);for(let n=0;n<3;n++)fence.strokeRect(18,n*16,15,16);fence.fillStyle(0xb2b295).fillRect(16,0,19,5);}
  if(!horizontal)continue;
  fence.fillStyle(0x243233).fillRect(0,19,T,19);fence.fillStyle(0x708078).fillRect(0,17,T,5);
  fence.lineStyle(1,0x172324,.8);for(let n=0;n<3;n++)fence.strokeRect(n*16,23,16,13);
  fence.fillStyle(0x253236);for(let n=5;n<T;n+=10){fence.fillRect(n,2,3,19);fence.fillTriangle(n-2,4,n+1,-2,n+4,4);}
  fence.fillStyle(0xb2b295).fillRect(0,14,T,2);fence.fillStyle(0x899184).fillRect(0,10,5,29);fence.fillRect(T-5,10,5,29);
 }
 for(let y=TOWN_MIN_Y;y<TOWN_MIN_Y+TOWN_ROWS;y++){
  let x=TOWN_MIN_X;while(x<TOWN_MIN_X+TOWN_COLUMNS){if((x>=0&&x<25&&y>=0&&y<19)||townBlocked(x,y)){x++;continue;}const start=x;while(x<TOWN_MIN_X+TOWN_COLUMNS&&!(x>=0&&x<25&&y>=0&&y<19)&&!townBlocked(x,y))x++;scene.add.tileSprite((start+x)/2*T,(y+.5)*T,(x-start)*T,T,'online_town_floor',(y+100)%6).setTileScale(T/64).setDepth(-999);for(let xx=start;xx<x;xx++)grid.lineStyle(1,0x18251e,.25).strokeRect(xx*T,y*T,T,T);}
 }
 for(const d of HOUSING_DISTRICTS)scene.add.text((d.x+16.5)*T,(d.y+32)*T,d.name,{fontFamily:'Meiryo',fontSize:'22px',color:'#ffe8af',backgroundColor:'#10231bd9',padding:{x:12,y:6}}).setOrigin(.5).setDepth(90);
 for(const h of HOUSES){const art=scene.add.image((h.x+h.w/2)*T,(h.y+h.h)*T,'housing_'+h.district,h.tier-1).setOrigin(.5,1).setDisplaySize((h.w+1.5)*T,(h.h+2)*T).setDepth(h.doorY+.8).setInteractive();art.on('pointerover',()=>scene.hoverHousing=h.id);art.on('pointerout',()=>scene.hoverHousing=undefined);art.on('pointerdown',(_p:any,_x:any,_y:any,event:any)=>{event?.stopPropagation();scene.approachHouse(h.id);});const door=scene.add.zone((h.doorX+.5)*T,(h.doorY+.6)*T,T*1.3,T*1.5).setDepth(h.doorY+1).setInteractive();door.on('pointerover',()=>scene.hoverHousing=h.id);door.on('pointerout',()=>scene.hoverHousing=undefined);door.on('pointerdown',(_p:any,_x:any,_y:any,event:any)=>{event?.stopPropagation();scene.approachHouse(h.id);});scene.add.text((h.doorX+.5)*T,(h.doorY+1)*T+3,`${h.name.split(' · ')[0]} · ${h.price/10000}万G`,{fontFamily:'Meiryo',fontSize:'12px',color:'#ffe6b4',backgroundColor:'#10231bc9',padding:{x:4,y:2}}).setOrigin(.5,0).setDepth(h.doorY+1.1);}
 const booth=scene.add.image((HOUSING_STALL.x+.5)*T,(HOUSING_STALL.y+1)*T,'housing_booth').setOrigin(.5,1).setDisplaySize(150,150).setDepth(3).setInteractive();booth.on('pointerover',()=>scene.hoverHousing='sale');booth.on('pointerout',()=>scene.hoverHousing=undefined);booth.on('pointerdown',(_p:any,_x:any,_y:any,event:any)=>{event?.stopPropagation();scene.approachHouse('sale');});scene.add.text(16.5*T,3*T+5,'住宅案内所',{fontFamily:'Meiryo',fontSize:'13px',color:'#ffe5a3',backgroundColor:'#10231bc9',padding:{x:5,y:3}}).setOrigin(.5).setDepth(90);
 return grass;
}
export function mountHouseInterior(scene:any){
 const h=scene.packet.house;scene.cameras.main.setViewport(MAP_X,MAP_Y,MAP_W,MAP_H).setBounds(0,0,h.width*T,h.height*T).setBackgroundColor('#0a1018');
 const luxurious=h.tier>=7;for(let y=0;y<h.height;y++)for(let x=0;x<h.width;x++){const border=x===0||y===0||x===h.width-1||y===h.height-1;scene.add.image((x+.5)*T,(y+.5)*T,border?'adventure_wall':'housing_floor',border?undefined:luxurious?1:0).setDisplaySize(T,T).setDepth(-4);}
 const rug=scene.add.image(h.width*T/2,h.height*T*.6,'housing_furniture',10).setDisplaySize(Math.min(7,h.width-5)*T,3*T).setDepth(-3).setAlpha(.85);
 for(const f of houseFurniture(h.width,h.height,h.tier)){const img=scene.add.image((f.x+f.w/2)*T,(f.y+f.h)*T,'housing_furniture',f.frame).setOrigin(.5,1).setDisplaySize((f.w+.4)*T,(f.h+.5)*T).setDepth(f.y+f.h-.1);if(f.kind==='crystal'){img.setInteractive();img.on('pointerover',()=>scene.hoverHousing='settings');img.on('pointerout',()=>scene.hoverHousing=undefined);img.on('pointerdown',(_p:any,_x:any,_y:any,event:any)=>{event?.stopPropagation();scene.approachHouse('settings');});scene.tweens.add({targets:img,alpha:.7,duration:1300,yoyo:true,repeat:-1});}}
 const exit=scene.add.image((Math.floor(h.width/2)+.5)*T,(h.height-.2)*T,'housing_furniture',11).setOrigin(.5,1).setDisplaySize(T*1.5,T*2).setDepth(h.height).setInteractive();exit.on('pointerover',()=>scene.hoverHousing='exit');exit.on('pointerout',()=>scene.hoverHousing=undefined);exit.on('pointerdown',(_p:any,_x:any,_y:any,event:any)=>{event?.stopPropagation();scene.approachHouse('exit');});scene.add.text(h.width*T/2,(h.height-1)*T,'町へ出る',{fontFamily:'Meiryo',fontSize:'12px',color:'#ffe5a3',backgroundColor:'#10231bc9',padding:{x:4,y:2}}).setOrigin(.5).setDepth(h.height+.1);
}
