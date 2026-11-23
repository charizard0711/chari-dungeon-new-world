import {streamTerrain,TERRAIN_CHUNK} from './terrainChunks';
import {ADVENTURE_CONFIG as C} from './layout';
const T=48,LIFT=28,W=C.width,H=C.height;
const ground=(x:number,y:number)=>C.rows[y]?.[x]==='.';
const wallRaw=(x:number,y:number)=>x>=0&&y>=0&&x<W&&y<H&&!ground(x,y)&&[-1,0,1].some(dy=>[-1,0,1].some(dx=>ground(x+dx,y+dy)));
const cells=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>wallRaw(x,y)));
const wall=(x:number,y:number)=>cells[y]?.[x]??false;
export function wallTheme(x:number,y:number){return x>=40&&x<=59&&y>=2&&y<=23?2:(x<=9&&y>=31&&y<=39||x>=15&&x<=30&&y>=56&&y<=69)?1:0;}
/** World-aligned wall union, baked once; no geometry work during movement. */
export function drawContinuousWalls(scene:any){
const atlas=scene.textures.get('maze_continuous_wall').getSourceImage() as HTMLImageElement;
const canvas=document.createElement('canvas');canvas.width=TERRAIN_CHUNK*T;canvas.height=TERRAIN_CHUNK*T+LIFT+16;
const ctx=canvas.getContext('2d')!;let theme=0;
const patterns=[0,1,2].map(row=>{const tile=document.createElement('canvas');tile.width=256;tile.height=104;const g=tile.getContext('2d')!,sw=atlas.width/3,sh=atlas.height/3;g.drawImage(atlas,6,row*sh+8,sw-12,sh-16,0,0,256,104);return ctx.createPattern(tile,'repeat')!;});
const topPatterns=[0,1,2].map(row=>{const tile=document.createElement('canvas');tile.width=192;tile.height=96;tile.getContext('2d')!.drawImage(atlas,10,row*atlas.height/3+150,atlas.width/3-20,220,0,0,192,96);return ctx.createPattern(tile,'repeat')!;});
function polygon(points:number[][]){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
function face(x:number,y:number,width:number){const top=y-LIFT;ctx.save();ctx.beginPath();ctx.rect(x,top,width,LIFT);ctx.clip();ctx.fillStyle=patterns[theme];ctx.fillRect(x,top,width,LIFT);const shade=ctx.createLinearGradient(0,top,0,y);shade.addColorStop(0,'#00000020');shade.addColorStop(.2,'#00000000');shade.addColorStop(1,'#000000a8');ctx.fillStyle=shade;ctx.fillRect(x,top,width,LIFT);ctx.restore();ctx.fillStyle='#080e1690';ctx.fillRect(x,y-3,width,3);ctx.fillStyle='#e7e5c746';ctx.fillRect(x,top,width,2);}
function drawWalls(){
 if(false){for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(wall(x,y)){const sw=atlas.width/3,sh=atlas.height/3;ctx.drawImage(atlas,((x+y)%3)*sw,theme*sh,sw,sh,x*T,y*T,T,T);}return;}
 // One connected footprint: no square borders or repeated end caps between tiles.
 for(let y=0;y<H;y++){let x=0;while(x<W){if(!wall(x,y)||wall(x,y+1)){x++;continue;}const start=x;while(x<W&&wall(x,y)&&!wall(x,y+1))x++;const shadow=ctx.createLinearGradient(0,(y+1)*T,0,(y+1)*T+14);shadow.addColorStop(0,'#00000090');shadow.addColorStop(1,'#00000000');ctx.fillStyle=shadow;ctx.fillRect(start*T,(y+1)*T,(x-start)*T,14);face(start*T,(y+1)*T,(x-start)*T);}}
 // Exposed east/west edges shade a continuous wall return, not separate blocks.
 for(let x=0;x<W;x++)for(const side of [-1,1]){let y=0;while(y<H){if(!wall(x,y)||wall(x+side,y)){y++;continue;}const start=y;while(y<H&&wall(x,y)&&!wall(x+side,y))y++;const edge=(x+(side>0?1:0))*T;polygon([[edge,start*T-LIFT],[edge,y*T-LIFT],[edge,y*T],[edge-side*7,y*T-5],[edge-side*7,start*T]]);ctx.fillStyle=side>0?'#17202be6':'#263242db';ctx.fill();}}
 const top=new Path2D();for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(wall(x,y))top.rect(x*T,y*T-LIFT,T,T);
 ctx.fillStyle=topPatterns[theme];ctx.fill(top);ctx.fillStyle=['#75929a35','#e5f6da35','#85739c30'][theme];ctx.fill(top);
 // Outline just the union boundary, so a long horizontal wall reads as one structure.
 ctx.beginPath();for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(wall(x,y)){const l=x*T,r=l+T,t=y*T-LIFT,b=t+T;if(!wall(x,y-1)){ctx.moveTo(l,t);ctx.lineTo(r,t);}if(!wall(x,y+1)){ctx.moveTo(l,b);ctx.lineTo(r,b);}if(!wall(x-1,y)){ctx.moveTo(l,t);ctx.lineTo(l,b);}if(!wall(x+1,y)){ctx.moveTo(r,t);ctx.lineTo(r,b);}}ctx.lineWidth=4;ctx.strokeStyle='#0b1723c0';ctx.stroke();ctx.lineWidth=1;ctx.strokeStyle=['#b3bfc3','#e4e5cc','#a897ba'][theme];ctx.stroke();
}

streamTerrain(scene,W,H,(cx,cy)=>{
 if(!Array.from({length:TERRAIN_CHUNK},(_,dy)=>Array.from({length:TERRAIN_CHUNK},(_,dx)=>wall(cx+dx,cy+dy)).some(Boolean)).some(Boolean))return {destroy(){}};
 const key=`maze-connected-${cx}-${cy}`;
 if(scene.textures.exists(key))scene.textures.remove(key);
 ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate(-cx*T,-cy*T+LIFT);
 for(theme=0;theme<3;theme++){ctx.save();ctx.beginPath();for(let y=cy;y<Math.min(cy+TERRAIN_CHUNK,H);y++)for(let x=cx;x<Math.min(cx+TERRAIN_CHUNK,W);x++)if(wall(x,y)&&wallTheme(x,y)===theme)ctx.rect(x*T,y*T-LIFT,T,T+LIFT+14);ctx.clip();drawWalls();ctx.restore();}
 ctx.restore();const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d')!.drawImage(canvas,0,0);scene.textures.addCanvas(key,copy);
 const image=scene.add.image(cx*T,cy*T-LIFT,key).setOrigin(0).setDepth(-3);
 return {destroy(){image.destroy();scene.textures.remove(key);copy.width=copy.height=1;}};
});
scene.events.once('shutdown',()=>{canvas.width=canvas.height=1;});
}
