import type Phaser from 'phaser';
import {houses,props,ground,TILE as T,MIN_X,MIN_Y,MAX_X,MAX_Y} from './gardenMap';
import {plazaObjects} from './gardenPlaza';
const W=(MAX_X-MIN_X+1)*T,H=(MAX_Y-MIN_Y+1)*T;
export function preloadGarden(scene:Phaser.Scene){
 for(const k of ['estate','barber','lottery','market'])scene.load.image(k,`assets/online/town-services-v1/${k}.png`);
 for(let i=0;i<12;i++)scene.load.image('house'+i,`assets/online/town-garden-v2/house-${i}.webp`);
 for(const k of ['wallH','wallV','post','gate','oak','cypress','shrub','flowers','lamp','bench','statue','banner'])scene.load.image(k,`assets/online/town-garden-v2/${k}.webp`);
 for(let i=0;i<6;i++)scene.load.image('tile'+i,`assets/online/town-garden-v2/tile-${i}.webp`);
 scene.load.image('inn_open_door','assets/online/inn-v1/open-door.webp');
 scene.load.image('coolPaving','assets/online/town-garden-v2/cool-paving-v1.png');
}
export function mountGarden(scene:Phaser.Scene){
 const art=(key:string,x:number,y:number,w:number,h:number,frame?:number,origin=1)=>scene.add.image((x+.5)*T,(y+1)*T,key,frame).setOrigin(.5,origin).setDisplaySize(w,h).setDepth(y+.8);
  for(let i=0;i<6;i++){const texture=scene.textures.get('tile'+i),source=texture.getSourceImage();for(let row=0;row<4;row++)for(let col=0;col<4;col++)texture.add(row*4+col,0,col*source.width/4,row*source.height/4,source.width/4,source.height/4);}
  const paving=scene.textures.get('coolPaving'),pavingSource=paving.getSourceImage();
  for(let style=0;style<4;style++)for(let row=0;row<4;row++)for(let col=0;col<4;col++)paving.add(style*16+row*4+col,0,(style%2*4+col)*pavingSource.width/8,(Math.floor(style/2)*4+row)*pavingSource.height/8,pavingSource.width/8,pavingSource.height/8);
  // The pale plaza quadrant contains 3 x 3 slabs, not 4 x 4.
  for(let row=0;row<3;row++)for(let col=0;col<3;col++)paving.add(100+row*3+col,0,col*pavingSource.width/6,row*pavingSource.height/6,pavingSource.width/6,pavingSource.height/6);
  // Bake only the repeating floor. Every house, gate and garden object remains an individual sprite.
  const floor=scene.add.renderTexture(MIN_X*T,MIN_Y*T,W,H).setOrigin(0).setDepth(-1000);
  const stamp=scene.make.image({key:'tile2',add:false}).setOrigin(0);
  for(let y=MIN_Y;y<=MAX_Y;y++)for(let x=MIN_X;x<=MAX_X;x++){
   const kind=ground(x,y),central=x>=0&&x<=24&&y>=0&&y<=18;
   const garden=houses.find(h=>x===h.doorX&&y>h.doorY&&y<=h.plotY+12);
   const luxury=garden?.tier===9&&y<=garden.doorY+2;
   const style=central?0:luxury||Math.abs(x-12)<=2&&(Math.abs(y+6)<=1||Math.abs(y-22)<=1)?3:garden?2:1;
   const grass=!central&&kind==='grass';
   stamp.setTexture(grass?'tile2':'coolPaving',central?100+(y%3)*3+x%3:(grass?0:style*16)+((y-MIN_Y)%4)*4+(x-MIN_X)%4).setDisplaySize(T+.3,T+.3).clearTint();floor.draw(stamp,(x-MIN_X)*T,(y-MIN_Y)*T);
  }stamp.destroy();
  // Ivory curbs follow actual paving edges without changing the walkable tiles.
  const trim=scene.add.graphics().setDepth(-950),paved=(x:number,y:number)=>x>=MIN_X&&x<=MAX_X&&y>=MIN_Y&&y<=MAX_Y&&ground(x,y)!=='grass';
  // Exactly one visible slab per 48px movement cell, like the original town.
  trim.lineStyle(1.5,0x56656b,.65);for(let y=0;y<=18;y++)for(let x=0;x<=24;x++)trim.strokeRect(x*T,y*T,T,T);
  for(let y=MIN_Y;y<=MAX_Y;y++)for(let x=MIN_X;x<=MAX_X;x++)if(paved(x,y)){
   trim.fillStyle(0xe9e2cb,.95);const px=x*T,py=y*T;
   if(!paved(x-1,y))trim.fillRect(px,py,6,T);if(!paved(x+1,y))trim.fillRect(px+T-6,py,6,T);
   if(!paved(x,y-1))trim.fillRect(px,py,T,6);if(!paved(x,y+1))trim.fillRect(px,py+T-6,T,6);
  }
  trim.lineStyle(7,0xe9e2cb,.9).strokeCircle(12.5*T,9.5*T,2.3*T);
  trim.lineStyle(2,0xb6a16c,.65).strokeCircle(12.5*T,9.5*T,2.45*T);
  for(const p of props){
   const wall=p.kind==='wallH'||p.kind==='wallV';
   art(p.kind,p.x,p.y,p.w*T,p.h*T*(p.kind==='wallH'?.7:p.kind==='wallV'?1.2:1),undefined,wall?.62:1);
   if(p.kind==='lamp'){const light=scene.add.ellipse((p.x+.5)*T,(p.y-.65)*T,35,35,0xffd77a,.09).setDepth(p.y+1.1);scene.tweens.add({targets:light,alpha:.45,duration:1200+(p.x+25)*20,yoyo:true,repeat:-1});}
  }

 const houseSprites=new Map<string,Phaser.GameObjects.Image>();
 for(const h of houses)houseSprites.set(h.id,art('house'+h.art,h.x+h.w/2-.5,h.doorY,h.w*T,(h.h+.5)*T));
 const aliases:Record<string,string>={oldprops:'online_town_props',warehouse:'online_warehouse_open',booth:'housing_booth',gacha:'online_gacha_machine',barrel:'online_training_barrel',npcs:'online_npcs_v1'};
 const plaza=new Map<string,Phaser.GameObjects.Image>();
 const innDoor=scene.add.image(3.643*T,3.62*T,'inn_open_door').setOrigin(.5,1).setDisplaySize(51,72).setDepth(3.81);
 for(const o of plazaObjects){if(o.key==='npcs')continue;plaza.set(o.label,art(aliases[o.key]??o.key,o.x+(o.w-1)/2,o.y+o.h-1,('artW'in o?o.artW!:o.w)*T,o.artH*T,'frame'in o?o.frame:undefined));}
 const fountain=art('online_town_fountain',12,10,144,144);scene.tweens.add({targets:fountain,alpha:.88,duration:1600,yoyo:true,repeat:-1});
 plaza.set('冒険者の宿',innDoor);
 return {houseSprites,plaza};
}
