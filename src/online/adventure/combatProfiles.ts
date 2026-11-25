import type {WeaponType} from '../../types';
import {MONSTER_DEFS} from '../../data';
export const WEAPON_COOLDOWN_MS:Record<WeaponType,number>={dagger:280,twin_daggers:300,dual_sword:360,katana:380,longsword:420,lance:470,bow:650,handgun:260,greatsword:760};
/** A cadence value; initiative is no longer decided by a movement turn. */
export const WEAPON_ATTACK_SPEED=Object.fromEntries(Object.entries(WEAPON_COOLDOWN_MS).map(([key,ms])=>[key,Math.round(100000/ms)]))as Record<WeaponType,number>;
export const weaponAttackSpeed=(type?:WeaponType)=>type?WEAPON_ATTACK_SPEED[type]??90:90;
export function attackTiming(type?:WeaponType,_hero=false){const cooldown=type?WEAPON_COOLDOWN_MS[type]??420:420,duration=type==='greatsword'?380:type==='bow'?340:type==='dagger'||type==='handgun'?220:268,rate=duration/268,windup=58*rate,flight=(type==='handgun'?90:180)*rate,ranged=type==='bow'||type==='handgun';return {cooldown,rate,windup,duration,flight,impact:windup+(ranged?flight:(type==='lance'?52:65)*rate)};}
export function movementStepMs(value?:number){return Math.max(110,Math.min(400,value??152));}
export function enemyAttackSpeed(key:string){const m=MONSTER_DEFS.find(v=>v.key===key);return m?.behavior==='slow'?65:key==='m_bat'||key==='m_dark_ninja'?115:m?.ranged?85:90;}
