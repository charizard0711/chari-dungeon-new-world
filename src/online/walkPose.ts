import type { Dir } from '../types';
import { PLAYER_WALK_FRAMES } from '../playerWalkFrames';

export const TOWN_STEP_MS = 150;
const FRAMES = PLAYER_WALK_FRAMES;
// A left/right stride covers two town tiles: one planted foot per tile.
const STRIDE_PIXELS = 96;
export function townWalkPose(distance:number,weight:number,dir:Dir){
 const blend=Math.max(0,Math.min(1,weight));
 const phase=distance/STRIDE_PIXELS*Math.PI*2;
 const swing=Math.sin(phase);
 return {
  frame:FRAMES[((Math.floor(distance/STRIDE_PIXELS*FRAMES.length)%FRAMES.length)+FRAMES.length)%FRAMES.length],
  bob:-2.6*(1-Math.abs(swing))*blend,
  sway:.8*swing*blend,
  angle:((dir==='left'?-2.2:dir==='right'?2.2:0)+swing*1.5)*blend,
  leftFoot:.17+.17*Math.max(0,swing)*blend,
  rightFoot:.17+.17*Math.max(0,-swing)*blend,
  footOffset:2*swing*blend
 };
}
