import {townBlocked} from './townLayout';
export interface TownTile{x:number;y:number;}
/** Cardinal steps only. The destination is never reached through a diagonal tween. */
export function townPath(start:TownTile,end:TownTile,occupied:readonly TownTile[]=[],blocked:(x:number,y:number)=>boolean=townBlocked):TownTile[]{
 if(start.x===end.x&&start.y===end.y)return [];
 const key=(p:TownTile)=>`${p.x},${p.y}`,busy=new Set(occupied.map(key));
 if(blocked(end.x,end.y)||busy.has(key(end)))return [];
 if(Math.abs(start.x-end.x)+Math.abs(start.y-end.y)===1)return [{...end}];
 const queue=[start],previous=new Map<string,TownTile|null>([[key(start),null]]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(p.x===end.x&&p.y===end.y){const path:TownTile[]=[];let cursor:TownTile|null=p;while(cursor&&(cursor.x!==start.x||cursor.y!==start.y)){path.push(cursor);cursor=previous.get(key(cursor))??null;}return path.reverse();}
  for(const [dx,dy]of [[0,1],[-1,0],[1,0],[0,-1]]){const next={x:p.x+dx,y:p.y+dy},id=key(next);if(!blocked(next.x,next.y)&&!busy.has(id)&&!previous.has(id)){previous.set(id,p);queue.push(next);}}
 }
 return [];
}
