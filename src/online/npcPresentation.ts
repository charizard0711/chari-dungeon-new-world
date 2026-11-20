export const NPC_DIRECTION_FRAME={down:0,left:1,right:2,up:3} as const;
export function npcIdlePose(time:number,seed:number){return {y:Math.sin(time*.0018+seed)*.55,scaleY:1+Math.sin(time*.002+seed)*.008,angle:Math.sin(time*.0008+seed)*.35};}
