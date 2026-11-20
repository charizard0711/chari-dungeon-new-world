import type Phaser from 'phaser';
/** Tiny staggered diamond/plus glints, shared by held gear and ground loot. */
export function drawSmallGlints(g:Phaser.GameObjects.Graphics,x:number,y:number,time:number,seed:number,count:number,spread:number,size:number,color=0xffefb8){
 for(let i=0;i<count;i++){const phase=time*.0032+i*1.7+seed,alpha=Math.pow((Math.sin(phase)+1)/2,3);const px=x+Math.sin(i*2.4+seed)*spread,py=y+Math.cos(i*3.2+seed)*spread*.85-Math.sin(phase*.4)*2,r=size*(.5+alpha*.5);g.fillStyle(color,alpha*.9);g.fillRect(px-r,py-.3,r*2,.6);g.fillRect(px-.3,py-r,.6,r*2);}
}
