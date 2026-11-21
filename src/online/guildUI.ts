import {GUILD_FLAGS,guildFlagPath} from './guildFlags';
import type {GuildState,GuildRequest} from './worldApi';
export interface GuildDraft{flag?:number;name:string;description:string;joinName:string;confirm:string;}
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text='')=>{const e=document.createElement(tag);e.textContent=text;return e;};
export function renderGuildPanel(body:HTMLElement,guild:GuildState|null|undefined,requests:GuildRequest[],draft:GuildDraft,pending:boolean,act:(action:string,payload?:Record<string,unknown>)=>void,redraw:()=>void){
 body.className='town-guild-body';body.replaceChildren();
 const button=(label:string,action:string,payload:Record<string,unknown>={},confirmKey='')=>{const b=node('button',confirmKey&&draft.confirm===confirmKey?'もう一度押して確定':label);b.type='button';b.disabled=pending;b.onclick=()=>{if(confirmKey&&draft.confirm!==confirmKey){draft.confirm=confirmKey;redraw();return;}draft.confirm='';act(action,payload);};return b;};
 const intro=node('section');intro.className='guild-summary';intro.append(node('h3',guild?guild.name:'ギルドで仲間を集めよう'),node('p','キャラクターごとに1つのギルドに所属できます。定員30人。加入は承認制です。'));
 const flagPicker=(selected:number,onPick:(id:number)=>void)=>{const box=node('div');box.className='guild-flag-picker';box.style.cssText='display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px';for(const flag of GUILD_FLAGS){const b=node('button');b.type='button';b.disabled=pending;b.setAttribute('aria-label',flag.name);b.setAttribute('aria-pressed',String(selected===flag.id));b.style.cssText='padding:8px;border:2px solid '+(selected===flag.id?'#f4cc71':'#536b6b');const img=node('img');img.src=flag.path;img.alt=flag.name;img.width=32;img.height=38;b.append(img);b.onclick=()=>onPick(flag.id);box.append(b);}return box;};
 if(guild){const banner=node('img');banner.src=guildFlagPath(guild.flag??1);banner.alt='ギルド旗';banner.width=32;banner.height=38;intro.prepend(banner);intro.append(node('p',guild.description||'ギルドの仲間と冒険へ。'),node('strong',`${guild.members.length} / ${guild.limit}人 · ${guild.isLeader?'ギルドマスター':'メンバー'}`));body.append(intro);
  if(guild.isLeader){const flags=node('section');flags.append(node('h3','ギルド旗を変更'),node('p','選んだ旗をメンバー全員の名前の左に表示します。'),flagPicker(draft.flag??guild.flag??1,id=>{draft.flag=id;redraw();}),button('この旗に変更','guild_flag',{flag:draft.flag??guild.flag??1}));body.append(flags);}
  const roster=node('section');roster.className='guild-roster';roster.append(node('h3','メンバー'));
  for(const member of guild.members){const row=node('div');row.className='guild-member-row';row.append(node('strong',`${member.leader?'♛ ':''}${member.name}`),node('span',member.online?'● オンライン':'○ オフライン'));
   if(guild.isLeader&&!member.leader){row.append(button('マスターを引き継ぐ','guild_transfer',{character_id:member.id},'transfer:'+member.id),button('除名','guild_kick',{character_id:member.id},'kick:'+member.id));}roster.append(row);
  }body.append(roster);
  if(guild.isLeader)body.append(node('p','未所属の冒険者を右クリックし、ステータス画面から招待できます。'));
  if(!guild.isLeader||guild.members.length===1)body.append(button(guild.isLeader?'ギルドを解散':'ギルドを脱退','guild_leave',{},'leave'));
  else body.append(node('p','脱退する場合は、先に別のメンバーへマスターを引き継いでください。'));
 }else{body.append(intro);const forms=node('div');forms.className='guild-forms';
  const create=node('form');create.noValidate=true;create.append(node('h3','新しいギルドを作成'));
  const name=node('input');name.maxLength=20;name.value=draft.name;name.placeholder='ギルド名（2〜20文字）';name.setAttribute('aria-label','作成するギルド名');name.oninput=()=>draft.name=name.value;
  const description=node('textarea');description.maxLength=160;description.rows=3;description.value=draft.description;description.placeholder='紹介文（160文字まで・省略可）';description.setAttribute('aria-label','ギルドの紹介文');description.oninput=()=>draft.description=description.value;
  const submit=node('button','ギルドを作成');submit.type='submit';submit.disabled=pending;create.append(name,description,node('p','ギルド旗'),flagPicker(draft.flag??1,id=>{draft.flag=id;redraw();}),submit);create.onsubmit=e=>{e.preventDefault();act('guild_create',{name:draft.name.trim(),description:draft.description.trim(),flag:draft.flag??1});};
  const join=node('form');join.noValidate=true;join.append(node('h3','ギルドへ加入申請'));const target=node('input');target.maxLength=20;target.value=draft.joinName;target.placeholder='加入したいギルドの名前';target.setAttribute('aria-label','加入先のギルド名');target.oninput=()=>draft.joinName=target.value;const send=node('button','加入申請');send.type='submit';send.disabled=pending;join.append(target,send,node('p','冒険者のステータスから、その人のギルドへ申請することもできます。'));join.onsubmit=e=>{e.preventDefault();act('guild_request_join',{name:draft.joinName.trim()});};forms.append(create,join);body.append(forms);
 }
 const inbox=node('section');inbox.className='guild-requests';inbox.append(node('h3','招待・加入申請'));
 if(!requests.length)inbox.append(node('p','招待・加入申請はありません。'));
 for(const req of requests){const row=node('div');row.className='guild-request-row';row.append(node('strong',req.kind==='invite'?`${req.guildName} → ${req.name}`:`${req.name} → ${req.guildName}`),node('span',`${req.kind==='invite'?'招待':'加入申請'} · ${req.incoming?'承認待ち':'送信済み'}`));if(req.incoming)row.append(button('承認','guild_accept',{id:req.id}));row.append(button(req.incoming?'拒否':'取消','guild_decline',{id:req.id}));inbox.append(row);}body.append(inbox,node('p','招待・加入申請の有効期限は7日です。'));
}
