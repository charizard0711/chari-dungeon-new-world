import {blocked,MIN_X,MAX_X,MIN_Y,MAX_Y} from './gardenMap';
export const TOWN_MIN_X=MIN_X,TOWN_MAX_X=MAX_X,TOWN_MIN_Y=MIN_Y,TOWN_MAX_Y=MAX_Y;
export const TOWN_COLUMNS=MAX_X-MIN_X+1,TOWN_ROWS=MAX_Y-MIN_Y+1,TOWN_TILE=48;
export const TOWN_TREES:readonly (readonly[number,number])[]=[];
export const TOWN_LAMPS:readonly (readonly[number,number])[]=[];
export const TRAINING_TARGET={x:8,y:9} as const;
export function townBlocked(x:number,y:number){return blocked(x,y)||(x===3&&y===9);}
