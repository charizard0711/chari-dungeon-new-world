/** Shared server coordinates retain encounter progress; clients mount only their current area. */
export const BOSS_ROOM={x:41,y:3,right:58,bottom:22};
export function inBossRoom(x:number,y:number){return x>=41&&x<=58&&y>=3&&y<=22;}
export function bossStage(adventure?:{inside:boolean;floor:number;x:number;y:number}|null){return !!adventure?.inside&&adventure.floor===1&&inBossRoom(adventure.x,adventure.y);}
export function inStage(boss:boolean,x:number,y:number){return inBossRoom(x,y)===boss;}
export const BOARDING_PANELS=[{id:'entry',x:49,y:87},{id:'boss',x:54,y:29}] as const;

export function stationDecorVisible(x:number,y:number,players:readonly {x:number;y:number}[]){return players.some(p=>p.x>=47&&p.x<=54&&p.y>=83&&p.y<=89)&&x>=43&&x<=47&&y>=84&&y<=87||players.some(p=>p.x>=52&&p.x<=56&&p.y>=25&&p.y<=30)&&x>=57&&x<=61&&y>=27&&y<=30;}
