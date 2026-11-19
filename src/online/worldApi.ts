import { online } from './api';
export interface OnlineCharacter { id:string; slot:number; name:string; gender:'male'|'female'; hp:number;skillStepsRemaining?:number;timeStopTurns?:number; inventory:Record<string,number>; gear:{weapon:boolean;armor:boolean;shield?:boolean;weapon_key?:string;armor_key?:string;shield_key?:string};equipment?:{weapon:string[];armor:string[];shield:string[]};catalogUnlocked?:boolean; }
export interface WorldPlayer { character_id:string; name:string; gender:'male'|'female';armor?:string;weapon?:string|null;shield?:string|null; x:number;y:number;dir:'up'|'down'|'left'|'right'; }
export interface GroundItem {id:string;kind:string;category?:'item'|'weapon'|'armor'|'shield';x:number;y:number;}
export interface TrainingHit {id:number;character_id:string;damage:number;dir:WorldPlayer['dir'];weapon_key?:string|null;origin_x?:number;origin_y?:number;action_kind?:string;skill_type?:string|null;hit_target?:boolean;}
export interface WorldState { characters:OnlineCharacter[];active:OnlineCharacter|null;players:WorldPlayer[];messages:{id:number;name:string;message:string;character_id?:string}[];drops?:GroundItem[];trainingHits?:TrainingHit[];superAccount:boolean; }
export async function world(action:string,payload:Record<string,unknown>={}):Promise<WorldState>{
  if(!online)throw Error('オンラインに接続できません。');
  const {data,error}=await online.rpc('online_world',{action,payload});
  if(error)throw Error(error.message);return data as WorldState;
}
