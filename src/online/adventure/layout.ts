import {SCENERY_SOLIDS,insideRect} from './scenery';
import {MAP_A,MAP_A_AREAS,MAP_A_PROPS,MAP_A_GATES,MAP_A_ENEMIES} from './mapAConfig';
export interface AdventureArea{id:string;name:string;label?:string;x:number;y:number;w:number;h:number;sx:number;sy:number;color:number;}
export const ADVENTURE_W=MAP_A.width,ADVENTURE_H=MAP_A.height;
export const ADVENTURE_AREAS:AdventureArea[]=MAP_A_AREAS;
export const ADVENTURE_GATES=MAP_A_GATES,ADVENTURE_PROPS=MAP_A_PROPS,ADVENTURE_MONSTERS=MAP_A_ENEMIES;
export const ADVENTURE_TRAPS=Array.from({length:9},(_,i)=>({x:94+i%3,y:45+Math.floor(i/3)}));
export const ADVENTURE_CONFIG={version:4,spawn:MAP_A.spawn,solids:SCENERY_SOLIDS,width:ADVENTURE_W,height:ADVENTURE_H,rows:MAP_A.rows,areas:ADVENTURE_AREAS,gates:ADVENTURE_GATES,props:ADVENTURE_PROPS,traps:ADVENTURE_TRAPS,enemies:ADVENTURE_MONSTERS};
export function adventureBlocked(x:number,y:number,state?:{keys?:string[];floor?:number}){if(state?.floor===2)return x<1||y<1||x>11||y>9||x===5&&y===6;if(SCENERY_SOLIDS.some(r=>insideRect(x,y,r))||MAP_A.rows[y]?.[x]!=='.'||ADVENTURE_PROPS.some(p=>p.x===x&&p.y===y))return true;return ADVENTURE_GATES.some(g=>!(state?.keys??[]).includes(g.key)&&insideRect(x,y,g));}
export const adventureAreaAt=(x:number,y:number)=>ADVENTURE_AREAS.find(a=>insideRect(x,y,a));
