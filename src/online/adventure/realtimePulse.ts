import {online}from '../api';
import {boundedRequest,recordRequest}from '../requestTiming';
import type {WorldState}from '../worldApi';
import type {AdventureSnapshot}from './types';
export interface CombatPulse{roomRoster?:WorldState['roomRoster'];level?:number;exp?:number;invulnerableUntil?:number;invisibleUntil?:number;exploration?:import('./types').ExplorationMap;gold?:number;railTrip?:any;railGates?:Record<string,boolean>;drops?:WorldState['drops'];skillStepsRemaining?:number;timeStopTurns?:number;deferred?:boolean;roomId:string;floor:number;characterId:string;hp:number;x:number;y:number;snapshot:AdventureSnapshot;serverTime:number;clockReceivedAt:number;clockLatencyMs:number;positions:{character_id:string;x:number;y:number;dir:'up'|'down'|'left'|'right';railTrip?:any;invisibleUntil?:number}[];}
export async function combatPulse():Promise<CombatPulse>{
 if(!online)throw Error('接続できません。');
 const client=online,start=performance.now();
 try{
  const {data,error}=await boundedRequest(signal=>client.rpc('online_combat_pulse').abortSignal(signal),2000);
  if(error)throw Error(error.message);
  const received=performance.now();
  if(!data?.deferred)recordRequest('combat_pulse',received-start,'ok');
  return {...data,clockReceivedAt:received,clockLatencyMs:Math.min(250,(received-start)/2)};
 }catch(error){
  recordRequest('combat_pulse',performance.now()-start,(error as Error).name==='RequestTimeout'?'timeout':'error');
  throw error;
 }
}
/** Sparse updates preserve inventory, chat, names and locally selected UI state. */
export function mergeCombatPulse(state:WorldState,pulse:CombatPulse):WorldState|undefined{
 const a=state.adventure;if(pulse.deferred||!a?.inside||a.id!==pulse.roomId||a.floor!==pulse.floor||state.active?.id!==pulse.characterId||pulse.serverTime<(state.serverTime??0))return;
 const positions=new Map(pulse.positions.map(p=>[p.character_id,p]));
 return {...state,roomRoster:pulse.roomRoster??state.roomRoster,serverTime:pulse.serverTime,clockReceivedAt:pulse.clockReceivedAt,clockLatencyMs:pulse.clockLatencyMs,trainingHits:pulse.snapshot.events??state.trainingHits,messages:pulse.snapshot.messages??state.messages,drops:pulse.drops??state.drops,active:{...state.active,hp:pulse.hp,level:pulse.level??state.active.level,exp:pulse.exp??state.active.exp,invulnerableUntil:pulse.invulnerableUntil??state.active.invulnerableUntil,invisibleUntil:pulse.invisibleUntil??state.active.invisibleUntil,gold:pulse.gold??state.active.gold,skillStepsRemaining:pulse.skillStepsRemaining??state.active.skillStepsRemaining,timeStopTurns:pulse.timeStopTurns??state.active.timeStopTurns},players:state.players.map(p=>positions.has(p.character_id)?{...p,...positions.get(p.character_id)}:p),adventure:{...a,x:pulse.x,y:pulse.y,snapshot:pulse.snapshot,exploration:pulse.exploration??a.exploration,...(pulse.railTrip!==undefined?{railTrip:pulse.railTrip}:{}),...(pulse.railGates?{railGates:pulse.railGates}:{}),intent:null,intents:[]}};
}

/** A slow metadata response must not rewind a newer movement/combat acknowledgement. */
export function reconcileWorldMetadata(full:WorldState,current?:WorldState):WorldState{
 if(!current?.adventure?.inside||!full.adventure?.inside||full.active?.id!==current.active?.id||full.adventure.id!==current.adventure.id)return full;
 full={...full,roomRoster:full.roomRoster??current.roomRoster,active:full.active?{...full.active,invulnerableUntil:full.active.invulnerableUntil??current.active?.invulnerableUntil}:null};
 if(full.adventure?.floor!==current.adventure.floor||(full.serverTime??0)>=(current.serverTime??0))return full;
 const positions=new Map(current.players.map(p=>[p.character_id,p]));
 return {...full,trainingHits:current.trainingHits,messages:current.messages,drops:current.drops??full.drops,serverTime:current.serverTime,clockReceivedAt:current.clockReceivedAt,clockLatencyMs:current.clockLatencyMs,active:{...full.active!,level:current.active!.level,exp:current.active!.exp,hp:current.active!.hp,invisibleUntil:current.active!.invisibleUntil,gold:current.active!.gold,skillStepsRemaining:current.active!.skillStepsRemaining,timeStopTurns:current.active!.timeStopTurns},players:full.players.map(p=>{const n=positions.get(p.character_id);return n?{...p,x:n.x,y:n.y,dir:n.dir,railTrip:n.railTrip,invisibleUntil:n.invisibleUntil}:p;}),adventure:{...full.adventure!,x:current.adventure.x,y:current.adventure.y,snapshot:current.adventure.snapshot,exploration:current.adventure.exploration,railTrip:current.adventure.railTrip}};
}
