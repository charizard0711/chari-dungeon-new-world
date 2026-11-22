import {isTextEntry} from './textInput';
const DIRECTIONS:Record<string,string>={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',KeyA:'left',KeyD:'right',KeyW:'up',KeyS:'down'};
/** DOM key state survives Phaser modal capture changes; typing never moves the player. */
export function installMovementKeys(scene:any){
 const pressed=new Map<string,string>(),doc=scene.game.canvas.ownerDocument as Document;
 const clear=()=>pressed.clear();
 const down=(e:KeyboardEvent)=>{const d=DIRECTIONS[e.code];if(!d||e.ctrlKey||e.altKey||e.metaKey||e.isComposing||isTextEntry(e.target as Element)||!scene.scene.isActive()||scene.hud?.overlayMode!=='none'){return;}e.preventDefault();pressed.set(e.code,d);};
 const up=(e:KeyboardEvent)=>pressed.delete(e.code);
 const focus=()=>{if(isTextEntry(doc.activeElement))clear();};
 doc.addEventListener('keydown',down);doc.addEventListener('keyup',up);doc.addEventListener('focusin',focus);window.addEventListener('blur',clear);doc.addEventListener('visibilitychange',clear);
 return {direction:()=>{const values=Array.from(pressed.values());return values[values.length-1]??null;},clear,destroy(){clear();doc.removeEventListener('keydown',down);doc.removeEventListener('keyup',up);doc.removeEventListener('focusin',focus);window.removeEventListener('blur',clear);doc.removeEventListener('visibilitychange',clear);}};
}
