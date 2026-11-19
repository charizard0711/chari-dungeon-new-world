import type Phaser from 'phaser';
export const SHIELD_MIST_KEY='legendary_shield_mist_v2';
/** A dedicated soft texture avoids rendering an unloaded shared effect placeholder. */
export function ensureShieldMist(scene:Phaser.Scene){
 if(scene.textures.exists(SHIELD_MIST_KEY))return;
 const texture=scene.textures.createCanvas(SHIELD_MIST_KEY,128,128);if(!texture)return;
 const ctx=texture.context,gradient=ctx.createRadialGradient(64,64,3,64,64,62);
 gradient.addColorStop(0,'rgba(40,20,55,.55)');gradient.addColorStop(.38,'rgba(17,10,28,.48)');gradient.addColorStop(.72,'rgba(9,5,18,.18)');gradient.addColorStop(1,'rgba(9,5,18,0)');
 ctx.clearRect(0,0,128,128);ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);texture.refresh();
}
