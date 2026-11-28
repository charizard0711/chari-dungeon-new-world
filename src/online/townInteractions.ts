export const TOWN_INTERACTIONS = [
 {id:'guide',x:16,y:11,label:'案内人リーフ',cursor:'talk'},
 {id:'merchant',x:18,y:4,label:'商人ミラ',cursor:'talk'},
 {id:'barber',x:7,y:18,label:'南門の床屋',cursor:'talk'},
 {id:'lottery',x:17,y:18,label:'星くじ売り場',cursor:'talk'},
 {id:'market',x:22,y:7,label:'冒険者マーケット',cursor:'interact'},
 {id:'inn',x:3,y:3,label:'冒険者の宿',cursor:'interact'},
 {id:'gacha',x:2,y:13,label:'魔法のガチャ',cursor:'interact'}
] as const;
export const WAREHOUSE_DOOR={id:'warehouse',x:22,y:3,label:'倉庫へ入る',cursor:'interact'} as const;
export type TownInteraction = typeof TOWN_INTERACTIONS[number]|typeof WAREHOUSE_DOOR;
export function interactionAt(x:number,y:number){if(x===22&&y===3)return WAREHOUSE_DOOR;return TOWN_INTERACTIONS.find(n=>n.id!=='inn'&&n.x===x&&n.y===y);}
export function canInteract(player:{x:number;y:number},npc:{x:number;y:number}){return Math.abs(player.x-npc.x)+Math.abs(player.y-npc.y)<=2;}
