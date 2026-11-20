export interface AdventureArea {id:string;name:string;x:number;y:number;w:number;h:number;sx:number;sy:number;color:number;}
export const ADVENTURE_W=88,ADVENTURE_H=34;
export const ADVENTURE_AREAS:AdventureArea[]=[
{id:'entry',name:'灯火の入口',x:2,y:10,w:10,h:8,sx:5,sy:14,color:0x477d60},
{id:'spring',name:'古い泉の庭',x:9,y:2,w:10,h:7,sx:14,sy:7,color:0x386c69},
{id:'market',name:'旅商人の休憩所',x:5,y:22,w:11,h:8,sx:11,sy:26,color:0x8b6545},
{id:'portal',name:'蒼い転送台',x:20,y:23,w:9,h:7,sx:24,sy:26,color:0x415c90},
{id:'tree',name:'精霊樹の広間',x:25,y:9,w:14,h:10,sx:31,sy:16,color:0x537942},
{id:'shrine',name:'苔むした祭壇',x:33,y:2,w:10,h:6,sx:38,sy:6,color:0x72724d},
{id:'golem',name:'石の守護者の間',x:46,y:2,w:10,h:7,sx:50,sy:7,color:0x8b7145},
{id:'spider',name:'紫糸の巣',x:45,y:18,w:12,h:8,sx:50,sy:23,color:0x665079},
{id:'falls',name:'滝音の橋',x:58,y:9,w:9,h:7,sx:62,sy:13,color:0x3c7484},
{id:'treasury',name:'封印された宝物庫',x:62,y:2,w:9,h:6,sx:66,sy:6,color:0x9c7b34},
{id:'trap',name:'紅蓮の試練',x:63,y:23,w:9,h:8,sx:67,sy:27,color:0x8c4849},
{id:'fountain',name:'地下水の泉',x:33,y:26,w:9,h:6,sx:37,sy:29,color:0x3f7781},
{id:'boss',name:'結晶門の聖域',x:75,y:7,w:11,h:15,sx:78,sy:17,color:0x754d8d}
];
const cells=Array.from({length:ADVENTURE_H},()=>Array(ADVENTURE_W).fill('#'));
const carve=(x:number,y:number,w:number,h:number)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(cells[yy]?.[xx])cells[yy][xx]='.';};
for(const a of ADVENTURE_AREAS)carve(a.x,a.y,a.w,a.h);
for(const [x,y,w,h]of [[10,12,68,3],[13,6,3,21],[14,5,25,3],[27,6,3,21],[37,5,15,3],[38,12,3,18],[39,21,13,3],[49,6,3,17],[55,21,13,3],[64,6,3,22],[68,13,3,14],[70,12,9,3],[28,27,10,3]])carve(x,y,w,h);
export const ADVENTURE_GATES=[{id:'amber',x:44,y:11,w:1,h:4,key:'amber'},{id:'treasury',x:64,y:8,w:3,h:1,key:'amber'},{id:'violet',x:73,y:12,w:1,h:3,key:'violet'}];
export const ADVENTURE_PROPS=[{id:'tree',frame:0,x:31,y:12,size:180,kind:'heal'},{id:'spring',frame:4,x:12,y:4,size:100,kind:'heal'},{id:'portal',frame:1,x:23,y:25,size:88,kind:'portal'},{id:'fountain',frame:4,x:36,y:27,size:112,kind:'heal'},{id:'treasure',frame:5,x:66,y:3,size:80,kind:'chest'},{id:'shrine',frame:5,x:37,y:3,size:68,kind:'chest'},{id:'merchant',frame:-1,x:8,y:24,size:64,kind:'merchant'},{id:'trap_switch',frame:7,x:67,y:24,size:80,kind:'switch'},{id:'stairs',frame:6,x:82,y:10,size:110,kind:'stairs'}];
export const ADVENTURE_TRAPS=[{x:67,y:25},{x:68,y:25},{x:69,y:25},{x:67,y:26},{x:68,y:26},{x:69,y:26},{x:67,y:27},{x:68,y:27},{x:69,y:27}];
export const ADVENTURE_MONSTERS=[
{id:'m1',key:'m_jelly',name:'洞窟ゼリー',x:19,y:12,hp:24,max:24,atk:4,def:0},
{id:'m2',key:'m_bat',name:'遺跡コウモリ',x:20,y:6,hp:22,max:22,atk:4,def:0},
{id:'m3',key:'m_moss',name:'苔の騎士',x:29,y:10,hp:42,max:42,atk:6,def:2},
{id:'m4',key:'m_ghost',name:'泉の亡霊',x:35,y:26,hp:30,max:30,atk:5,def:1},
{id:'m5',key:'m_spider',name:'紫糸グモ',x:45,y:21,hp:30,max:30,atk:5,def:1},
{id:'m6',key:'m_guard',name:'宝物庫の衛兵',x:64,y:4,hp:45,max:45,atk:6,def:3},
{id:'m7',key:'m_wisp',name:'紅蓮のウィスプ',x:65,y:25,hp:30,max:30,atk:5,def:1},
{id:'m8',key:'m_bat',name:'結晶コウモリ',x:70,y:13,hp:28,max:28,atk:5,def:1},
{id:'guardian',key:'m_golem',name:'琥珀鍵の石守',x:50,y:4,hp:140,max:140,atk:9,def:3,dropKey:'amber',elite:true},
{id:'weaver',key:'m_spider',name:'紫鍵の織り手',x:51,y:20,hp:130,max:130,atk:8,def:2,dropKey:'violet',elite:true},
{id:'vesper',key:'boss_vesper',name:'結晶門の守護者ヴェスパー',x:81,y:12,hp:480,max:480,atk:16,def:4,boss:true}
];
export const ADVENTURE_CONFIG={version:1,width:ADVENTURE_W,height:ADVENTURE_H,rows:cells.map(r=>r.join('')),areas:ADVENTURE_AREAS,gates:ADVENTURE_GATES,props:ADVENTURE_PROPS,traps:ADVENTURE_TRAPS,enemies:ADVENTURE_MONSTERS};
export function adventureBlocked(x:number,y:number,state?:{keys?:string[];floor?:number}){if(state?.floor===2)return x<1||y<1||x>11||y>9;if(cells[y]?.[x]!=='.'||ADVENTURE_PROPS.some(p=>p.x===x&&p.y===y))return true;return ADVENTURE_GATES.some(g=>!(state?.keys??[]).includes(g.key)&&x>=g.x&&x<g.x+g.w&&y>=g.y&&y<g.y+g.h);}
export const adventureAreaAt=(x:number,y:number)=>ADVENTURE_AREAS.find(a=>x>=a.x&&x<a.x+a.w&&y>=a.y&&y<a.y+a.h);
