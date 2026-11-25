import {online}from '../api';
import {boundedRequest,recordRequest}from '../requestTiming';
import type {WorldState}from '../worldApi';
import type {AdventureSnapshot}from './types';
export interface CombatPulse{gold?:number;railTrip?:any;railGates?:Record<string,boolean>;drops?:WorldState['drops'];skillStepsRemaining?:number;timeStopTurns?:number;deferred?:boolean;roomId:string;floor:number;characterId:string;hp:number;x:number;y:number;snapshot:AdventureSnapshot;serverTime:number;clockReceivedAt:number;clockLatencyMs:number;positions:{character_id:string;x:number;y:number;dir:'up'|'down'|'left'|'right';railTrip?:any}[];}
export async function combatPulse():Promise<CombatPulse>{if(!online)throw Error('接続できません。');const client=online,start=performance.now();const {data,error}=await boundedRequest(signal=>client.rpc('online_combat_pulse').abortSignal(signal),2500);if(error)throw Error(error.message);const received=performance.now();recordRequest('combat_pulse',received-start,'ok');return {...data,clockReceivedAt:received,clockLatencyMs:Math.min(250,(received-start)/2)};}
/** Sparse updates preserve inventory, chat, names and locally selected UI state. */
export function mergeCombatPulse(state:WorldState,pulse:CombatPulse):WorldState|undefined{
 const a=state.adventure;if(pulse.deferred||!a?.inside||a.id!==pulse.roomId||a.floor!==pulse.floor||state.active?.id!==pulse.characterId||pulse.serverTime<(state.serverTime??0))return;
 const positions=new Map(pulse.positions.map(p=>[p.character_id,p]));
 return {...state,serverTime:pulse.serverTime,clockReceivedAt:pulse.clockReceivedAt,clockLatencyMs:pulse.clockLatencyMs,trainingHits:pulse.snapshot.events??state.trainingHits,messages:pulse.snapshot.messages??state.messages,drops:pulse.drops??state.drops,active:{...state.active,hp:pulse.hp,gold:pulse.gold??state.active.gold,skillStepsRemaining:pulse.skillStepsRemaining??state.active.skillStepsRemaining,timeStopTurns:pulse.timeStopTurns??state.active.timeStopTurns},players:state.players.map(p=>positions.has(p.character_id)?{...p,...positions.get(p.character_id)}:p),adventure:{...a,x:pulse.x,y:pulse.y,snapshot:pulse.snapshot,...(pulse.railTrip!==undefined?{railTrip:pulse.railTrip}:{}),...(pulse.railGates?{railGates:pulse.railGates}:{}),intent:null,intents:[]}};
}

/** A slow metadata response must not rewind a newer movement/combat acknowledgement. */
export function reconcileWorldMetadata(full:WorldState,current?:WorldState):WorldState{
 if(!current?.adventure?.inside||!full.adventure?.inside||full.active?.id!==current.active?.id||full.adventure.id!==current.adventure.id||full.adventure.floor!==current.adventure.floor||(full.serverTime??0)>=(current.serverTime??0))return full;
 const positions=new Map(current.players.map(p=>[p.character_id,p]));
 return {...full,trainingHits:current.trainingHits,messages:current.messages,drops:current.drops??full.drops,serverTime:current.serverTime,clockReceivedAt:current.clockReceivedAt,clockLatencyMs:current.clockLatencyMs,active:{...full.active!,hp:current.active!.hp,gold:current.active!.gold,skillStepsRemaining:current.active!.skillStepsRemaining,timeStopTurns:current.active!.timeStopTurns},players:full.players.map(p=>{const n=positions.get(p.character_id);return n?{...p,x:n.x,y:n.y,dir:n.dir,railTrip:n.railTrip}:p;}),adventure:{...full.adventure,x:current.adventure.x,y:current.adventure.y,snapshot:current.adventure.snapshot,railTrip:current.adventure.railTrip}};
}
