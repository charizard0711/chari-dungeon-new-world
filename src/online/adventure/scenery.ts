import {MAP_A,MAP_A_SCENERY} from './mapAConfig';
export interface SolidRect{x:number;y:number;w:number;h:number;}
export const SCENERY=MAP_A_SCENERY;
export const SCENERY_SOLIDS:SolidRect[]=MAP_A.solids;
export const BRIDGES:(SolidRect&{vertical?:boolean})[]=MAP_A.bridges;
export const WATER=SCENERY_SOLIDS.filter(r=>r.w===7&&r.h===4||r.w===5&&r.h===3);
export function insideRect(x:number,y:number,r:SolidRect){return x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;}
const materials=new Map(MAP_A.materials.map(m=>[m.x+','+m.y,m.frame]));
export function terrainFrame(_area:string|undefined,x:number,y:number){const f=materials.get(x+','+y)??0;return f===0&&(x*17+y*7)%13===0?1:f;}
