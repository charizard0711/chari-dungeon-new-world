import type { Dir } from '../types';
import { PLAYER_WALK_FRAMES } from '../playerWalkFrames';

export const TOWN_STEP_MS = 205;
export const WALK_CYCLE_MS = 600;
const FRAMES = PLAYER_WALK_FRAMES;
// Match the prototype painted gait without an extra body transform.
const STRIDE_PIXELS = 48 * WALK_CYCLE_MS / TOWN_STEP_MS;
export function townWalkPose(distance:number,weight:number,dir:Dir){


 return {
  frame:FRAMES[((Math.floor(distance/STRIDE_PIXELS*FRAMES.length)%FRAMES.length)+FRAMES.length)%FRAMES.length],
  phase: ((distance/STRIDE_PIXELS)%1+1)%1,
  bob:0,
  sway:0,
  angle:0,
  leftFoot:0,
  rightFoot:0,
  footOffset:0
 };
}
