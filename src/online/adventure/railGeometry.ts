/** Tile centres, gauge and tangents match exactly at every shared edge. */
export function railTilePath(frame:number){
 if(frame<2)return Array.from({length:49},(_,i)=>frame===0?{x:i,y:24}:{x:24,y:i});
 const corners=[{x:48,y:0,start:Math.PI},{x:48,y:48,start:Math.PI},{x:0,y:48,start:0},{x:0,y:0,start:0}];
 const c=corners[frame-2],sign=frame===2||frame===4?-1:1;
 return Array.from({length:49},(_,i)=>{const a=c.start+sign*i/48*Math.PI/2;return{x:c.x+24*Math.cos(a),y:c.y+24*Math.sin(a)};});
}
