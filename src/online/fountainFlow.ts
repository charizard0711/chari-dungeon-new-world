import type Phaser from 'phaser';

/** Highlights stay inside the painted jet and pool. */
export function mountTownFountainFlow(scene:Phaser.Scene,fountain:Phaser.GameObjects.Image){
 const water=scene.add.graphics().setDepth(fountain.depth+.03).setBlendMode('ADD');
 const scale=fountain.displayWidth/128;
 const cx=fountain.x,top=fountain.y-fountain.displayHeight;
 const update=(time:number)=>{
  water.clear();
  const view=scene.cameras.main.worldView;
  if(!view.contains(cx,top+73*scale))return;
  const y=top+46*scale;
  for(let i=0;i<10;i++){
   const age=(time*.0025+i/10)%1;
   const x=cx+Math.sin(i*5.23)*3.1*scale;
   water.lineStyle(i%3===0?1.6:.85,i%3===0?0xd6ffff:0x3ddcf1,Math.sin(Math.PI*age)*.65);
   water.lineBetween(x,y+age*25*scale,x,y+(age*25+2.1)*scale);
  }
  const surface=top+73*scale;
  for(let i=0;i<3;i++){
   const age=(time*.00136+i/3)%1;
   water.lineStyle(1.2,0x57ffff,(1-age)*.46).strokeEllipse(cx,surface+age*5,5+age*54*scale,3+age*25*scale);
  }
  for(let i=0;i<5;i++){
   const age=(time*.0037+i/5)%1;
   water.fillStyle(0xc3ffff,(1-age)*.78).fillCircle(cx+Math.cos(i*2.4)*age*10,surface-Math.sin(age*Math.PI)*5,1.45-age);
  }
 };
 scene.events.on('update',update);
 scene.events.once('shutdown',()=>scene.events.off('update',update));
}
