import type {GroundItem} from './worldApi';
import {TOWN_TILE} from './townLayout';

export function groundLootPose(x:number,y:number,time:number,phase:number){
  const pulse=Math.sin(time*.0042+phase);
  return {x:(x+.5)*TOWN_TILE,y:(y+.5)*TOWN_TILE-2+pulse*2.2,angle:Math.sin(time*.002+phase)*2.5,pulse};
}

/** Self-dropped / failed pickups stay ignored until the player leaves their cell. */
export function walkoverDrop(drops:readonly GroundItem[],player:{x:number;y:number},ignored:Set<string>){
  for(const id of ignored){const drop=drops.find(drop=>drop.id===id);if(!drop||drop.x!==player.x||drop.y!==player.y)ignored.delete(id);}
  return drops.find(drop=>drop.x===player.x&&drop.y===player.y&&!ignored.has(drop.id));
}
