import type {GuildState,PlayerInspection} from './worldApi';
export interface InspectionAction{label:string;action?:string;payload?:Record<string,unknown>;disabled?:boolean;}
/** Labels are hints; the server independently enforces membership, ownership and request direction. */
export function inspectionActions(info:PlayerInspection,own:GuildState|null|undefined):InspectionAction[]{
 const target=info.characterId;
 if(!target)return [];
 const context={inspect_character_id:target};
 const friend:InspectionAction=info.sameAccount?{label:'自分のアカウント',disabled:true}:
  info.friend?.status==='accepted'?{label:'フレンド登録済み',disabled:true}:
  info.friend?.status==='pending'?(info.friend.incoming?{label:'フレンド申請を承認',action:'friend_accept',payload:{id:info.friend.id,...context}}:{label:'フレンド申請済み',disabled:true}):
  {label:'フレンド申請',action:'friend_request_character',payload:{character_id:target,...context}};
 let guild:InspectionAction;
 if(own&&info.guild?.id===own.id)guild={label:'同じギルドのメンバー',disabled:true};
 else if(info.guildRequest?.incoming&&(info.guildRequest.kind==='invite'||own?.isLeader))guild={label:info.guildRequest.kind==='invite'?'ギルド招待を承認':'加入申請を承認',action:'guild_accept',payload:{id:info.guildRequest.id,...context}};
 else if(info.guildRequest)guild={label:info.guildRequest.kind==='invite'?'ギルド招待済み':'ギルド加入申請済み',disabled:true};
 else if(!own&&info.guild)guild={label:'ギルド加入申請',action:'guild_request_join',payload:{guild_id:info.guild.id,...context}};
 else if(own?.isLeader&&!info.guild)guild={label:'ギルドへ招待',action:'guild_invite',payload:{character_id:target,...context}};
 else guild={label:own?(info.guild?'相手は別のギルドに所属中':'招待はマスターが行えます'):'先にギルドを作成してください',disabled:true};
 return [friend,guild];
}
