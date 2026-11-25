import type Phaser from 'phaser';
export const UNIFIED_CLOSE_TEXTURE='zero_modal_close';
/** Neutral silver/charcoal frame shared with the settings and codex DOM windows. */
export function unifiedModalFrame(scene:Phaser.Scene,x:number,y:number,w:number,h:number){
 const g=scene.add.graphics();
 g.fillStyle(0x101b24,.99).fillRoundedRect(x,y,w,h,4);
 g.lineStyle(1,0x9db5c2,.9).strokeRoundedRect(x,y,w,h,4);
 g.lineStyle(1,0x90b5c7,.25).strokeRect(x+5,y+5,w-10,h-10);
 g.lineStyle(1,0x9ab4c1,.3).lineBetween(x+1,y+58,x+w-1,y+58);
 for(const [cx,cy,dx,dy]of [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]){
  g.lineStyle(2,0xb4edf8,.55).beginPath().moveTo(cx+dx*3,cy+dy*23).lineTo(cx+dx*3,cy+dy*3).lineTo(cx+dx*23,cy+dy*3).strokePath();
  g.lineStyle(1,0xa8d7e6,.5).lineBetween(cx+dx*6,cy+dy*18,cx+dx*18,cy+dy*6);
 }
 if(!scene.textures.exists(UNIFIED_CLOSE_TEXTURE)){
  const close=scene.add.graphics();close.fillStyle(0x21323e).fillRoundedRect(1,1,38,38,4).lineStyle(1,0x8ba6b6).strokeRoundedRect(1,1,38,38,4);
  close.lineStyle(2,0xe8f1f6).lineBetween(13,13,27,27).lineBetween(27,13,13,27);close.generateTexture(UNIFIED_CLOSE_TEXTURE,40,40);close.destroy();
 }
 return scene.add.container(0,0,[g]);
}
