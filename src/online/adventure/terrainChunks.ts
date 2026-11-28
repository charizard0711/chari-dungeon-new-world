export const TERRAIN_CHUNK=8;
const TILE=48, SIZE=TERRAIN_CHUNK*TILE, MARGIN=TILE;
type View={x:number;y:number;width:number;height:number};

function chunkBounds(view:View,width:number,height:number){
 return {
  left:Math.max(0,Math.floor((view.x-MARGIN)/SIZE)),
  top:Math.max(0,Math.floor((view.y-MARGIN)/SIZE)),
  right:Math.min(Math.ceil(width/TERRAIN_CHUNK)-1,Math.floor((view.x+view.width+MARGIN)/SIZE)),
  bottom:Math.min(Math.ceil(height/TERRAIN_CHUNK)-1,Math.floor((view.y+view.height+MARGIN)/SIZE)),
 };
}

function enumerateChunks({left,top,right,bottom}:ReturnType<typeof chunkBounds>){
 const result:{x:number;y:number;key:string}[]=[];
 for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)result.push({x:x*TERRAIN_CHUNK,y:y*TERRAIN_CHUNK,key:x+','+y});
 return result;
}

/** One-tile overscan keeps adjacent terrain resident. */
export function terrainChunks(view:View,width:number,height:number){
 return enumerateChunks(chunkBounds(view,width,height));
}

export function streamTerrain(scene:any,width:number,height:number,create:(x:number,y:number)=>{destroy():void}){
 const resident=new Map<string,{destroy():void}>();
 let previous:ReturnType<typeof chunkBounds>|undefined;
 const update=()=>{
  const camera=scene.cameras.main;
  const next=chunkBounds({x:camera.scrollX,y:camera.scrollY,width:camera.width/camera.zoom,height:camera.height/camera.zoom},width,height);
  if(previous?.left===next.left&&previous?.right===next.right&&previous?.top===next.top&&previous?.bottom===next.bottom)return;
  previous=next;
  const chunks=enumerateChunks(next),keep=new Set(chunks.map(c=>c.key));
  // Evict before allocating, including teleports and scene restarts.
  for(const [key,chunk]of resident)if(!keep.has(key)){chunk.destroy();resident.delete(key);}
  for(const c of chunks)if(!resident.has(c.key))resident.set(c.key,create(c.x,c.y));
 };
 scene.events.on('postupdate',update);
 const destroy=()=>{scene.events.off('postupdate',update);for(const chunk of resident.values())chunk.destroy();resident.clear();};
 scene.events.once('shutdown',destroy);
 return {update,destroy};
}
