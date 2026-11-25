import type {QuickSlot} from './worldApi';
export function quickSlots(refs:readonly (QuickSlot|null)[]|undefined):(QuickSlot|null)[]{
 const source=refs??[{category:'item',key:'potion'} as QuickSlot];
 return Array.from({length:20},(_,i)=>source[i]??null);
}
/** Dragging an existing binding exchanges slots; inventory drops register one. */
export function shortcutDrop(to:number,ref:QuickSlot,from?:number){
 if(!Number.isInteger(to)||to<0||to>=20)throw Error('ショートカットを確認してください。');
 if(from===undefined)return {action:'set_quick_slot',payload:{index:to,ref}};
 if(!Number.isInteger(from)||from<0||from>=20)throw Error('ショートカットを確認してください。');
 return from===to?undefined:{action:'swap_quick_slots',payload:{from,to}};
}
