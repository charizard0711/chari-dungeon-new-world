import type {WeaponType} from '../../types';
import {MONSTER_DEFS} from '../../data';
/** Higher acts first; ties favour the player. */
export const WEAPON_ATTACK_SPEED:Record<WeaponType,number>={dagger:120,twin_daggers:115,dual_sword:105,katana:100,longsword:90,lance:80,bow:45,handgun:135,greatsword:40};
export const weaponAttackSpeed=(type?:WeaponType)=>type?WEAPON_ATTACK_SPEED[type]??90:90;
export function attackTiming(type?:WeaponType,hero=false){const heavy=hero||type==='greatsword',rate=90/weaponAttackSpeed(type),windup=(heavy?200:58)*rate,strike=(heavy?260:210)*rate,ranged=type==='bow'||type==='handgun',flight=type==='handgun'?90:180;return {rate,windup,duration:windup+strike,flight,impact:windup+(ranged?flight:(heavy?140:type==='lance'?52:65)*rate)};}
export function enemyAttackSpeed(key:string){const m=MONSTER_DEFS.find(v=>v.key===key);return m?.behavior==='slow'?65:key==='m_bat'||key==='m_dark_ninja'?115:m?.ranged?85:90;}
