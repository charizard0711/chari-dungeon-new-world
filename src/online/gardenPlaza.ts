/** Shared art footprints keep the compact market perimeter and collision aligned. */
export const plazaObjects=[
 {key:'oldprops',frame:0,x:0,y:0,w:6,h:4,artH:5,label:'冒険者の宿'},
 {key:'estate',x:6,y:1,w:3,h:3,artH:3,label:'住宅案内所'},
 {key:'booth',x:16,y:1,w:3,h:3,artH:3,label:'商人の店'},
 {key:'warehouse',x:19,y:0,w:6,h:4,artH:5,label:'倉庫'},
 {key:'gacha',x:1,y:12,w:2,h:2,artH:2.7,label:'魔法のガチャ'},
 {key:'barrel',x:8,y:9,w:1,h:1,artH:1.3,label:'訓練用の樽'},
 {key:'market',x:21,y:5,w:4,h:3,artH:3.2,label:'冒険者マーケット'},
 {key:'house1',x:0,y:16,w:6,h:3,artH:4.5,label:'広場の工房'},
 {key:'barber',x:6,y:16,w:3,h:3,artH:3.5,label:'南門の床屋'},
 {key:'lottery',x:16,y:16,w:3,h:3,artH:3.5,label:'星くじ売り場'},
 {key:'house2',x:19,y:16,w:6,h:3,artH:4.5,label:'広場の店'},
 {key:'bench',x:4,y:13,w:2,h:1,artH:1.3,label:''},
 {key:'bench',x:19,y:13,w:2,h:1,artH:1.3,label:''},
 {key:'flowers',x:0,y:14,w:1,h:1,artH:1.2,label:''},
 {key:'flowers',x:24,y:14,w:1,h:1,artH:1.2,label:''},
 ...[4,8,16,20].map(x=>({key:'lamp',x,y:5,w:1,h:1,artH:2.3,label:''})),
 ...[8,16].map(x=>({key:'lamp',x,y:14,w:1,h:1,artH:2.3,label:''})),
 {key:'npcs',frame:0,x:16,y:11,w:1,h:1,artH:1.3,label:'案内人リーフ'},
 {key:'npcs',frame:4,x:18,y:4,w:1,h:1,artH:1.2,label:'商人ミラ'},
];
export function plazaBlocked(x:number,y:number){return x>=11&&x<=13&&y>=8&&y<=10||plazaObjects.some(o=>x>=o.x&&x<o.x+o.w&&y>=o.y&&y<o.y+o.h);}
