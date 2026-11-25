import {stationAt,STATIONS} from './stations';
/** Shared server coordinates retain encounter progress; clients mount only their current area. */
export const BOSS_ROOM={x:41,y:3,right:58,bottom:22};
export function inBossRoom(x:number,y:number){return x>=41&&x<=58&&y>=3&&y<=22;}
export function bossStage(adventure?:{inside:boolean;floor:number;x:number;y:number}|null){return !!adventure?.inside&&adventure.floor===1&&inBossRoom(adventure.x,adventure.y);}
export function inStage(boss:boolean,x:number,y:number){return inBossRoom(x,y)===boss;}
export const BOARDING_PANELS=STATIONS.map(s=>({id:s.id,x:s.padX,y:s.padY}));

export function stationDecorVisible(x:number,y:number,players:readonly {x:number;y:number}[]){const s=STATIONS.find(s=>x>=s.x-1&&x<s.x+s.w+1&&y>=s.y-2&&y<s.y+s.h+1);return !!s&&players.some(p=>stationAt(p.x,p.y)?.id===s.id);}
