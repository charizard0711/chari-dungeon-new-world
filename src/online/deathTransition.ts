import type Phaser from 'phaser';

/** Location changes only after the whole game and HUD are black. */
export function mountDeathTransition(scene:Phaser.Scene,onBlack:()=>void,onDone:()=>void){
 const root=document.createElement('section');root.className='online-death-transition';root.setAttribute('role','status');root.setAttribute('aria-label','ダンジョンの入口で目を覚ましています');
 Object.assign(root.style,{position:'fixed',zIndex:'2147483000',overflow:'hidden',pointerEvents:'auto',background:'transparent'});
 const shade=document.createElement('div');Object.assign(shade.style,{position:'absolute',inset:'0',background:'#000',opacity:'0'});
 const lids=['top','bottom'].map(side=>{const lid=document.createElement('div');Object.assign(lid.style,{position:'absolute',left:'-5%',width:'110%',height:'53%',background:'#000',[side]:'0',borderRadius:side==='top'?'0 0 50% 50% / 0 0 5% 5%':'50% 50% 0 0 / 5% 5% 0 0',visibility:'hidden'});return lid;});
 root.append(shade,...lids);document.body.append(root);
 const fit=()=>{const r=scene.game.canvas.getBoundingClientRect();Object.assign(root.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});};
 const resize=new ResizeObserver(fit);resize.observe(scene.game.canvas);window.addEventListener('resize',fit);window.addEventListener('scroll',fit);fit();
 let disposed=false,timer:ReturnType<typeof setTimeout>|undefined;const animations:Animation[]=[];
 const destroy=()=>{if(disposed)return;disposed=true;clearTimeout(timer);animations.forEach(a=>a.cancel());resize.disconnect();window.removeEventListener('resize',fit);window.removeEventListener('scroll',fit);scene.events.off('shutdown',destroy);root.remove();};
 const animate=(el:HTMLElement,frames:Keyframe[],duration:number)=>{const a=el.animate(frames,{duration,easing:'ease-in-out',fill:'forwards'});animations.push(a);return a.finished;};
 const finished=(async()=>{
  try{
   await animate(shade,[{opacity:0},{opacity:1}],700);if(disposed)return;
   root.dataset.phase='black';onBlack();
   await new Promise<void>(resolve=>{timer=setTimeout(resolve,450);});if(disposed)return;
   root.dataset.phase='opening';lids.forEach(l=>l.style.visibility='visible');shade.style.opacity='0';animations[0].cancel();
   await Promise.all(lids.map((lid,i)=>animate(lid,[{transform:'translateY(0)'},{transform:`translateY(${i===0?'-':''}105%)`}],1800)));
   if(!disposed){destroy();onDone();}
  }catch{if(!disposed){destroy();onDone();}}
 })();
 scene.events.once('shutdown',destroy);
 return {root,destroy,finished};
}
