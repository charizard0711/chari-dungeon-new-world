import {online}from '../api';
import {boundedRequest,recordRequest}from '../requestTiming';
import type {WorldState}from '../worldApi';
import type {AdventureSnapshot}from './types';
export interface CombatPulse{deferred?:boolean;roomId:string;floor:number;characterId:string;hp:number;x:number;y:number;snapshot:AdventureSnapshot;serverTime:number;clockReceivedAt:number;clockLatencyMs:number;positions:{character_id:string;x:number;y:number;dir:'up'|'down'|'left'|'right';railTrip?:any}[];}
export async function combatPulse():Promise<CombatPulse>{if(!online)throw Error('接続できません。');const client=online,start=performance.now();const {data,error}=await boundedRequest(signal=>client.rpc('online_combat_pulse').abortSignal(signal),2500);if(error)throw Error(error.message);const received=performance.now();recordRequest('combat_pulse',received-start,'ok');return {...data,clockReceivedAt:received,clockLatencyMs:Math.min(250,(received-start)/2)};}
/** Sparse updates preserve inventory, chat, names and locally selected UI state. */
export function mergeCombatPulse(state:WorldState,pulse:CombatPulse):WorldState|undefined{
 const a=state.adventure;if(pulse.deferred||!a?.inside||a.id!==pulse.roomId||a.floor!==pulse.floor||state.active?.id!==pulse.characterId||pulse.serverTime<(state.serverTime??0))return;
 const positions=new Map(pulse.positions.map(p=>[p.character_id,p]));
 return {...state,serverTime:pulse.serverTime,clockReceivedAt:pulse.clockReceivedAt,clockLatencyMs:pulse.clockLatencyMs,active:{...state.active,hp:pulse.hp},players:state.players.map(p=>positions.has(p.character_id)?{...p,...positions.get(p.character_id)}:p),adventure:{...a,x:pulse.x,y:pulse.y,snapshot:pulse.snapshot,intent:null,intents:[]}};
}
