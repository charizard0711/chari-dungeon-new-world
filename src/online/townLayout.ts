import {housingGround,housingSolid} from './housingCatalog';
export const TOWN_MIN_X=-35,TOWN_MIN_Y=-35,TOWN_MAX_X=59,TOWN_MAX_Y=53;
export const TOWN_COLUMNS=TOWN_MAX_X-TOWN_MIN_X+1,TOWN_ROWS=TOWN_MAX_Y-TOWN_MIN_Y+1,TOWN_TILE=48;
export const TOWN_TREES=[[3,9],[21,9],[4,15],[20,15],[3,16],[21,16],[1,3],[23,3],[1,14],[23,14],[8,2]] as const;
export const TOWN_LAMPS=[[9,6],[15,6],[9,12],[15,12]] as const;
export const TRAINING_TARGET={x:12,y:5} as const;
export function townBlocked(x:number,y:number){
  const central=x>=1&&x<=23&&y>=1&&y<=17;
  const connection=(x>=9&&x<=15&&y>=-2&&y<=20)||(y>=7&&y<=11&&x>=-2&&x<=26);
  return (!central&&!connection&&!housingGround(x,y))||housingSolid(x,y)||(x>=3&&x<=7&&y>=2&&y<=5)||(x>=18&&x<=22&&y>=2&&y<=5)
    ||(x>=11&&x<=13&&y>=8&&y<=10)||(x===16&&y===11)||(x===TRAINING_TARGET.x&&y===TRAINING_TARGET.y)
    ||(y===12&&x>=6&&x<=8)||(y===12&&x>=17&&x<=19)||(x===8&&y===17)||(x===7&&y===9)||(x===18&&y===9)
    ||[...TOWN_TREES,...TOWN_LAMPS].some(([a,b])=>a===x&&b===y);
}
