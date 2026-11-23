export const TERRAIN_CHUNK=8;
/** One-tile overscan covers raised walls; allocations depend on viewport, not floor size. */
export function terrainChunks(view:{x:number;y:number;width:number;height:number},width:number,height:number){
 const size=TERRAIN_CHUNK*48,margin=48,result:{x:number;y:number;key:string}[]=[];
 const left=Math.max(0,Math.floor((view.x-margin)/size)),top=Math.max(0,Math.floor((view.y-margin)/size));
 const right=Math.min(Math.ceil(width/TERRAIN_CHUNK)-1,Math.floor((view.x+view.width+margin)/size)),bottom=Math.min(Math.ceil(height/TERRAIN_CHUNK)-1,Math.floor((view.y+view.height+margin)/size));
 for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)result.push({x:x*TERRAIN_CHUNK,y:y*TERRAIN_CHUNK,key:x+','+y});return result;
}
export function streamTerrain(scene:any,width:number,height:number,create:(x:number,y:number)=>{destroy():void}){
 const resident=new Map<string,{destroy():void}>();let signature='';
 const update=()=>{const camera=scene.cameras.main,view={x:camera.scrollX,y:camera.scrollY,width:camera.width/camera.zoom,height:camera.height/camera.zoom};const chunks=terrainChunks(view,width,height),next=chunks.map(c=>c.key).join(';');if(next===signature)return;signature=next;const keep=new Set(chunks.map(c=>c.key));
 // Evict before allocating, including teleports and scene restarts.
 for(const [key,chunk]of resident)if(!keep.has(key)){chunk.destroy();resident.delete(key);}
 for(const c of chunks)if(!resident.has(c.key))resident.set(c.key,create(c.x,c.y));};
 scene.events.on('postupdate',update);const destroy=()=>{scene.events.off('postupdate',update);for(const chunk of resident.values())chunk.destroy();resident.clear();};scene.events.once('shutdown',destroy);return {update,destroy};
}
