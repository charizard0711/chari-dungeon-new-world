import type Phaser from 'phaser';

/** Grow around the panel center while retaining the children's layout coordinates. */
export function openModalMotion(scene: Phaser.Scene, root: Phaser.GameObjects.Container, cx: number, cy: number) {
  resetModalMotion(scene, root);
  // The first child is the full-screen dimmer. It stays fixed and dark immediately.
  const children = root.list.slice(1).map(child => {
    const item = child as Phaser.GameObjects.Image;
    return {item,x:item.x,y:item.y,sx:item.scaleX,sy:item.scaleY,alpha:item.alpha};
  });
  const apply = (amount: number) => {
    for (const {item,x,y,sx,sy,alpha} of children) {
      if (!item.active) continue;
      item.setPosition(cx+(x-cx)*amount,cy+(y-cy)*amount).setScale(sx*amount,sy*amount)
        .setAlpha(alpha*(.35+.65*(amount-.88)/.12));
    }
  };
  apply(.88);
  const tween = scene.tweens.addCounter({from:.88,to:1,duration:240,ease:'Cubic.out',
    onUpdate:animation=>apply(animation.getValue() ?? 1),onComplete:()=>apply(1)});
  root.setData('modal-motion',tween);
}

export function resetModalMotion(scene: Phaser.Scene, root: Phaser.GameObjects.Container) {
  scene.tweens.killTweensOf(root);
  (root.getData('modal-motion') as Phaser.Tweens.Tween | undefined)?.stop();
  root.setScale(1).setPosition(0,0).setAlpha(1);
}

/** DOM windows use the same 240ms, 88%-to-full opening as canvas windows. */
export function installDomModalMotion(host:HTMLElement=document.body){
 const selector='[role="dialog"],.town-window,.housing-modal,.zero-window,.zero-settings-dialog';
 const state=new Map<HTMLElement,{visible:boolean;mode:string;animation?:Animation}>();
 const sync=()=>{
  for(const [element,s]of state)if(!element.isConnected){s.animation?.cancel();state.delete(element);}
  for(const element of host.querySelectorAll<HTMLElement>(selector)){
   // Animate the window itself, never a containing scrim or a nested dialog twice.
   if(element.parentElement?.closest(selector))continue;
   const visible=!element.closest('[hidden]')&&getComputedStyle(element).display!=='none';
   const mode=element.dataset.mode??'',previous=state.get(element);
   if(visible&&(!previous?.visible||previous.mode!==mode)){
    previous?.animation?.cancel();
    const animation=matchMedia('(prefers-reduced-motion: reduce)').matches?undefined:
     element.animate([{opacity:.35,scale:'.88'},{opacity:1,scale:'1'}],{duration:240,easing:'cubic-bezier(.215,.61,.355,1)'});
    state.set(element,{visible,mode,animation});
   }else if(!visible){previous?.animation?.cancel();state.set(element,{visible,mode});}
  }
 };
 let frame=0;const observer=new MutationObserver(()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;sync();});});
 observer.observe(host,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','data-mode']});sync();
 return ()=>{observer.disconnect();cancelAnimationFrame(frame);for(const s of state.values())s.animation?.cancel();state.clear();};
}
