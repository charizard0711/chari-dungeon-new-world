export function isTextEntry(node:Element|null):boolean{
 if(!node)return false;return node instanceof HTMLTextAreaElement||node instanceof HTMLInputElement&&!['checkbox','radio','range','button','submit'].includes(node.type)||(node as HTMLElement).isContentEditable;
}
/** HTML editing owns the keyboard until an explicit blur/canvas click. No per-poll focus changes. */
export function installTownTextInput(scene:any){
 const doc=scene.game.canvas.ownerDocument as Document,canvas=scene.game.canvas as HTMLCanvasElement,manager=scene.game.input.keyboard;let saved:any;
 canvas.tabIndex=0;
 const plugins=()=>[scene.input.keyboard,scene.hud?.input.keyboard].filter(Boolean);
 const restore=()=>{if(!saved)return;manager.enabled=saved.enabled;manager.preventDefault=saved.capture;for(const [p,enabled]of saved.plugins){p.resetKeys();p.enabled=enabled;}saved=undefined;};
 const focus=()=>{if(!isTextEntry(doc.activeElement))return;if(!saved){saved={enabled:manager.enabled,capture:manager.preventDefault,plugins:plugins().map(p=>[p,p.enabled])};manager.enabled=false;manager.preventDefault=false;plugins().forEach(p=>{p.resetKeys();p.enabled=false;});scene.clearMoveInput?.();}};
 const blur=()=>queueMicrotask(()=>{if(!isTextEntry(doc.activeElement))restore();});
 const pointer=()=>{if(isTextEntry(doc.activeElement))(doc.activeElement as HTMLElement).blur();restore();canvas.focus({preventScroll:true});};
 const key=(e:KeyboardEvent)=>{if(isTextEntry(e.target as Element)&&e.key==='Escape'&&!e.isComposing){e.preventDefault();e.stopPropagation();(doc.activeElement as HTMLElement)?.blur();restore();canvas.focus({preventScroll:true});}};
 doc.addEventListener('focusin',focus,true);doc.addEventListener('focusout',blur,true);doc.addEventListener('keydown',key,true);canvas.addEventListener('pointerdown',pointer,true);
 return()=>{restore();doc.removeEventListener('focusin',focus,true);doc.removeEventListener('focusout',blur,true);doc.removeEventListener('keydown',key,true);canvas.removeEventListener('pointerdown',pointer,true);};
}
