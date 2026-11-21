import {houses as gardenHouses} from './gardenMap';
export const HOUSE_PRICES=[500_000,750_000,1_000_000,1_500_000,2_500_000,4_000_000,6_000_000,8_000_000,10_000_000] as const;
export const HOUSE_TYPES=['小さなコテージ','木組みの家','石造りの家','庭付きの家','二階建ての家','広い邸宅','塔付きの邸宅','貴族の屋敷','王宮の大邸宅'] as const;
export const HOUSING_DISTRICTS=[{id:'north',name:'北・蒼樹住宅区',x:-22,y:-21},{id:'east',name:'東・朝陽住宅区',x:16,y:-21},{id:'south',name:'南・花灯住宅区',x:16,y:24},{id:'west',name:'西・夕月住宅区',x:-22,y:24}] as const;
export const HOUSING_STALL={x:7,y:3,approachX:7,approachY:4};
export const HOUSES=[...gardenHouses].sort((a,b)=>HOUSING_DISTRICTS.findIndex(d=>d.id===a.district)-HOUSING_DISTRICTS.findIndex(d=>d.id===b.district)||a.tier-b.tier).map(g=>{const d=HOUSING_DISTRICTS.find(d=>d.id===g.district)!,i=g.tier-1;return {...g,name:`${d.name.slice(0,1)}${g.tier}番地 · ${HOUSE_TYPES[i]}`,districtName:d.name,width:[10,11,12,13,14,16,18,20,24][i],height:[9,9,10,11,12,13,14,16,18][i]};});
export type HouseDefinition=typeof HOUSES[number];
export function houseAtDoor(x:number,y:number){return HOUSES.find(h=>h.doorX===x&&h.doorY===y);}
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
