import type {WeaponType} from '../../types';
/** Initiative, not clicks per second. Higher acts first; ties favour the player. */
export const WEAPON_ATTACK_SPEED:Record<WeaponType,number>={dagger:120,twin_daggers:115,dual_sword:105,katana:100,longsword:90,lance:80,bow:75,handgun:110,greatsword:60};
export const weaponAttackSpeed=(type?:WeaponType)=>type?WEAPON_ATTACK_SPEED[type]??90:90;
