import {online}from '../api';
import {boundedRequest,recordRequest}from '../requestTiming';
import type {CombatPulse}from './realtimePulse';
export interface MotionReply extends CombatPulse{ack:{sequence:number;accepted:number;stopped:boolean;retryAfterMs:number};}
export async function dungeonWalk(payload:{session:string;sequence:number;roomId:string;floor:number;steps:{x:number;y:number}[]}):Promise<MotionReply>{
 if(!online)throw Error('オンラインに接続できません。');const client=online,start=performance.now();
 for(let attempt=0;;attempt++){try{const{data,error}=await boundedRequest(signal=>client.rpc('online_dungeon_walk',{payload}).abortSignal(signal),2500);if(error)throw Error(error.message);const received=performance.now();recordRequest('dungeon_walk',received-start,'ok');return{...data,clockReceivedAt:received,clockLatencyMs:Math.min(250,(received-start)/2)};}
 catch(error){const message=(error as Error).message;if(attempt===0&&/状態を再確認|fetch|network|lock timeout/i.test(message))continue;recordRequest('dungeon_walk',performance.now()-start,'error');throw error;}}
}
