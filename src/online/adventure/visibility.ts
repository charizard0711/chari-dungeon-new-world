export interface SightSource{x:number;y:number;character_id?:string;}
export type SightState={lightTurns?:Record<string,number>;keys?:string[];bossEncounter?:{phase:string}};
/** Supercover ray: a wall is visible, but nothing beyond it; closed corners do not leak. */
export function lineOfSight(x0:number,y0:number,x1:number,y1:number,wall:(x:number,y:number)=>boolean){
 let x=x0,y=y0,mx=0,my=0;const dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=Math.sign(x1-x0),sy=Math.sign(y1-y0);
 while(mx<dx||my<dy){const decision=(1+2*mx)*dy-(1+2*my)*dx;if(decision===0){const targetWall=x+sx===x1&&y+sy===y1&&wall(x1,y1);if(!targetWall&&(wall(x+sx,y)||wall(x,y+sy)))return false;x+=sx;y+=sy;mx++;my++;}else if(decision<0){x+=sx;mx++;}else{y+=sy;my++;}if(x===x1&&y===y1)return true;if(wall(x,y))return false;}return true;
}
export function partyCanSee(x:number,y:number,allies:SightSource[],radius=3,wall?:(x:number,y:number)=>boolean,state:SightState={}){return allies.some(p=>{const light=(state.lightTurns?.[p.character_id??'']??0)>0,r=light?10:radius;return Math.max(Math.abs(x-p.x),Math.abs(y-p.y))<=r&&(light||!wall||lineOfSight(p.x,p.y,x,y,wall));});}
export function partySightRadius(_snapshot:unknown){return 3;}

/** Reveal wall surfaces alongside visible floor, without extending floor/entity sight.
 * Only original visible ground contributes: wall visibility never propagates.
 */
export function terrainVisibility(width:number,height:number,canSee:(x:number,y:number)=>boolean,ground:(x:number,y:number)=>boolean){
 const visible=new Set<number>();
 const add=(x:number,y:number)=>{if(x>=0&&y>=0&&x<width&&y<height)visible.add(y*width+x);};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  if(!canSee(x,y))continue;add(x,y);
  if(ground(x,y))for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]])if(!ground(x+dx,y+dy))add(x+dx,y+dy);
 }
 return(x:number,y:number)=>visible.has(y*width+x);
}
