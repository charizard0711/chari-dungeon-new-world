import type Phaser from 'phaser';

export const VESPER_ART='vesper_greatsword';
export const RETAINER_ART='vesper_retainer';
export const VESPER_SWING_MS=570;
export const VESPER_STRIKE_MS=170;
const WALK='vesper_walk_v2',SWING='vesper_swing_v2';
type Sheet={key:string;columns:number[];rows:number[];hipX:number[];soleY:number[]};
const swing:Sheet={
 key:SWING,columns:[0,276,602,897,1199],rows:[0,313,665,977,1312],
 hipX:[165,453,741,1030],soleY:[293,634,932,1257],
};
const walk:Sheet={
 key:WALK,columns:[0,297,600,896,1199],rows:[0,328,656,984,1312],
 hipX:[166,457,736,1032],soleY:[296,625,955,1283],
};
const artScale=138/299;

export function preloadVesper(scene:Phaser.Scene,animated=false){
 if(!scene.textures.exists(VESPER_ART)){
  scene.load.spritesheet(VESPER_ART,'assets/online/vesper-greatsword-v1/poses.png',{frameWidth:299,frameHeight:328});
 }
 if(!scene.textures.exists('vesper_stab_floor')){
  scene.load.image('vesper_stab_floor','assets/online/vesper-greatsword-v1/stab-floor.png');
 }
 if(animated){
  if(!scene.textures.exists(RETAINER_ART))scene.load.spritesheet(RETAINER_ART,'assets/online/vesper-retainer-v1/poses.webp',{frameWidth:299,frameHeight:328});
  for(const name of ['walk','swing'])if(!scene.textures.exists(RETAINER_ART+'_'+name))scene.load.image(RETAINER_ART+'_'+name,'assets/online/vesper-retainer-v1/'+name+'.webp');
  if(!scene.textures.exists(WALK))scene.load.image(WALK,'assets/online/vesper-greatsword-v2/walk.png');
  if(!scene.textures.exists(SWING))scene.load.image(SWING,'assets/online/vesper-greatsword-v2/swing.png');
 }
}

export function prepareVesperMotion(scene:Phaser.Scene){
 for(const sheet of [walk,swing,{...walk,key:RETAINER_ART+'_walk'},{...swing,key:RETAINER_ART+'_swing'}]){
  if(!scene.textures.exists(sheet.key))continue;
  const texture=scene.textures.get(sheet.key);
  if(texture.has('0'))continue;
  for(let row=0;row<4;row++)for(let direction=0;direction<4;direction++){
   const x=sheet.columns[direction],y=sheet.rows[row];
   const width=sheet.columns[direction+1]-x,height=sheet.rows[row+1]-y;
   texture.add(String(row*4+direction),0,x,y,width,height);
  }
 }
}

export function applyVesperMotion(body:Phaser.GameObjects.Image,direction:number,stride:number|undefined,swingAge:number,retainer=false){
 const attacking=swingAge>=0&&swingAge<VESPER_SWING_MS;
 const sheet=attacking?swing:stride!==undefined?walk:undefined;
 const key=sheet&&(retainer?RETAINER_ART+(attacking?'_swing':'_walk'):sheet.key),base=retainer?RETAINER_ART:VESPER_ART,scale=retainer?.52:1;
 if(sheet&&key&&body.scene.textures.exists(key)){
  const phase=Math.min(3,Math.floor((stride??0)*4));
  const row=attacking?(swingAge<76?0:swingAge<VESPER_STRIKE_MS?1:swingAge<260?2:3)
   :direction===0||direction===3?[0,2,3,1][phase]:phase;
  const frame=String(row*4+direction);
  if(body.texture.key===key&&body.frame.name===frame)return;
  body.setTexture(key,frame).setScale(artScale*scale).setOrigin(
   (sheet.hipX[direction]-sheet.columns[direction])/body.frame.width,
   (sheet.soleY[row]+8-sheet.rows[row])/body.frame.height,
  );
 }else{
  const frame=direction+(attacking?(swingAge<VESPER_STRIKE_MS?8:12):stride!==undefined&&stride>=.5?4:0);
  if(body.texture.key===base&&String(body.frame.name)===String(frame))return;
  body.setTexture(base,frame).setOrigin(.5,.91).setDisplaySize(138*scale,151*scale);
 }
}

export function drawVesperSlash(graphics:Phaser.GameObjects.Graphics,x:number,y:number,direction:number,progress:number,retainer=false){
 const heading=[Math.PI/2,Math.PI,0,-Math.PI/2][direction];
 const end=heading-.85+2.2*Math.min(1,progress*2.2);
 const start=Math.max(heading-1.15,end-1.8);
 const fade=Math.max(0,1-progress);
 for(const [radius,width,color,alpha] of [[53,14,0x7531c8,.38],[52,6,0xb977ff,.82],[50,2,0xffe8ff,1]]){
  graphics.lineStyle(width*(retainer?.64:1),retainer?(width===2?0xedffbd:0xafdd51):color,fade*alpha);
  graphics.beginPath();
  for(let i=0;i<=20;i++){
   const angle=start+(end-start)*i/20,px=x+Math.cos(angle)*radius*(retainer?.65:1),py=y+Math.sin(angle)*radius*(retainer?.42:.65);
   if(i===0)graphics.moveTo(px,py);else graphics.lineTo(px,py);
  }
  graphics.strokePath();
 }
 for(let i=0;i<7;i++){
  const angle=heading+(i-3)*.24,distance=35+progress*(36+i*3);
  graphics.fillStyle(i%2?0xf9c5ff:0x9e6aff,fade*.85).fillCircle(x+Math.cos(angle)*distance,y+Math.sin(angle)*distance*.66,2.3-progress);
 }
}
