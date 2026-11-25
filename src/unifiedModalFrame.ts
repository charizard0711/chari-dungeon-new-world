import type Phaser from 'phaser';
export const UNIFIED_CLOSE_TEXTURE='zero_modal_close';
/** Neutral silver/charcoal frame shared with the settings and codex DOM windows. */
export function unifiedModalFrame(scene:Phaser.Scene,x:number,y:number,w:number,h:number){
 const g=scene.add.graphics();
 g.fillStyle(0x101b24,.99).fillRoundedRect(x,y,w,h,4);
 g.lineStyle(1,0x9db5c2,.9).strokeRoundedRect(x,y,w,h,4);
 g.lineStyle(1,0x90b5c7,.25).strokeRect(x+5,y+5,w-10,h-10);
 // The same dark satin face and shallow silver bevel as the DOM headers.
 const stops=[[0,0x354751],[.12,0x1c2e39],[.52,0x101e28],[.8,0x0c1922],[1,0x203440]];
 for(let row=0;row<56;row++){
  const t=row/55;let a=stops[0],b=stops[1];for(let i=1;i<stops.length;i++)if(t<=stops[i][0]){a=stops[i-1];b=stops[i];break;}
  const ratio=(t-a[0])/(b[0]-a[0]),blend=(shift:number)=>Math.round(((a[1]>>shift)&255)*(1-ratio)+((b[1]>>shift)&255)*ratio);
  g.fillStyle((blend(16)<<16)|(blend(8)<<8)|blend(0)).fillRect(x+2,y+2+row,w-4,1);
 }
 g.fillStyle(0x000000,.25).fillRect(x+2,y+60,w-4,3);
 g.lineStyle(1,0xedf5f8,.95).strokeRect(x+2,y+2,w-4,56);
 g.lineStyle(1,0x97abb8,.45).strokeRoundedRect(x+5,y+5,w-10,50,7);
 g.lineStyle(1,0x78909f).lineBetween(x+2,y+59,x+w-2,y+59);
 g.lineStyle(1,0xd7e8ef,.7).lineBetween(x+3,y+57,x+w-3,y+57);
 g.lineStyle(2,0xc6efff,.4).lineBetween(x+w*.42,y+58,x+w*.58,y+58);
 const wing=Math.min(110,w*.13),gap=Math.min(90,w*.24),cx=x+w/2;
 for(const sign of [-1,1]){
  g.lineStyle(1,0xe3f1f7,.85).beginPath().moveTo(cx+sign*(gap+wing),y+27).lineTo(cx+sign*(gap+12),y+27).lineTo(cx+sign*gap,y+34).strokePath();
  g.lineStyle(1,0x758e9f,.8).lineBetween(cx+sign*(gap+wing),y+29,cx+sign*(gap+12),y+29);
 }
 for(const [cx,dx]of [[x,1],[x+w,-1]]){
  g.fillStyle(0xc4d5df,.9).fillTriangle(cx+dx*4,y+4,cx+dx*18,y+4,cx+dx*4,y+15);
  g.fillStyle(0x8ba2b0,.8).fillTriangle(cx+dx*4,y+56,cx+dx*16,y+56,cx+dx*4,y+45);
 }
 for(const [cx,cy,dx,dy]of [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]]){
  g.lineStyle(2,0xb4edf8,.55).beginPath().moveTo(cx+dx*3,cy+dy*23).lineTo(cx+dx*3,cy+dy*3).lineTo(cx+dx*23,cy+dy*3).strokePath();
  g.lineStyle(1,0xa8d7e6,.5).lineBetween(cx+dx*6,cy+dy*18,cx+dx*18,cy+dy*6);
 }
 if(!scene.textures.exists(UNIFIED_CLOSE_TEXTURE)){
  const close=scene.add.graphics();close.fillStyle(0x263945).fillRoundedRect(1,1,38,38,4).lineStyle(1,0xbeced8).strokeRoundedRect(1,1,38,38,4);
  close.lineStyle(1,0xe5f2f5,.45).lineBetween(5,3,35,3);close.lineStyle(1,0x080e17).lineBetween(5,37,35,37);
  close.lineStyle(2,0xe8f1f6).lineBetween(13,13,27,27).lineBetween(27,13,13,27);close.generateTexture(UNIFIED_CLOSE_TEXTURE,40,40);close.destroy();
 }
 return scene.add.container(0,0,[g]);
}
