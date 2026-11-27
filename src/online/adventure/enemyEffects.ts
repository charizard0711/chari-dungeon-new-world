/** Shared atlas, six frames per attack, bounded pool; no new texture per hit. */
export function preloadEnemyEffects(scene:any){if(!scene.textures.exists('enemy_fx'))scene.load.image('enemy_fx_source','assets/online/combat-fx-v2/enemy-attacks.png');}
export function enemyEffectKind(e:{key:string;boss?:boolean;rangedAttack?:boolean}){
 if(e.rangedAttack||/wisp|ghost|mage|witch|lich/.test(e.key))return 3;
 if(e.boss||/golem|guard|bull|ogre|giant|jelly|mush/.test(e.key))return 2;
 return /bat|spider|snake|wolf/.test(e.key)?1:0;
}
export function mountEnemyEffects(scene:any){
 if(!scene.textures.exists('enemy_fx')){const source=scene.textures.get('enemy_fx_source').getSourceImage(),canvas=document.createElement('canvas');canvas.width=768;canvas.height=512;canvas.getContext('2d')!.drawImage(source,0,0,768,512);const texture=scene.textures.addCanvas('enemy_fx',canvas);for(let i=0;i<24;i++)texture.add(i,0,i%6*128,Math.floor(i/6)*128,128,128);scene.textures.remove('enemy_fx_source');}
 for(let row=0;row<4;row++)if(!scene.anims.exists('enemy_fx_'+row))scene.anims.create({key:'enemy_fx_'+row,frames:Array.from({length:6},(_,i)=>({key:'enemy_fx',frame:row*6+i})),frameRate:24,repeat:0});
 const pool:any[]=[];let cursor=0;
 const effect=(kind:number,x:number,y:number,size:number)=>{let sprite=pool.find(s=>!s.active);if(!sprite&&pool.length<24){sprite=scene.add.sprite(0,0,'enemy_fx').setBlendMode(1);sprite.on('animationcomplete',()=>sprite.setActive(false).setVisible(false));pool.push(sprite);}sprite??=pool[cursor++%pool.length];scene.tweens.killTweensOf(sprite);sprite.anims.stop();sprite.setActive(true).setVisible(true).setPosition(x,y).setDisplaySize(size,size).setAngle(0).setAlpha(.92).setDepth(38).play('enemy_fx_'+kind);return sprite;};
 return{attack(e:any,origin:{x:number;y:number},target?:{x:number;y:number},onImpact?:(x:number,y:number)=>void){
  if(!target)return;const kind=enemyEffectKind(e),x=(target.x+.5)*48,y=(target.y+.4)*48;
  const view=scene.cameras.main.worldView;if(view&&(x<view.x-96||x>view.right+96||y<view.y-96||y>view.bottom+96))return;
  const size=e.boss?88:kind===2?72:60;
  if(e.rangedAttack){const bolt=effect(3,origin.x,origin.y-20,34);scene.tweens.killTweensOf(bolt);scene.tweens.add({targets:bolt,x,y,duration:170,onComplete:()=>{if(bolt.active)bolt.setActive(false).setVisible(false);effect(kind,x,y,size);onImpact?.(x,y);}});}
  else {effect(kind,x,y,size);onImpact?.(x,y);}
 },area(tiles:readonly {x:number;y:number}[],kind=3){const v=scene.cameras.main.worldView;let shown=0;for(const t of tiles){const x=(t.x+.5)*48,y=(t.y+.5)*48;if(v&&(x<v.x-48||x>v.right+48||y<v.y-48||y>v.bottom+48))continue;effect(kind,x,y,62);if(++shown>=24)break;}},destroy(){for(const sprite of pool){scene.tweens.killTweensOf(sprite);sprite.destroy();}pool.length=0;}};
}
