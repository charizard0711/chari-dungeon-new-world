/** Window-level tracking survives a source icon being re-rendered or losing capture. */
export function trackPointerDrag(target:EventTarget,start:{pointerId:number;clientX:number;clientY:number},handlers:{move:(event:PointerEvent)=>void;end:(event:PointerEvent|null)=>void}){
 let active=true;const capture={capture:true};
 const stop=(event:PointerEvent|null)=>{if(!active)return;active=false;target.removeEventListener('pointermove',move,capture);target.removeEventListener('pointerup',up,capture);target.removeEventListener('pointercancel',cancel,capture);target.removeEventListener('blur',cancel,capture);target.removeEventListener('keydown',key,capture);handlers.end(event);};
 const move=(event:Event)=>{const p=event as PointerEvent;if(active&&p.pointerId===start.pointerId)handlers.move(p);};
 const up=(event:Event)=>{const p=event as PointerEvent;if(p.pointerId===start.pointerId)stop(p);};
 const cancel=(event:Event)=>{if(event.type!=='pointercancel'||(event as PointerEvent).pointerId===start.pointerId)stop(null);};
 const key=(event:Event)=>{if((event as KeyboardEvent).key==='Escape')stop(null);};
 target.addEventListener('pointermove',move,capture);target.addEventListener('pointerup',up,capture);target.addEventListener('pointercancel',cancel,capture);target.addEventListener('blur',cancel,capture);target.addEventListener('keydown',key,capture);
 return ()=>stop(null);
}
