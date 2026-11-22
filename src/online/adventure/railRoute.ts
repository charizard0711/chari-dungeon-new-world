import plan from './floor1-maze.json';
export interface RailTrip{started:number;duration:number;reverse:boolean;}
export const RAIL_ROUTE=plan.railway.route;
export const RAIL_CELLS=new Set(RAIL_ROUTE.map(p=>`${p.x},${p.y}`));
export function railProgress(t:number){return t<=0?0:t>=1?1:t<.15?t*t/.255:t>.85?1-(1-t)*(1-t)/.255:(t-.075)/.85;}
export function railPose(trip:RailTrip,now:number){
 const t=Math.max(0,Math.min(1,(now-trip.started)/trip.duration)),distance=railProgress(t)*(RAIL_ROUTE.length-1),v=trip.reverse?RAIL_ROUTE.length-1-distance:distance;
 const i=Math.min(RAIL_ROUTE.length-2,Math.floor(v)),a=RAIL_ROUTE[i],b=RAIL_ROUTE[i+1],f=v-i,sign=trip.reverse?-1:1;
 const dir=b.x!==a.x?(b.x-a.x)*sign>0?'right':'left':(b.y-a.y)*sign>0?'down':'up';
 return{x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,dir:dir as 'up'|'down'|'left'|'right',progress:t};
}
