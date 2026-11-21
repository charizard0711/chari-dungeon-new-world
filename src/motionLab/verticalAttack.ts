import type {Point} from './motion';
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
const ease=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
/** Front/back poses are authored in screen space, never a rotated side pose.
 * Angle is the vector from the gripping hand toward the blade tip. */
export function verticalAttack(type:string,back:boolean,t:number,attack:boolean){
 if(type==='dagger'){
  const ms=t*268,thrust=attack?Math.sin(Math.PI*Math.max(0,Math.min(1,(ms-58)/145))):0;
  return {hand:[back?5:-5,(back?-25:-20)+(back?-5:7)*thrust] as Point,off:[back?-6:6,-21] as Point,angle:back?-Math.PI/2:Math.PI/2,behind:back};
 }
 const heavy=type==='greatsword',duration=heavy?460:268,windup=heavy?200:58,ms=t*duration;
 const idle:Point=back?[7,-22]:[-7,-20],raised:Point=back?[8,-29]:[-7,-29],finish:Point=back?[-5,-25]:[6,-16];
 const idleAngle=back?-1.15:-1.9,raisedAngle=back?-.8:-2.25,finishAngle=back?-2.15:.7;
 let hand:Point=[...idle],angle=idleAngle;
 if(attack){const strike=heavy?140:type==='katana'?130:85,recovery=heavy?170:145;
  if(ms<windup){const q=ease(ms/windup);hand=[mix(idle[0],raised[0],q),mix(idle[1],raised[1],q)];angle=mix(idleAngle,raisedAngle,q);}
  else{const elapsed=ms-windup,q=ease(elapsed/strike),r=ease((elapsed-recovery)/(duration-windup-recovery));hand=[mix(mix(raised[0],finish[0],q),idle[0],r),mix(mix(raised[1],finish[1],q),idle[1],r)];angle=mix(mix(raisedAngle,finishAngle,q),idleAngle,r);}
 }
 // A short blade crosses below the face, with its cutting edge leading the hand.
 if(type==='katana'){hand[1]+=2;angle+=back?-.12:.12;}
 const off:Point=type==='dual_sword'?[-hand[0],hand[1]+1]:[back?-6:6,-21];
 return {hand,off,angle,behind:back};
}
