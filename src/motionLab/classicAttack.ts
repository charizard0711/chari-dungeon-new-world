import {armedProfile as artProfile} from './armedStudy';
/** OnlineTownScene's existing timing: 58 ms preparation, 210 ms attack.
 * Arcadia retains its original 200 + 260 ms heavy attack. */
export function classicProfile(type:string){
 const base=artProfile(type),heavy=type==='greatsword',windup=heavy?200:58,duration=heavy?460:268;
 return {...base,duration,impact:[(windup+(base.projectile?180:45))/duration],
  phase:[0,.1,.2,.3,.4,.55,.7,.9],description:'現行ゲームと同じ短い予備動作・攻撃速度。近接は踏み込み、弓と銃はその場で射撃。'};
}
export function classicLunge(type:string,t:number){
 if(type==='bow'||type==='handgun')return 0;
 const heavy=type==='greatsword',elapsed=t*(heavy?460:268)-(heavy?200:58),half=heavy?130:52.2;
 if(elapsed<0||elapsed>half*2)return 0;
 return 15*(1-Math.pow(1-Math.min(elapsed,half*2-elapsed)/half,2));
}
