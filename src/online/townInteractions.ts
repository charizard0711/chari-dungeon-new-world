export const TOWN_INTERACTIONS = [
 {id:'guide',x:16,y:11,label:'案内人リーフ',cursor:'talk'},
 {id:'merchant',x:18,y:9,label:'商人ミラ',cursor:'talk'},
 {id:'gacha',x:7,y:9,label:'魔法のガチャ',cursor:'interact'}
] as const;
export type TownInteraction = typeof TOWN_INTERACTIONS[number];
export function interactionAt(x:number,y:number){return TOWN_INTERACTIONS.find(n=>n.x===x&&n.y===y);}
export function canInteract(player:{x:number;y:number},npc:{x:number;y:number}){return Math.abs(player.x-npc.x)+Math.abs(player.y-npc.y)<=2;}
