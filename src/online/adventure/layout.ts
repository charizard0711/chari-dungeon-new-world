import {BOSS_LANTERNS} from './stage';
import {insideRect} from './scenery';
import {MAP_A,MAP_A_AREAS,MAP_A_PROPS,MAP_A_GATES,MAP_A_ENEMIES} from './mapAConfig';
export interface AdventureArea{id:string;name:string;label?:string;x:number;y:number;w:number;h:number;sx:number;sy:number;color:number;}
export const ADVENTURE_W=MAP_A.width,ADVENTURE_H=MAP_A.height;
export const ADVENTURE_AREAS:AdventureArea[]=MAP_A_AREAS;
export const ADVENTURE_GATES=MAP_A_GATES,ADVENTURE_PROPS=MAP_A_PROPS,ADVENTURE_MONSTERS=MAP_A_ENEMIES;
export const ADVENTURE_TRAPS:{x:number;y:number}[]=[];
export const ADVENTURE_CONFIG={...MAP_A,version:5,traps:ADVENTURE_TRAPS};
/** North platform extends the world without relocating saved dungeon coordinates. */
export function northStationFloor(x:number,y:number){const s=MAP_A.railway.stations.find(s=>s.id==='boss')!;return y<0&&((x>s.x&&x<s.trackX&&y>s.y&&y<s.y+s.h-1)||(x>=54&&x<=55&&y===-1));}
export function adventureBlocked(x:number,y:number,state?:{railGates?:Record<string,boolean>;keys?:string[];floor?:number;stairs?:boolean;bridge?:{phase:string};brokenFloors?:{x:number;y:number}[];bossEncounter?:{phase:string}}){if(state?.floor!==2&&state?.brokenFloors?.some(p=>p.x===x&&p.y===y))return true;if(state?.floor===2)return x<1||y<1||x>11||y>9||x===5&&y===6;if(BOSS_LANTERNS.some(tile=>tile.x===x&&tile.y===y))return true;if((MAP_A.rows[y]?.[x]!=='.'&&!northStationFloor(x,y))||ADVENTURE_PROPS.some(p=>p.x===x&&p.y===y&&(p.id!=='stairs'||state?.stairs)&&!(p.kind==='rail'&&state?.railGates?.[p.id==='rail_entry'?'entry':'boss'])))return true;if(insideRect(x,y,MAP_A.cooperative.bridge)&&state?.bridge?.phase!=='up')return true;if((insideRect(x,y,MAP_A.boss.exit)||insideRect(x,y,MAP_A.boss.rear))&&['opening','battle','returning'].includes(state?.bossEncounter?.phase??''))return true;return ADVENTURE_GATES.some(g=>!(g.key==='both'?(state?.keys??[]).includes('amber')&&(state?.keys??[]).includes('violet'):(state?.keys??[]).includes(g.key))&&insideRect(x,y,g));}
export const adventureAreaAt=(x:number,y:number)=>ADVENTURE_AREAS.find(a=>insideRect(x,y,a));
