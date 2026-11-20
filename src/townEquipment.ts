import type {EquipmentGrade,Element,WeaponType} from './types';
export const NECKLACE_DEFS = [
 {key:'n_amber',name:'琥珀の首飾り',grade:'D',defBonus:1},
 {key:'n_jade',name:'翡翠の首飾り',grade:'C',defBonus:2},
 {key:'n_sapphire',name:'蒼玉の首飾り',grade:'B',defBonus:3},
 {key:'n_amethyst',name:'紫晶の首飾り',grade:'A',defBonus:5},
 {key:'n_ruby',name:'紅翼の首飾り',grade:'S',defBonus:7},
 {key:'n_opal',name:'聖環の首飾り',grade:'SS',defBonus:9},
 {key:'n_celestial',name:'星虹の首飾り',grade:'SSS',defBonus:12}
] as const;
export type Necklace = {key:string;name:string;grade:EquipmentGrade;defBonus:number};
export const NEW_ELEMENTS = ['light','dark'] as const;
const typeNames:Record<WeaponType,string>={dagger:'短剣',longsword:'片手剣',lance:'槍',bow:'弓',handgun:'銃',greatsword:'大剣',katana:'刀',dual_sword:'双剣',twin_daggers:'双短剣'};
/** Match each existing non-exclusive elemental type/grade exactly. */
export function addLightDarkWeapons<T extends {key:string;name:string;element?:Element;grade:EquipmentGrade;weaponType:WeaponType;exclusiveLoot?:boolean}>(defs:T[]):T[]{
 const prototypes=new Map<string,T>();for(const d of defs)if(d.element&&!NEW_ELEMENTS.includes(d.element as any)){const key=d.weaponType+':'+d.grade;if(!prototypes.has(key))prototypes.set(key,d);}
 return [...prototypes.values()].flatMap(d=>NEW_ELEMENTS.map(element=>({...d,key:`w_${element}_${d.weaponType}_${d.grade.toLowerCase()}`,name:`${element==='light'?'黎光':'宵闇'}の${typeNames[d.weaponType]} [${d.grade}]`,element,exclusiveLoot:false,passive:undefined,initialPlus:undefined})));
}
export function addLightDarkShields<T extends {key:string;name:string;element?:Element;grade:EquipmentGrade;exclusiveLoot?:boolean;passive:{key:string;name:string;description:string}}>(defs:T[]):T[]{
 const prototypes=new Map<string,T>();for(const d of defs)if(d.element&&!NEW_ELEMENTS.includes(d.element as any)&&!prototypes.has(d.grade))prototypes.set(d.grade,d);
 return [...prototypes.values()].flatMap(d=>NEW_ELEMENTS.map(element=>({...d,key:`s_${element}_${d.grade.toLowerCase()}`,name:`${element==='light'?'黎光':'宵闇'}の護盾 [${d.grade}]`,element,exclusiveLoot:false,passive:{...d.passive,key:'element_guard',name:element==='light'?'光明障壁':'暗影障壁',description:`${element==='light'?'光':'闇'}属性の攻撃に強い`}})));
}
export const expansionEquipmentKey=(key:string)=>/^(?:w|s)_(?:light|dark)_/.test(key.replace(/^star_/,''));
export const expansionArt=(key:string)=>`assets/online/equipment-v2/${key.replace(/^star_/,'')}.webp`;
