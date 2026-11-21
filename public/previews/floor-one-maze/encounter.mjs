// Preview domain model; port these transitions to the authoritative server before release.
export const fountainKind=roll=>roll<.01?'gold':roll<.11?'silver':'normal';
export function createRun(count=2,kind=fountainKind(Math.random())){
 return {kind,phase:'waiting',bossHp:480,participants:[],pads:{},music:'floor',players:Array.from({length:count},(_,i)=>({id:i+1,hp:35,maxHp:100,atk:40,def:20,buff:1,used:false,inside:true,gear:[{name:'装備中の剣',type:'weapon',equipped:true,dur:20,max:150},{name:'装備中の盾',type:'shield',equipped:true,dur:0,max:100},{name:'予備の弓',type:'weapon',equipped:false,dur:3,max:120}]}))};
}
export function useFountain(run,id){const p=run.players.find(p=>p.id===id);if(!p||p.used||p.hp<=0||run.phase==='cleared')return false;p.used=true;p.hp=p.maxHp;
 if(run.kind==='silver')p.gear.filter(g=>g.equipped).forEach(g=>g.dur=g.max);
 else if(run.kind==='gold'){p.gear.filter(g=>g.type==='weapon').forEach(g=>g.dur=g.max);p.buff=1.5;}
 else p.buff=1.1;
 return true;
}
export function ready(run,id,pad){if(run.phase!=='waiting')return false;const live=run.players.filter(p=>p.inside&&p.hp>0);if(!live.some(p=>p.id===id)||pad<0||pad>=live.length||Object.entries(run.pads).some(([pid,n])=>+pid!==id&&n===pad))return false;run.pads[id]=pad;
 if(live.every(p=>run.pads[p.id]!==undefined)){run.participants=live.map(p=>p.id);run.phase='opening';run.music='boss';}return true;}
export function beginBattle(run){if(run.phase==='opening')run.phase='battle';}
export function locked(run){return ['opening','battle','returning'].includes(run.phase);}
export function leave(run,id){if(locked(run))return false;const p=run.players.find(p=>p.id===id);if(!p)return false;p.inside=false;run.pads={};return true;}
export function die(run,id){const p=run.players.find(p=>p.id===id);if(!p||!run.participants.includes(id)||!locked(run)||p.hp<=0)return false;p.hp=0;p.inside=false;delete run.pads[id];if(run.participants.every(id=>{const p=run.players.find(p=>p.id===id);return !p.inside||p.hp<=0;})){run.phase='returning';run.music='floor';}return true;}
export function resetBoss(run){if(run.phase!=='returning')return false;run.phase='waiting';run.bossHp=480;run.pads={};run.participants=[];return true;}
export function reenter(run,id){if(locked(run)||run.phase==='cleared')return false;const p=run.players.find(p=>p.id===id);if(!p)return false;p.hp=p.maxHp;p.inside=true;run.pads={};return true;}
export function attack(run,id){const p=run.players.find(p=>p.id===id);if(run.phase!=='battle'||!p?.inside||p.hp<=0||!run.participants.includes(id))return false;run.bossHp=Math.max(0,run.bossHp-Math.round(p.atk*p.buff));if(!run.bossHp){run.phase='cleared';run.music='floor';run.players.forEach(p=>p.buff=1);}return true;}
