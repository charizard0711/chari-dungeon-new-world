import {boundedRequest,recordRequest}from './requestTiming';
import type {AdventureState} from './adventure/types';
import { online } from './api';
export interface OnlineCharacter {invisibleUntil?:number;moveStepMs?:number;attackCooldownMs?:number;hair_color?:string;}
export interface WorldPlayer {gloves?:string|null;boots?:string|null;invisibleUntil?:number;moveStepMs?:number;railTrip?:import('./adventure/railRoute').RailTrip;hair_color?:string;guild_flag?:number|null;guild_name?:string|null;}
export type EquipmentSlot='weapon'|'armor'|'shield'|'necklace'|'boots'|'gloves';
export interface EquipmentInstance {id:string;key:string;dur:number;max:number;}
export interface QuickSlot {category:EquipmentSlot|'item'|'emote';key:string;instanceId?:string;}
export interface OnlineCharacter { id:string; slot:number; name:string; gender:'male'|'female'; hp:number;skillStepsRemaining?:number;timeStopTurns?:number; inventory:Record<string,number>; gear:{weapon:boolean;armor:boolean;shield?:boolean;weapon_key?:string;armor_key?:string;shield_key?:string;necklace?:boolean;necklace_key?:string;weapon_instance_id?:string;armor_instance_id?:string;shield_instance_id?:string;gloves?:boolean;gloves_key?:string;gloves_instance_id?:string;boots?:boolean;boots_key?:string;boots_instance_id?:string;necklace_instance_id?:string};equipment?:{weapon:string[];armor:string[];shield:string[];necklace?:string[];gloves?:string[];boots?:string[]};catalogUnlocked?:boolean; }
export interface OnlineCharacter {location?:'town'|'warehouse'|'dungeon'|'house';warehouse?:{equipment:Partial<Record<EquipmentSlot,string[]>>;instances:Partial<Record<EquipmentSlot,EquipmentInstance[]>>;inventory:Record<string,number>;gold:number};gold?:number;instances?:Partial<Record<EquipmentSlot,EquipmentInstance[]>>;quickSlots?:(QuickSlot|null)[];}
export interface WorldPlayer { character_id:string; name:string; gender:'male'|'female';armor?:string;weapon?:string|null;shield?:string|null; x:number;y:number;dir:'up'|'down'|'left'|'right'; }
export interface GroundItem {amount?:number;id:string;kind:string;category?:'item'|'weapon'|'armor'|'shield'|'necklace'|'boots'|'gloves';x:number;y:number;}
export interface TrainingHit {hit_tiles?:{x:number;y:number}[];id:number;character_id:string;damage:number;dir:WorldPlayer['dir'];weapon_key?:string|null;origin_x?:number;origin_y?:number;action_kind?:string;skill_type?:string|null;hit_target?:boolean;}
export interface GuildRequest{id:string;guildId:string;guildName:string;characterId:string;name:string;kind:'invite'|'join';incoming:boolean;}
export interface GuildState{flag?:number;id:string;name:string;description:string;leaderId:string;isLeader:boolean;limit:number;members:{id:string;name:string;gender:string;leader:boolean;online:boolean}[];}
export interface PlayerInspection{characterId?:string;sameAccount?:boolean;friend?:{id:string;status:'pending'|'accepted';incoming:boolean}|null;guild?:{id:string;name:string}|null;guildRequest?:{id:string;kind:'invite'|'join';incoming:boolean}|null;name:string;gender:string;hp:number;equipment:{slot:EquipmentSlot;key:string;dur?:number;max?:number}[];}
export interface WorldState {houses?:{id:string;ownerId:string|null;ownerName:string|null;mine:boolean;resalePrice?:number}[];house?:{id:string;name:string;width:number;height:number;tier:number;ownerId:string;ownerName:string;mine:boolean;allowFriends:boolean;allowGuild:boolean;x:number;y:number}|null;guild?:GuildState|null;guildRequests?:GuildRequest[];serverTime?:number;clockReceivedAt?:number;clockLatencyMs?:number;inspection?:PlayerInspection;adventure?:AdventureState|null;rooms?:{id:string;name:string;locked:boolean;members:number;status:string}[];roomHistory?:{name:string;status:string;created:string}[];npcs?:{id:string;dir:'up'|'down'|'left'|'right';until:number}[];friends?:{id:string;name:string;status:"pending"|"accepted";incoming:boolean;online:boolean}[];reward?:string;shopCatalog?:{key:string;price:number}[]; characters:OnlineCharacter[];active:OnlineCharacter|null;players:WorldPlayer[];messages:{id:number;name:string;message:string;character_id?:string}[];drops?:GroundItem[];trainingHits?:TrainingHit[];superAccount:boolean; }
export async function world(action:string,payload:Record<string,unknown>={}):Promise<WorldState>{
  if(!online)throw Error('オンラインに接続できません。');
  const started=performance.now();
  try{const client=online;const {data,error}=await boundedRequest(signal=>client.rpc('online_world',{action,payload:action==='poll'?{...payload,allow_deferred:true}:payload}).abortSignal(signal));
  if(error)throw Error(error.message);if(data?.pollDeferred){const deferred=new Error('');deferred.name='DeferredPoll';throw deferred;}const received=performance.now();recordRequest(action,received-started,'ok');return {...data,clockReceivedAt:received,clockLatencyMs:Math.min(250,(received-started)/2)} as WorldState;
  }catch(error){recordRequest(action,performance.now()-started,(error as Error).message.includes('状態を再確認')?'timeout':'error');throw error;}
}

export interface PartyState{id:string;leaderId:string;isLeader:boolean;limit:number;members:{id:string;name:string;leader:boolean;online:boolean}[];}
export interface WorldState{townHeal?:number;walkBatch?:{accepted:number;stopped:boolean};}
export interface PartyInvite{id:string;name:string;leaderName:string;incoming:boolean;}
export interface ChannelMessage{id:number;channel:'guild'|'party';group_id:string;name:string;message:string;character_id:string;}
export interface WorldState{party?:PartyState|null;partyInvites?:PartyInvite[];channelMessages?:ChannelMessage[];}

export interface MapPin{characterId:string;name:string;scope:"party"|"room";floor:number;x:number;y:number;}
export interface WorldState{mapPins?:MapPin[];}
