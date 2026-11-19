import type Phaser from 'phaser';
import { online, onlineConfigured, town, type TownState } from './api';
import './online.css';
import { captchaSiteKey, mountCaptcha } from '../ranking/captcha';
import { emailLanguage } from './emailLanguage';
import { installOnlineScenes } from './townScene';
import {installGamePresentation,type TownAudioSettings} from './presentation';
import {mountCharacterPreview} from './characterPreview';
import {mountTownLoading} from './townLoading';
import { world, type WorldState } from './worldApi';

const node = <K extends keyof HTMLElementTagNameMap>(tag:K, text='') => {
  const el=document.createElement(tag); el.textContent=text; return el;
};
export function openOnline(scene:Phaser.Scene,audio?:TownAudioSettings) {
  installGamePresentation(scene.game,audio);
  installOnlineScenes(scene,mountOnlineLobby);scene.scene.start('OnlineLobbyScene');
}
export function mountOnlineLobby(scene:Phaser.Scene) {
  const root=node('section');root.className='online-screen';root.setAttribute('aria-label','オンラインモード');
  document.body.append(root);
  const fit=()=>{const r=scene.game.canvas.getBoundingClientRect();root.style.left=`${r.left}px`;root.style.top=`${r.top}px`;root.style.width=`${r.width}px`;root.style.height=`${r.height}px`;};
  const resize=new ResizeObserver(fit);resize.observe(scene.game.canvas);window.addEventListener('resize',fit);window.addEventListener('scroll',fit);fit();
  const sceneInputEnabled=scene.input.enabled;scene.input.enabled=false;
  root.addEventListener('keydown',event=>event.stopPropagation());
  const keyboard=scene.input.keyboard, enabled=keyboard?.enabled;if(keyboard)keyboard.enabled=false;
  let disposed=false, joined=false, busy=false, timer:ReturnType<typeof setInterval>|undefined;
  let revision=0, userId='', state:TownState|undefined;
  let captcha:{destroy():void;reset():void}|undefined, captchaToken:string|undefined;
  const clearCaptcha=()=>{captcha?.destroy();captcha=undefined;captchaToken=undefined;};
  const close=()=>{if(disposed)return;disposed=true;revision++;clearInterval(timer);clearCaptcha();if(joined)void town('leave').catch(()=>{});resize.disconnect();window.removeEventListener('resize',fit);window.removeEventListener('scroll',fit);root.remove();scene.input.enabled=sceneInputEnabled;if(keyboard)keyboard.enabled=enabled??true;scene.events.off('shutdown',close);};
  scene.events.once('shutdown',close);
  const button=(label:string,fn:()=>void)=>{const b=node('button',label);b.type='button';b.onclick=fn;return b;};
  const shell=(title:string)=>{clearCaptcha();root.replaceChildren();const header=node('header');const logo=node('img');logo.src='assets/new-world/logo-v1.png';logo.alt='Chari Dungeon: NEW WORLD';header.append(logo);header.append(node('h2',title),button('タイトルへ',()=>{close();scene.scene.start('TitleScene');}));root.append(header);};
  const notice=node('p');notice.setAttribute('role','status');
  const error=(e:unknown)=>{notice.textContent=e instanceof Error?e.message:'接続できませんでした。';};
  const enter=async(characterId:string)=>{
    const entryLoading=mountTownLoading(scene);
    try{const state=await world('join',{character_id:characterId});if(disposed){entryLoading.destroy();void world('leave');return;}
    close();scene.scene.start('OnlineTownScene',{state,entryLoading});}catch(error){entryLoading.destroy();throw error;}
  };
  const characters=(state:WorldState)=>{
    shell('キャラクターを選ぶ');root.append(node('p','サーバー1 · はじまりの町 ／ キャラクターは2体まで'),notice);
    const slots=node('div');slots.className='online-character-grid';
    for(let slot=1;slot<=2;slot++){
      const character=state.characters.find(c=>c.slot===slot),card=node('section');card.className='online-character-card';card.append(node('h3',`キャラクター ${slot}`));
      if(character){const sprite=mountCharacterPreview(scene,character);card.append(sprite,node('strong',character.name),node('p',character.gender==='male'?'男 · レベル1':'女 · レベル1'),button('町へ入場',()=>void run(()=>enter(character.id))));}
      else card.append(node('p','空きスロット'),button('キャラクター作成',()=>createCharacter(state)));
      slots.append(card);
    }
    root.append(slots,button('ログアウト',()=>void run(async()=>{await online?.auth.signOut();auth();})));
  };
  const createCharacter=(state:WorldState)=>{
    shell('キャラクター作成');root.append(node('p','男女と冒険者名を決めて、町へ出発しましょう。'));
    const form=node('form');form.setAttribute('aria-label','キャラクター作成');let gender:'male'|'female'='male';
    const choices=node('div');choices.className='online-character-grid';
    const genders:HTMLButtonElement[]=[];
    for(const value of ['male','female'] as const){const choice=button(value==='male'?'男':'女',()=>{gender=value;genders.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gender===value)));});choice.className='online-gender-choice';choice.dataset.gender=value;choice.setAttribute('aria-pressed',String(value===gender));const sprite=node('div');sprite.className='online-character-sprite';sprite.style.backgroundImage=`url(assets/characters/player-painted-v1/${value}-leather.png)`;choice.prepend(sprite);genders.push(choice);choices.append(choice);}
    const name=node('input');name.required=true;name.minLength=2;name.maxLength=12;name.setAttribute('autocomplete','nickname');const label=node('label','冒険者名（2〜12文字）');label.append(name);
    const submit=node('button','作成して町へ');submit.type='submit';form.append(choices,label,submit);
    form.onsubmit=e=>{e.preventDefault();void run(async()=>{if(!form.reportValidity())return;const updated=await world('create_character',{name:name.value.trim(),gender});const created=updated.characters.find(c=>!state.characters.some(old=>old.id===c.id));if(!created)throw Error('キャラクター一覧を更新してください。');await enter(created.id);});};
    root.append(form,notice,button('キャラクター選択へ戻る',()=>characters(state)));
  };
  const servers=()=>{
    shell('キャラクターを読み込み中…');root.append(notice);
    void world('list').then(state=>{if(!disposed)characters(state);}).catch(error);
  };
  const run=async(fn:()=>Promise<void>)=>{if(busy||disposed)return;busy=true;notice.textContent='';try{await fn();}catch(e){error(e);}finally{busy=false;}};
  const auth=(mode:'login'|'signup'|'resend'='login',savedEmail='',feedback='')=>{
    const signup=mode==='signup',resend=mode==='resend';
    const title=resend?'確認メールの再送':signup?'アカウント作成':'オンラインにログイン';
    shell(title);notice.textContent=feedback;
    if(!onlineConfigured){root.append(node('p','オンラインは準備中です。接続先の設定後に利用できます。'));return;}
    root.append(node('p',resend?'登録したメールアドレスに確認メールを送ります。':signup?'オンライン専用のアカウントを作成します。':'作成済みのアカウントでログインしてください。'));
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
    const submit=node('button',resend?'確認メールを送信':signup?'アカウントを作成':'ログイン');submit.type='submit';form.append(submit);
    const requireCaptcha=()=>{if(captchaSiteKey&&!captchaToken)throw new Error('本人確認が完了するまでお待ちください。');};
    form.onsubmit=e=>{e.preventDefault();void run(async()=>{
      if(!form.reportValidity())return;
      if(signup&&password.value!==confirmation.value)throw new Error('確認用パスワードが一致しません。');
      requireCaptcha();
      if(resend){
        const {error:e}=await online!.auth.resend({type:'signup',email:email.value.trim(),options:{captchaToken,emailRedirectTo:'https://charizard0711.github.io/chari-dungeon-new-world/'}});
        captcha?.reset();if(e)throw e;notice.textContent='確認メールを再送しました。メール内のリンクを開いてください。';return;
      }
      if(signup){
        const {data,error:e}=await online!.auth.signUp({email:email.value.trim(),password:password.value,options:{data:{language:emailLanguage()},emailRedirectTo:'https://charizard0711.github.io/chari-dungeon-new-world/',captchaToken}});
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
    root.append(form,notice);
    if(captchaSiteKey){
      const challenge=node('div');form.prepend(challenge);
      void mountCaptcha(challenge,token=>{captchaToken=token;}).then(handle=>{
        if(disposed||!challenge.isConnected)handle.destroy();else captcha=handle;
      }).catch(error);
    }
    if(!resend){
      root.append(node('p',signup?'すでにアカウントをお持ちの方':'アカウントをまだお持ちでない方'));
      root.append(button(signup?'ログイン画面へ':'新規アカウント作成へ',()=>auth(signup?'login':'signup',email.value)));
    }
    if(mode==='login')root.append(button('確認メールが届かない方',()=>auth('resend',email.value)));
    if(resend)root.append(button('ログイン画面へ戻る',()=>auth('login',email.value)));
    if(mode==='login')for(const provider of ['Google','Microsoft']){const b=button(`${provider}でログイン（準備中）`,()=>{});b.disabled=true;root.append(b);}
    root.append(node('p','Chari Dungeon: NEW WORLD のアカウントです。'));
  };
  auth();
  void online?.auth.getSession().then(({data})=>{if(!disposed&&data.session&&!data.session.user.is_anonymous){userId=data.session.user.id;servers();}}).catch(error);
  return close;
}
