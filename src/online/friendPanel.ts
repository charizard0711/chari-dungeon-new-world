import type {WorldState} from './worldApi';
import './friendPanel.css';

type Friend = NonNullable<WorldState['friends']>[number];
type Tab = 'accepted' | 'incoming' | 'outgoing';
const node = <K extends keyof HTMLElementTagNameMap>(tag:K,text='') => {
  const element=document.createElement(tag);element.textContent=text;return element;
};
const button=(label:string,click:()=>void)=>{
  const b=node('button',label);b.type='button';b.onclick=click;return b;
};

export function createFriendPanel(options:{
  request:(name:string)=>Promise<boolean>;
  change:(action:'friend_accept'|'friend_remove',id:string)=>void;
  avatar:(key:string|undefined)=>HTMLElement;
}){
  const form=node('form'), input=node('input'), send=node('button','フレンド申請');
  form.noValidate=true;input.placeholder='キャラクター名を入力';input.setAttribute('aria-label','申請先のキャラクター名');
  input.maxLength=16;input.required=true;send.type='submit';form.append(input,send);
  form.onsubmit=async event=>{
    event.preventDefault();
    const name=input.value.trim();
    if(!name||send.disabled)return;
    send.disabled=true;
    try{if(await options.request(name)&&input.value.trim()===name)input.value='';}
    finally{send.disabled=false;}
  };
  const summary=node('div'), filters=node('nav'), list=node('div');
  summary.className='zero-friends-summary';filters.className='zero-friends-tabs';
  filters.setAttribute('aria-label','フレンドの種類');
  list.className='zero-friends-list';
  const root=node('div');root.className='zero-friends';root.append(form,summary,filters,list);
  let tab:Tab='accepted', friends:Friend[]=[], avatars:Record<string,string>={}, pending=false;

  function row(f:Friend){
    const r=node('div'), person=node('div'), status=node('span'), actions=node('div');
    r.className='zero-friend-row';
    person.className='zero-friend-person';actions.className='zero-friend-actions';
    person.append(options.avatar(avatars[f.id]),node('strong',f.name));
    status.className='zero-friend-status';
    status.textContent=f.status==='accepted'?(f.online?'● オンライン':'● オフライン'):f.incoming?'承認待ち':'申請送信済み';
    status.dataset.online=String(f.online&&f.status==='accepted');
    const change=(label:string,action:'friend_accept'|'friend_remove')=>{
      const b=button(label,()=>options.change(action,f.id));
      b.disabled=pending;actions.append(b);
    };
    if(f.status==='accepted'){
      const mail=button('✉',()=>window.dispatchEvent(new CustomEvent('zero-compose-mail',{detail:{id:f.id,name:f.name}})));
      mail.setAttribute('aria-label',f.name+'にメール');
      const menu=node('details'), trigger=node('summary','⋯');
      trigger.setAttribute('aria-label',f.name+'の操作');
      const remove=button('フレンドを解除',()=>options.change('friend_remove',f.id));
      remove.disabled=pending;menu.append(trigger,remove);actions.append(mail,menu);
    }else if(f.incoming){
      change('承認','friend_accept');change('拒否','friend_remove');
    }else change('取消','friend_remove');
    r.dataset.status=f.status;r.append(person,status,actions);return r;
  }

  function render(){
    const grouped:Record<Tab,Friend[]>={accepted:[],incoming:[],outgoing:[]};
    for(const f of friends)grouped[f.status==='accepted'?'accepted':f.incoming?'incoming':'outgoing'].push(f);
    const online=grouped.accepted.filter(f=>f.online).length;
    summary.replaceChildren(node('span','フレンド '+grouped.accepted.length+' / 100'),node('span','● オンライン '+online));
    const labels:Record<Tab,string>={accepted:'フレンド',incoming:'受信申請',outgoing:'送信申請'};
    filters.replaceChildren();
    for(const key of ['accepted','incoming','outgoing'] as const){
      const filter=button(labels[key]+' '+grouped[key].length,()=>{
        tab=key;render();filters.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
      });
      filter.setAttribute('aria-pressed',String(tab===key));filters.append(filter);
    }
    const headings=node('div');headings.className='zero-friend-headings';
    headings.append(node('span','キャラクター'),node('span','ステータス'),node('span','操作'));
    list.replaceChildren(headings);
    for(const f of grouped[tab])list.append(row(f));
    if(!grouped[tab].length)list.append(node('p',tab==='accepted'?'フレンドはまだいません。':'申請はありません。'));
    if(tab==='accepted'&&grouped.outgoing.length){
      const waiting=node('h3','承認待ち ('+grouped.outgoing.length+')');list.append(waiting);
      for(const f of grouped.outgoing)list.append(row(f));
    }
  }

  return {root,update(rows:Friend[],icons:Record<string,string>,busy:boolean){
    friends=rows;avatars=icons;pending=busy;render();
  }};
}
