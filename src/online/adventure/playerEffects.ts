/** Compact six-frame player impacts. Fixed pool, shared atlas, no texture per hit. */
export function preloadPlayerEffects(scene:any){if(!scene.textures.exists('player_hit_fx'))scene.load.image('player_hit_fx_source','assets/online/combat-fx-v2/player-hits.png');}
export function playerEffectKind(type?:string){return type==='greatsword'?1:type==='lance'?2:type==='bow'?3:type==='handgun'?4:type==='magic'||type==='staff'?5:0;}
export function mountPlayerEffects(scene:any){
 if(!scene.textures.exists('player_hit_fx')){const canvas=document.createElement('canvas');canvas.width=768;canvas.height=768;canvas.getContext('2d')!.drawImage(scene.textures.get('player_hit_fx_source').getSourceImage(),0,0,768,768);const atlas=scene.textures.addCanvas('player_hit_fx',canvas);for(let i=0;i<36;i++)atlas.add(i,0,i%6*128,Math.floor(i/6)*128,128,128);scene.textures.remove('player_hit_fx_source');}
 for(let row=0;row<6;row++)if(!scene.anims.exists('player_hit_'+row))scene.anims.create({key:'player_hit_'+row,frames:Array.from({length:6},(_,i)=>({key:'player_hit_fx',frame:row*6+i})),frameRate:30,repeat:0});
 const pool:any[]=[];let cursor=0;
 return {hit(type:string|undefined,x:number,y:number,dir='right',scale=1){
  const view=scene.cameras.main.worldView;if(view&&(x<view.x-72||x>view.right+72||y<view.y-72||y>view.bottom+72))return;
  let sprite=pool.find(s=>!s.active);if(!sprite&&pool.length<24){sprite=scene.add.sprite(x,y,'player_hit_fx').setBlendMode(1);sprite.on('animationcomplete',()=>sprite.setActive(false).setVisible(false));pool.push(sprite);}sprite??=pool[cursor++%pool.length];sprite.anims.stop();const kind=playerEffectKind(type);const size=(kind===1?76:kind===2?56:kind===3||kind===4?43:59)*scale;sprite.setPosition(x,y).setDisplaySize(size,size).setAngle(kind===2?dir==='up'?-90:dir==='down'?90:dir==='left'?180:0:0).setFlipX(dir==='left').setAlpha(.95).setDepth(118).setActive(true).setVisible(true).play('player_hit_'+kind);
 },destroy(){for(const s of pool)s.destroy();pool.length=0;}};
}
