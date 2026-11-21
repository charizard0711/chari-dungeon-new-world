import {plazaBlocked} from './gardenPlaza';
export const TILE=48,MIN_X=-24,MAX_X=48,MIN_Y=-23,MAX_Y=41;
export type Point={x:number;y:number};
export type Prop=Point&{kind:string;w:number;h:number;solid:boolean};
export const houses=['north','east','west','south'].flatMap((district,d)=>[0,1,2].map(i=>{
 const right=d%2===1,bottom=d>=2,index=right?i:2-i,tier=[1,5,9][index],w=[3,5,7][index],h=[3,5,7][index];
 const plotX=(right?16:-22)+i*10,plotY=bottom?24:-21,doorX=plotX+5,doorY=plotY+8;
 return{id:`${district}-${tier}`,district,tier,price:[500000,2500000,10000000][index],x:doorX-Math.floor(w/2),y:doorY-h+1,w,h,doorX,doorY,plotX,plotY,art:index*4+d};
}));
export const props:Prop[]=[];
const occupied=new Set<string>(),key=(x:number,y:number)=>`${x},${y}`;
function add(kind:string,x:number,y:number,w=1,h=1,solid=true){if(solid&&occupied.has(key(x,y)))return;props.push({kind,x,y,w,h,solid});if(solid)occupied.add(key(x,y));}
// Continuous visible perimeter, with a three-tile gate in each cardinal direction.
for(let x=MIN_X;x<=MAX_X;x++)for(const y of [MIN_Y,MAX_Y])if(Math.abs(x-12)>1)add('wallH',x,y);
for(let y=MIN_Y+1;y<MAX_Y;y++)for(const x of [MIN_X,MAX_X])if(Math.abs(y-9)>1)add('wallV',x,y);
for(const h of houses){
 for(let x=h.plotX;x<=h.plotX+9;x++){add('wallH',x,h.plotY-1);if(x!==h.doorX)add('wallH',x,h.plotY+12);}
 for(let y=h.plotY;y<h.plotY+12;y++)for(const x of [h.plotX,h.plotX+9])add('wallV',x,y);
 add('gate',h.doorX,h.plotY+12,2,2,false);
 for(const x of [h.plotX+1,h.plotX+8]){add('cypress',x,h.plotY+4,1.3,2.6);add('flowers',x,h.plotY+10,1.2,1.1);}
 add('lamp',h.doorX+2,h.plotY+11,.8,2.2);
 add('shrub',h.doorX-2,h.plotY+10,1.3,1.3);
 // Layered planting along fences, leaving a clear path from gate to front door.
 for(const x of [h.plotX+1,h.plotX+8])for(const dy of [1,7,9])add(dy===1?'oak':'shrub',x,h.plotY+dy,dy===1?2.4:1.5,dy===1?3:1.5);
 for(const dx of [2,3,7])add('flowers',h.plotX+dx,h.plotY+11,1.2,1.2);
 if(h.tier===1){add('oak',h.doorX-2,h.plotY+3,2.5,3);add('shrub',h.doorX+2,h.plotY+5,1.5,1.5);}
 if(h.tier===9){add('statue',h.doorX-2,h.plotY+11,1.1,1.6);add('flowers',h.doorX+3,h.plotY+8,1.2,1.1);}
}
// Planted promenades flank the central plaza. All trunks/flower beds are solid.
for(const x of [-20,-15,-10,34,39,44])for(const y of [-4,2,16,22]){
 add('oak',x,y,2.8,3.4);add('flowers',x+2,y+1,1.5,1.1);add('shrub',x,y+2,1.4,1.3);
}
for(const x of [-7,30])for(const y of [-4,3,15,22]){add('lamp',x,y,.9,2.4);add('bench',x+(x<0?-2:2),y,2,1.3);}
for(const y of [-6,22])for(const x of [-17,-5,7,17,29,41])add('lamp',x,y,.9,2.4);
for(const x of [-22,46])for(const y of [-17,-7,4,15,27,37])add('banner',x,y,1.2,2.6);
for(const x of [-23,47])for(let y=-19;y<=37;y+=3)if(Math.abs(y-9)>3)add('oak',x,y,2.5,3.1);
for(let x=-20;x<=44;x+=3)if(Math.abs(x-12)>4)for(const y of [-22,40])add('shrub',x,y,2,1.7);
for(const y of [-3,20])for(let x=0;x<=24;x+=3)if(Math.abs(x-12)>3){add('flowers',x,y,1.6,1.2);add('shrub',x+1,y,1.6,1.5);}
for(const x of [-1,25])for(let y=1;y<=17;y+=3)if(Math.abs(y-9)>2)add('shrub',x,y,1.8,1.6);
for(const x of [-13,-8,32,37])for(const y of [-2,4,14,20]){add('flowers',x,y,1.5,1.2);add('shrub',x+1,y+1,1.7,1.6);}
export function ground(x:number,y:number):'stone'|'grass'|'path'{
 if(x>=0&&x<=24&&y>=0&&y<=18)return 'stone';
 if(Math.abs(x-12)<=2||Math.abs(y-9)<=2||y>=-7&&y<=-5||y>=21&&y<=23||x>=-5&&x<=-3&&y>=-7&&y<=23||x>=27&&x<=29&&y>=-7&&y<=23||x>=-19&&x<=-17&&y>=-8&&y<=23||x>=41&&x<=43&&y>=-8&&y<=23||y>=37&&y<=39)return 'path';
 for(const h of houses)if(x===h.doorX&&y>h.doorY&&y<=h.plotY+14)return 'path';
 return 'grass';
}
export function blocked(x:number,y:number){
 if(x<MIN_X||x>MAX_X||y<MIN_Y||y>MAX_Y||occupied.has(key(x,y)))return true;
 if(houses.some(h=>x>=h.x&&x<h.x+h.w&&y>=h.y&&y<=h.doorY))return true;
 return plazaBlocked(x,y);
}
