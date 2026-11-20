export interface SolidRect{x:number;y:number;w:number;h:number;}
export interface Scenery{atlas:'detail'|'architecture';frame:number;x:number;y:number;w:number;h:number;ground?:boolean;solid?:SolidRect;}
export const SCENERY:Scenery[]=[];
const prop=(frame:number,x:number,y:number,w=1.5,h=2,solid?:SolidRect)=>SCENERY.push({atlas:'detail',frame,x,y,w,h,solid});
const arch=(frame:number,x:number,y:number,w:number,h:number,ground=false)=>SCENERY.push({atlas:'architecture',frame,x,y,w,h,ground});
// Each room is assembled from floor, water, architecture, vegetation and furniture layers.
for(const [x,y]of [[3,11],[10,11],[10,16],[10,3],[17,3],[26,10],[37,10],[26,17],[37,17],[34,3],[41,3],[47,3],[54,3],[46,19],[55,19],[63,3],[69,3],[76,9],[84,9],[76,20],[84,20]])prop(1,x,y,1.3,2.7,{x,y,w:1,h:1});
for(const [x,y]of [[9,7],[17,7],[26,15],[36,15],[34,6],[40,6],[34,29],[40,29],[76,18],[84,18]])prop(0,x,y,1.7,1.7,{x,y,w:1,h:1});
for(const [x,y]of [[3,16],[9,16],[9,2],[18,5],[26,9],[37,9],[26,18],[38,17],[33,2],[42,4],[46,2],[55,5],[45,24],[56,24],[63,2],[70,6],[33,30],[41,30]])prop(2,x,y,2.2,1.6);
for(const [x,y]of [[11,6],[17,5],[28,17],[35,16],[34,28],[40,27],[58,10],[65,15]])prop(3,x,y,1.1,.8);
for(const [x,y]of [[3,10],[10,10],[13,9],[27,8],[38,9],[47,9],[54,9],[61,10],[66,10],[76,11],[84,11]])prop(4,x,y,1.1,2.2,{x,y,w:1,h:1});
prop(8,8,23,3.3,3,{x:7,y:22,w:3,h:2});prop(6,6,25,1.8,1.5,{x:6,y:25,w:1,h:1});prop(7,13,24,1.7,1.5,{x:13,y:24,w:1,h:1});prop(5,13,28,2.5,1.3,{x:12,y:28,w:3,h:1});
prop(9,38,3,3,3,{x:38,y:3,w:2,h:1});
for(const [x,y]of [[76,7],[80,7],[84,7],[75,19],[85,16],[45,18],[56,21],[64,24],[70,29]])prop(10,x,y,2.3,2.8,{x,y,w:2,h:1});
for(const [x,y]of [[20,23],[28,29],[58,15],[72,26]])prop(11,x,y,2,3,{x,y,w:1,h:1});
for(const [x,y]of [[25,11],[38,11],[29,18],[35,18],[10,2],[18,2]])prop(12,x,y,2.5,2.5,{x,y,w:2,h:1});
for(const [x,y]of [[47,6],[54,6],[76,15],[84,15],[63,24],[70,24]])prop(15,x,y,1.1,1.4,{x,y,w:1,h:1});
arch(5,14,10,4,4);arch(5,28,9,4,4);arch(7,50,7,9,7,true);arch(7,51,23,9,7,true);arch(8,80,9,9,7);
arch(3,14,21,3,6,true);arch(4,21,14,7,3,true);arch(4,60,13,7,3,true);arch(3,65,20,3,6,true);
arch(6,20,30,3,6);arch(6,58,19,3,7);arch(6,72,18,3,7);
export const WATER:SolidRect[]=[{x:10,y:3,w:6,h:3},{x:34,y:27,w:5,h:2}];
export const SCENERY_SOLIDS:SolidRect[]=[...SCENERY.flatMap(p=>p.solid?[p.solid]:[]),...WATER,{x:77,y:8,w:2,h:2},{x:83,y:8,w:2,h:2},{x:26,y:9,w:1,h:1},{x:30,y:9,w:1,h:1},{x:30,y:13,w:3,h:2}];
export function insideRect(x:number,y:number,r:SolidRect){return x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h;}
export function terrainFrame(area:string|undefined,x:number,y:number){
 if(WATER.some(r=>insideRect(x,y,r)))return 6;
 if(area==='spring'||area==='fountain')return (x+y)%4?2:3;
 if(area==='tree')return Math.abs(x-31)+Math.abs(y-13)<4?15:(x*3+y)%4?2:14;
 if(area==='boss'||area==='spider')return 9;
 if(area==='treasury'||area==='golem')return 8;
 if(area==='portal')return 12;
 if(area==='trap')return 13;
 if(area==='market')return 11;
 return (x*3+y*7)%6===0?1:0;
}
