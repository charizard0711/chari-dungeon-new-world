export interface SightSource{x:number;y:number;}
/** Every ally contributes an unobstructed square of light, including four cardinal cells. */
export function partyCanSee(x:number,y:number,allies:SightSource[],radius=4){return allies.some(p=>Math.max(Math.abs(x-p.x),Math.abs(y-p.y))<=radius);}
export function partySightRadius(snapshot:{visionRadius?:number;enemies?:{key:string;hp:number}[]}){return snapshot.visionRadius===5||snapshot.enemies?.some(e=>e.key==='m_mush'&&e.hp<=0)?5:4;}
