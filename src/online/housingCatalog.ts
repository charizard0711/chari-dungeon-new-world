export const HOUSE_PRICES=[500_000,750_000,1_000_000,1_500_000,2_500_000,4_000_000,6_000_000,8_000_000,10_000_000] as const;
export const HOUSE_TYPES=['小さなコテージ','木組みの家','石造りの家','庭付きの家','二階建ての家','広い邸宅','塔付きの邸宅','貴族の屋敷','王宮の大邸宅'] as const;
export const HOUSING_DISTRICTS=[{id:'north',name:'北・蒼樹住宅区',x:-4,y:-34},{id:'east',name:'東・朝陽住宅区',x:26,y:-7},{id:'south',name:'南・花灯住宅区',x:-4,y:20},{id:'west',name:'西・夕月住宅区',x:-34,y:-7}] as const;
export const HOUSING_STALL={x:16,y:2,approachX:16,approachY:3};
export const HOUSES=HOUSING_DISTRICTS.flatMap(d=>[0,4,8].map(i=>{
 const price=HOUSE_PRICES[i];
 const w=[3,3,4,5,5,6,6,7,7][i],h=[3,4,4,4,5,5,6,6,7][i],x=d.x+i%3*11+Math.floor((11-w)/2),y=d.y+Math.floor(i/3)*11+8-h;
 return {id:`${d.id}-${i+1}`,name:`${d.name.slice(0,1)}${i+1}番地 · ${HOUSE_TYPES[i]}`,district:d.id,districtName:d.name,tier:i+1,price,x,y,w,h,doorX:x+Math.floor(w/2),doorY:y+h-1,width:[10,11,12,13,14,16,18,20,24][i],height:[9,9,10,11,12,13,14,16,18][i]};
}));
export type HouseDefinition=typeof HOUSES[number];
export function housingGround(x:number,y:number){return HOUSING_DISTRICTS.some(d=>x>=d.x&&x<d.x+33&&y>=d.y&&y<d.y+33);}
export function houseAtDoor(x:number,y:number){return HOUSES.find(h=>h.doorX===x&&h.doorY===y);}
export function gardenFence(x:number,y:number){return HOUSES.some(h=>{const left=h.x-1,right=h.x+h.w,top=h.y-1,bottom=h.doorY+2;return x>=left&&x<=right&&y>=top&&y<=bottom&&(x===left||x===right||y===top||y===bottom&&x!==h.doorX);});}
export function housingSolid(x:number,y:number){return gardenFence(x,y)|| HOUSES.some(h=>x>=h.x&&x<h.x+h.w&&y>=h.y&&y<h.y+h.h)||(x>=15&&x<=17&&y>=1&&y<=2);}
export function houseFurniture(width:number,height:number,tier:number){return [
 {kind:'bed',x:2,y:2,w:tier>=5?3:2,h:3,frame:tier>=7?1:0},
 {kind:'desk',x:width-4,y:4,w:2,h:1,frame:tier>=7?3:2},
 {kind:'chair',x:width-4,y:5,w:1,h:1,frame:4},
 {kind:'bookcase',x:1,y:1,w:3,h:1,frame:5},
 {kind:'crystal',x:width-3,y:2,w:1,h:1,frame:6},
 {kind:'plant',x:1,y:height-3,w:1,h:1,frame:7},
 ...(tier>=6?[{kind:'sofa',x:2,y:height-4,w:3,h:1,frame:8}]:[]),
 ...(tier===9?[{kind:'piano',x:width-5,y:height-5,w:3,h:2,frame:9}]:[])
 ];}
export function houseBlocked(x:number,y:number,house:{width:number;height:number;tier:number}){return x<1||y<1||x>=house.width-1||y>=house.height-1||houseFurniture(house.width,house.height,house.tier).some(f=>x>=f.x&&x<f.x+f.w&&y>=f.y&&y<f.y+f.h);}
