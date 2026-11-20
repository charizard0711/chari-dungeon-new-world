import assert from 'node:assert/strict';
import {trackPointerDrag} from '../src/online/pointerDrag';
const target=new EventTarget();let moves=0,ends=0,last:PointerEvent|null=null;
const pointer=(type:string,id=7)=>Object.assign(new Event(type,{cancelable:true}),{pointerId:id,clientX:100,clientY:200}) as PointerEvent;
const start={pointerId:7,clientX:0,clientY:0};
let cancel=trackPointerDrag(target,start,{move:()=>moves++,end:e=>{ends++;last=e;}});
target.dispatchEvent(pointer('pointermove',8));assert.equal(moves,0);
target.dispatchEvent(pointer('pointermove'));assert.equal(moves,1);
// Release is tracked globally even after the original icon is no longer present.
target.dispatchEvent(pointer('pointerup'));assert.equal(ends,1);assert.equal(last?.clientY,200);
target.dispatchEvent(pointer('pointermove'));cancel();assert.equal(moves,1);assert.equal(ends,1);
for(const reason of ['blur','pointercancel','Escape','manual']){
 cancel=trackPointerDrag(target,start,{move:()=>moves++,end:e=>{ends++;assert.equal(e,null);}});
 if(reason==='manual')cancel();else target.dispatchEvent(reason==='Escape'?Object.assign(new Event('keydown'),{key:'Escape'}):pointer(reason));
 const previous=ends;cancel();target.dispatchEvent(pointer('pointerup'));assert.equal(ends,previous);
}
assert.equal(ends,5);console.log('PASS: global pointer release, unrelated pointer filtering, blur/cancel/Escape cleanup, and one-time drag teardown.');
