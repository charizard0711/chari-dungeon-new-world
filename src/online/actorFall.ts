export type ActorFall={kind:'death'|'knockback';at:number;side:-1|1};

const ease=(v:number)=>{const p=Math.max(0,Math.min(1,v));return p*p*(3-2*p);};
export function actorFallPose(fall:ActorFall,time:number){
 const age=Math.max(0,time-fall.at);
 if(fall.kind==='death'){
  const collapse=ease(age/380);
  return {angle:fall.side*86*collapse,x:fall.side*6*collapse,y:19*collapse,seated:false};
 }
 const fallBack=ease(age/165),stand=ease((age-420)/325);
 const sitting=fallBack*(1-stand);
 return {angle:fall.side*(34*ease(age/110)*(1-ease((age-110)/105))+11*sitting),x:fall.side*4*sitting,y:10*sitting,seated:age>=145&&age<605};
}
