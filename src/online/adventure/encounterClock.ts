import {TOWN_STEP_MS} from '../walkPose';
/** Anchor countdowns to the server response, then advance with the monotonic browser clock. */
export class EncounterClock {
 private server=0;
 private received=0;
 private sample=-1;
 observe(serverTime:number|undefined,receivedAt:number,latencyMs=0){
  if(!Number.isFinite(serverTime)||serverTime===this.sample)return;
  this.sample=serverTime!;this.server=serverTime!+Math.max(0,Math.min(250,latencyMs));this.received=receivedAt;
 }
 now(clientTime:number){return this.server+Math.max(0,clientTime-this.received);}
}
export function telegraphLabel(resolvesAt:number,serverNow:number){
 return `${(Math.ceil(Math.max(0,resolvesAt-serverNow)/100)/10).toFixed(1)}s`;
}
export function enemyMoveDuration(interval=600,queuedCells=1){
 return TOWN_STEP_MS;
}
