/** A ground-plane circle: rotation finishes before the transfer loading screen. */
export function playRecallEffect(scene:any):Promise<void>{
 const actor=scene.actors.get(scene.packet.active?.id),x=actor?.anchor.x??(scene.player.x+.5)*48,y=(actor?.anchor.y??(scene.player.y+.45)*48)+24;
 const ring=scene.add.graphics().setBlendMode(1);ring.lineStyle(2,0x8eeaff,.95).strokeCircle(0,0,34).lineStyle(1,0xf1ecff,.85).strokeCircle(0,0,28).strokeCircle(0,0,21);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;ring.lineStyle(1.6,0xc5b3ff,.9).lineBetween(Math.cos(a)*24,Math.sin(a)*24,Math.cos(a)*30,Math.sin(a)*30);}
 for(const offset of [0,Math.PI]){ring.beginPath();for(let i=0;i<3;i++){const a=offset+i*Math.PI*2/3,px=Math.cos(a)*24,py=Math.sin(a)*24;i?ring.lineTo(px,py):ring.moveTo(px,py);}ring.closePath().strokePath();}
 const root=scene.add.container(x,y,[ring]).setScale(.25,.14).setDepth((actor?.anchor.y??y)/48-.06).setAlpha(0);scene.tweens.add({targets:ring,angle:300,duration:1050,ease:'Sine.easeIn'});
 const follow=()=>{if(actor?.anchor?.active)root.setPosition(actor.anchor.x,actor.anchor.y+24);};scene.events.on('update',follow);
 return new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;scene.events.off('shutdown',finish);scene.events.off('update',follow);scene.tweens.killTweensOf(root);scene.tweens.killTweensOf(ring);root.destroy();resolve();};scene.events.once('shutdown',finish);scene.tweens.add({targets:root,scaleX:1.3,scaleY:.68,alpha:1,duration:850,ease:'Sine.easeOut',onComplete:()=>scene.tweens.add({targets:root,alpha:0,scaleX:1.6,scaleY:.83,duration:220,onComplete:finish})});});
}
