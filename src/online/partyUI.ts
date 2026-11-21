import type {WorldState} from './worldApi';
export function renderPartyPanel(body:HTMLElement,state:WorldState,pending:boolean,act:(action:string,payload?:Record<string,unknown>)=>void){
 const node=(tag:string,text='')=>{const e=document.createElement(tag);e.textContent=text;return e;};
 const button=(label:string,action:string,payload={})=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=pending;b.onclick=()=>act(action,payload);return b;};
 body.className='town-guild-body';body.replaceChildren();const party=state.party;
 body.append(node('h3','パーティ · 4人まで'),node('p','パーティチャットで仲間と話せます。相手のステータス画面から招待できます。'));
 if(!party)body.append(button('パーティを作成','party_create'));
 else{for(const m of party.members){const row=node('div');row.className='guild-member-row';row.append(node('strong',(m.leader?'★ ':'')+m.name),node('span',m.online?'オンライン':'オフライン'));if(party.isLeader&&!m.leader)row.append(button('除名','party_kick',{character_id:m.id}));body.append(row);}body.append(button('パーティを脱退','party_leave'),node('p','リーダーが脱退すると次のメンバーへ引き継ぎます。'));
 const candidates=state.players.filter(p=>!party.members.some(m=>m.id===p.character_id));if(party.isLeader)for(const p of candidates)body.append(button(p.name+'を招待','party_invite',{character_id:p.character_id}));}
 body.append(node('h3','招待'));
 for(const invitation of state.partyInvites??[]){const row=node('div');row.className='guild-request-row';row.append(node('span',invitation.incoming?`${invitation.leaderName}から招待`:`${invitation.name}へ招待済み`));if(invitation.incoming)row.append(button('参加','party_accept',{id:invitation.id}));row.append(button(invitation.incoming?'断る':'取消','party_decline',{id:invitation.id}));body.append(row);}
}
