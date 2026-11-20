import type {WorldState} from './worldApi';

/** Prediction changes only the local position; inventory, enemies and rewards stay authoritative. */
export function predictedWorld(state:WorldState,steps:readonly {x:number;y:number}[]):WorldState {
 const end=steps[steps.length-1],id=state.active?.id;
 if(!end||!id)return state;
 const prior=steps[steps.length-2]??state.players.find(p=>p.character_id===id);
 const dir=prior?(end.x>prior.x?'right':end.x<prior.x?'left':end.y>prior.y?'down':'up'):undefined;
 return {...state,players:state.players.map(p=>p.character_id===id?{...p,...end,dir:dir??p.dir}:p)};
}
export function movementAccepted(state:WorldState,step:Record<string,unknown>){
 const self=state.players.find(p=>p.character_id===state.active?.id);
 return !!self&&self.x===step.x&&self.y===step.y;
}
export function lootSoundForAction(action:string,before?:WorldState,after?:WorldState):'pickup'|'drop'|undefined {
 if(['pickup_item','claim_item','claim_gold','buy','gacha'].includes(action))return 'pickup';
 if(['drop_item','drop_equipment','drop_weapon','drop_gold'].includes(action))return 'drop';
 if(action==='poll'||action==='list')return;
 const a=before?.active,b=after?.active;if(!a||!b||a.id!==b.id)return;
 if((b.gold??0)>(a.gold??0)||Object.entries(b.inventory).some(([key,count])=>count>(a.inventory[key]??0))||(['weapon','armor','shield','necklace'] as const).some(slot=>(b.equipment?.[slot]?.length??0)>(a.equipment?.[slot]?.length??0)))return 'pickup';
}
