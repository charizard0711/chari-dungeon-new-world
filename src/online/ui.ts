import {installFormValidation} from './formValidation';
import {finishLobbyButton} from './lobbyButtons';
import type Phaser from 'phaser';
import { online, onlineConfigured, town, type TownState } from './api';
import './online.css';
import './lobby.css';
import {openOnlineSettings} from './release';
import {Audio} from '../audio/manager';
import { captchaSiteKey, mountCaptcha } from '../ranking/captcha';
import { emailLanguage } from './emailLanguage';
import { installOnlineScenes } from './townScene';
import {installGamePresentation,type TownAudioSettings} from './presentation';
import {mountCharacterPreview} from './characterPreview';
import {HAIR_COLORS} from '../motionLab/wardrobe';
import {mountTownLoading} from './townLoading';
import { world, type WorldState } from './worldApi';

const node = <K extends keyof HTMLElementTagNameMap>(tag:K, text='') => {
  const el=document.createElement(tag); el.textContent=text; return el;
};
export function openOnline(scene:Phaser.Scene,audio?:TownAudioSettings) {
  installGamePresentation(scene.game,audio);
  installOnlineScenes(scene,mountOnlineLobby);scene.scene.start('OnlineLobbyScene');
}
export function mountOnlineLobby(scene:Phaser.Scene,previewState?:WorldState) {
  const root=node('section');root.className='online-screen zero-lobby';let content:HTMLElement=root;let currentCharacters:WorldState|undefined;root.setAttribute('aria-label','オンラインモード');
  document.body.append(root);
  const fit=()=>{const r=scene.game.canvas.getBoundingClientRect();root.style.left=`${r.left}px`;root.style.top=`${r.top}px`;root.style.width=`${r.width}px`;root.style.height=`${r.height}px`;};
  const resize=new ResizeObserver(fit);resize.observe(scene.game.canvas);window.addEventListener('resize',fit);window.addEventListener('scroll',fit);fit();
  const sceneInputEnabled=scene.input.enabled;scene.input.enabled=false;
  root.addEventListener('keydown',event=>event.stopPropagation());
  root.addEventListener('click',event=>{const b=(event.target as Element).closest('button');if(b&&!b.disabled)Audio.playSe('click');});
  const keyboard=scene.input.keyboard, enabled=keyboard?.enabled;if(keyboard)keyboard.enabled=false;
  let disposed=false, joined=false, busy=false, timer:ReturnType<typeof setInterval>|undefined;
  let revision=0, userId='', state:TownState|undefined;
  let captcha:{destroy():void;reset():void}|undefined, captchaToken:string|undefined;
  const clearCaptcha=()=>{captcha?.destroy();captcha=undefined;captchaToken=undefined;};
  const close=()=>{if(disposed)return;disposed=true;revision++;clearInterval(timer);clearCaptcha();if(joined)void town('leave').catch(()=>{});resize.disconnect();window.removeEventListener('resize',fit);window.removeEventListener('scroll',fit);root.remove();scene.input.enabled=sceneInputEnabled;if(keyboard)keyboard.enabled=enabled??true;scene.events.off('shutdown',close);};
  scene.events.once('shutdown',close);
  const button=(label:string,fn:()=>void)=>{const b=node('button',label);b.type='button';b.onclick=fn;finishLobbyButton(b,label);return b;};
  const shell=(title:string,mode='auth')=>{clearCaptcha();root.replaceChildren();root.dataset.view=mode;
    const header=node('header');header.className='lobby-header';const logo=node('img');logo.src='assets/new-world/logo-silver-v2.png';logo.alt='Chari Dungeon: ZERO';const home=button('ホーム',()=>{close();scene.scene.start('TitleScene');});home.className='lobby-home';home.prepend(logo);
    const nav=node('nav');nav.setAttribute('aria-label','メインメニュー');for(const [label,icon,fn]of [['ホーム','⌂',()=>{close();scene.scene.start('TitleScene');}],['キャラクター','♟',()=>currentCharacters?characters(currentCharacters):auth()],['ショップ','♜',()=>{}],['設定','⚙',()=>openOnlineSettings(scene,Audio)]]as const){const item=button(label,fn);const glyph=document.createElementNS('http://www.w3.org/2000/svg','svg');glyph.setAttribute('viewBox','0 0 24 24');glyph.setAttribute('aria-hidden','true');const path=document.createElementNS(glyph.namespaceURI,'path');path.setAttribute('d',label==='ホーム'?'M3 11 12 3 21 11M5 9v12h5v-7h4v7h5V9':label==='キャラクター'?'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 21v-2a9 6 0 0 1 18 0v2Z':label==='ショップ'?'M2 3h3l3 12h11l3-9H6M10 20h.01M18 20h.01':'M10 3h4l1 3 3 1 3 3v4l-3 1-1 3-3 3h-4l-1-3-3-1-3-3v-4l3-1 1-3ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z');glyph.append(path);item.prepend(glyph);if(label==='キャラクター')item.setAttribute('aria-current','page');if(label==='ショップ'){item.disabled=true;item.title='町の商人から利用できます';}nav.append(item);}header.append(home,nav);root.append(header);
    content=node('main');content.className='lobby-content';const heading=node('div');heading.className='lobby-heading';heading.append(node('h2',title),node('div','◆ ◇ ◆'));content.append(heading);root.append(content);
  };
  const notice=node('p');notice.className='lobby-notice';notice.setAttribute('role','status');
  const error=(e:unknown)=>{notice.classList.add('is-error');notice.setAttribute('role','alert');notice.textContent=e instanceof Error?e.message:'接続できませんでした。';};
  const enter=async(characterId:string)=>{
    if((import.meta as any).env.DEV&&previewState){notice.textContent='デザイン確認用です。本番ではこのキャラクターで町に入場します。';return;}
    const entryLoading=mountTownLoading(scene);
    try{const state=await world('join',{character_id:characterId});if(disposed){entryLoading.destroy();void world('leave');return;}
    close();scene.scene.start('OnlineTownScene',{state,entryLoading});}catch(error){entryLoading.destroy();throw error;}
  };
  const characters=(state:WorldState)=>{
    currentCharacters=state;shell('キャラクター選択','characters');notice.textContent='';content.append(node('p','サーバー1 · はじまりの町　／　キャラクターは2体まで'),notice);
    let selected=state.characters[0]?.id;const slots=node('div');slots.className='online-character-grid';const cards:HTMLElement[]=[];
    const confirm=button('決定　 ›',()=>{if(selected)void run(()=>enter(selected!));else createCharacter(state);});confirm.classList.add('lobby-confirm');
    const select=(id:string)=>{selected=id;cards.forEach(c=>{const on=c.dataset.character===id;c.classList.toggle('selected',on);c.querySelector('button[data-select]')?.setAttribute('aria-pressed',String(on));});finishLobbyButton(confirm,'決定','confirm');};
    for(let slot=1;slot<=2;slot++){
      const character=state.characters.find(c=>c.slot===slot),card=node('section');card.className='online-character-card';card.append(node('h3',`キャラクター ${slot}`));cards.push(card);
      const stage=node('div');stage.className='lobby-character-stage';
      if(character){card.dataset.character=character.id;const pick=button('',()=>select(character.id));pick.className='lobby-portrait-button';pick.dataset.select='true';pick.setAttribute('aria-label',character.name+'を選択');pick.append(mountCharacterPreview(scene,character));stage.append(pick);card.append(stage,node('strong',character.name),node('p',character.gender==='male'?'男 · レベル1':'女 · レベル1'));const enterButton=button('町へ入場　 ›',()=>{select(character.id);void run(()=>enter(character.id));});card.append(enterButton);card.addEventListener('click',()=>select(character.id));const check=node('span','✓');check.className='lobby-selected-mark';check.setAttribute('aria-hidden','true');card.append(check);}
      else{stage.append(node('span','＋'));stage.classList.add('empty');card.classList.add('empty-card');card.append(stage,node('p','空きスロット'),button('＋ キャラクター作成',()=>createCharacter(state)));}
      slots.append(card);
    }
    content.append(slots);const logout=button('↪ ログアウト',()=>void run(async()=>{await online?.auth.signOut();currentCharacters=undefined;auth();}));logout.classList.add('lobby-logout');content.append(logout,confirm);if(selected)select(selected);else finishLobbyButton(confirm,'キャラクター作成','confirm');
  };
  const createCharacter=(state:WorldState)=>{
    shell('キャラクター作成','create');content.append(node('p','男女と冒険者名を決めて、町へ出発しましょう。'));
    const form=node('form');form.setAttribute('aria-label','キャラクター作成');let gender:'male'|'female'='male';
    const choices=node('div');choices.className='online-character-grid';
    const genders:HTMLButtonElement[]=[];
    for(const value of ['male','female'] as const){const choice=button(value==='male'?'男':'女',()=>{gender=value;genders.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gender===value)));});choice.className='online-gender-choice';choice.dataset.gender=value;choice.setAttribute('aria-pressed',String(value===gender));const sprite=mountCharacterPreview(scene,{id:'preview-'+value,slot:1,name:value==='male'?'男':'女',gender:value,hp:100,inventory:{},gear:{weapon:true,weapon_key:'w_iron_dagger',armor:true,armor_key:'leather'}});choice.prepend(sprite);genders.push(choice);choices.append(choice);}
    const name=node('input');name.required=true;name.minLength=2;name.maxLength=12;name.setAttribute('autocomplete','nickname');const label=node('label','冒険者名（2〜12文字）');label.append(name);
    const hair=node('select');hair.setAttribute('aria-label','作成するキャラクターの髪色');for(const color of HAIR_COLORS){const option=node('option',color.name);option.value=color.key;hair.append(option);}const hairLabel=node('label','髪色（作成時は無料／後からの変更は床屋で1,000G）');hairLabel.append(hair);const submit=node('button','作成して町へ');submit.type='submit';finishLobbyButton(submit,'作成して町へ','cyan');form.append(choices,label,hairLabel,submit);
    const validate=installFormValidation(form);
    form.onsubmit=e=>{e.preventDefault();void run(async()=>{if(!validate())return;if((import.meta as any).env.DEV&&previewState){notice.textContent='デザイン確認用のためキャラクターは保存しません。';return;}const updated=await world('create_character',{name:name.value.trim(),gender,hair_color:hair.value});const created=updated.characters.find(c=>!state.characters.some(old=>old.id===c.id));if(!created)throw Error('キャラクター一覧を更新してください。');await enter(created.id);});};
    content.append(form,notice,button('キャラクター選択へ戻る',()=>characters(state)));
  };
  const servers=()=>{
    shell('キャラクターを読み込み中…');content.append(notice);
    void world('list').then(state=>{if(!disposed)characters(state);}).catch(error);
  };
  const run=async(fn:()=>Promise<void>)=>{if(busy||disposed)return;busy=true;notice.classList.remove('is-error');notice.setAttribute('role','status');notice.textContent='';try{await fn();}catch(e){error(e);}finally{busy=false;}};
  const auth=(mode:'login'|'signup'|'resend'='login',savedEmail='',feedback='')=>{
    const signup=mode==='signup',resend=mode==='resend';
    const title=resend?'確認メールの再送':signup?'アカウント作成':'オンラインにログイン';
    shell(title,mode);notice.textContent=feedback;
    if(!onlineConfigured){content.append(node('p','オンラインは準備中です。接続先の設定後に利用できます。'));return;}
    content.append(node('p',resend?'登録したメールアドレスに確認メールを送ります。':signup?'オンライン専用のアカウントを作成します。':'作成済みのアカウントでログインしてください。'));
    const form=node('form'),email=node('input'),password=node('input'),name=node('input'),confirmation=node('input');
    form.setAttribute('aria-label',title);
    email.type='email';email.autocomplete='email';email.required=true;email.value=savedEmail;
    password.type='password';password.autocomplete=signup?'new-password':'current-password';password.required=true;
    if(signup)password.minLength=8;
    name.maxLength=20;name.required=true;name.setAttribute('autocomplete','nickname');
    confirmation.type='password';confirmation.autocomplete='new-password';confirmation.required=true;
    const field=(label:string,input:HTMLInputElement)=>{const l=node('label',label);l.append(input);form.append(l);};
    field('メールアドレス',email);
    if(!resend)field(signup?'パスワード（8文字以上）':'パスワード',password);
    if(signup)field('パスワード（確認用）',confirmation);
    const submit=node('button',resend?'確認メールを送信':signup?'アカウントを作成':'ログイン');submit.type='submit';submit.classList.add('lobby-primary');finishLobbyButton(submit,submit.textContent??'ログイン','cyan');form.append(submit);
    const requireCaptcha=()=>{if(captchaSiteKey&&!captchaToken)throw new Error('本人確認が完了するまでお待ちください。');};
    const validate=installFormValidation(form);
    form.onsubmit=e=>{e.preventDefault();void run(async()=>{
      confirmation.setCustomValidity('');
      if(!validate())return;
      if(signup&&password.value!==confirmation.value){confirmation.setCustomValidity('パスワードが一致しません。');validate();return;}
      requireCaptcha();
      if(resend){
        const {error:e}=await online!.auth.resend({type:'signup',email:email.value.trim(),options:{captchaToken,emailRedirectTo:'https://charidungeon.com/'}});
        captcha?.reset();if(e)throw e;notice.textContent='確認メールを再送しました。メール内のリンクを開いてください。';return;
      }
      if(signup){
        const {data,error:e}=await online!.auth.signUp({email:email.value.trim(),password:password.value,options:{data:{language:emailLanguage()},emailRedirectTo:'https://charidungeon.com/',captchaToken}});
        captcha?.reset();if(e)throw e;
        password.value='';confirmation.value='';
        if(data.session){userId=data.session.user.id;servers();}
        else auth('login',email.value.trim(),'確認メールを送信しました。メール内で認証後、ログインしてください。');
        return;
      }
      const {data,error:e}=await online!.auth.signInWithPassword({email:email.value.trim(),password:password.value,options:{captchaToken}});
      captcha?.reset();
      if(e)throw new Error(e.message==='Email not confirmed'?'メールアドレスが未確認です。確認メールのリンクを開くか、再送してください。':e.message);
      userId=data.user.id;password.value='';servers();
    });};
    content.append(form,notice);
    if(captchaSiteKey){
      const challenge=node('div');form.prepend(challenge);
      void mountCaptcha(challenge,token=>{captchaToken=token;}).then(handle=>{
        if(disposed||!challenge.isConnected)handle.destroy();else captcha=handle;
      }).catch(error);
    }
    const links=node('div');links.className='lobby-auth-links';
    if(!resend){
      links.append(node('p',signup?'すでにアカウントをお持ちの方':'アカウントをまだお持ちでない方'));
      links.append(button(signup?'ログイン画面へ':'新規アカウント作成へ',()=>auth(signup?'login':'signup',email.value)));
    }
    if(mode==='login')links.append(button('確認メールが届かない方',()=>auth('resend',email.value)));
    if(resend)links.append(button('ログイン画面へ戻る',()=>auth('login',email.value)));
    if(mode==='login')for(const provider of ['Google','Microsoft']){const b=button(`${provider}でログイン（準備中）`,()=>{});b.disabled=true;links.append(b);}
    content.append(links);
    content.append(node('p','Chari Dungeon: ZERO のアカウントです。'));
  };
  const preview=(import.meta as any).env.DEV&&location.hostname==='localhost'?previewState:undefined;
  if(preview)characters(preview);else auth();
  if(!preview)void online?.auth.getSession().then(({data})=>{if(!disposed&&data.session&&!data.session.user.is_anonymous){userId=data.session.user.id;servers();}}).catch(error);
  return close;
}
