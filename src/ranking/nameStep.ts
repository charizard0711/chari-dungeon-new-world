import type Phaser from 'phaser';
import { GAME_W, GAME_H } from '../layout';
import { translate } from '../i18n';
import { checkName, hasIdentity, rankingConfigured, reserveName, savedName, saveName } from './api';
import { normalizeName } from './model';
import { captchaSiteKey, mountCaptcha } from './captcha';
import './ranking.css';

/** An input within the title's existing menu panel, anchored to its canvas coordinates. */
export function mountNameStep(scene: Phaser.Scene, done: (name:string)=>void, error = '', cancel:()=>void=()=>{}) {
  const mobile = GAME_W < 700, width = mobile ? GAME_W-60 : 520, y = mobile ? 319 : 308;
  const form=document.createElement('form');form.className='title-name-step';form.setAttribute('aria-label',translate('冒険者の名前'));
  const label=document.createElement('label');label.htmlFor='adventurer-name';
  const input=document.createElement('input');input.id='adventurer-name';input.name='playerName';input.setAttribute('autocomplete','nickname');input.maxLength=24;input.required=true;input.spellcheck=false;input.value=savedName();
  input.setAttribute('aria-describedby','adventurer-name-hint adventurer-name-notice adventurer-name-status');
  const hint=document.createElement('p');hint.id='adventurer-name-hint';hint.className='name-hint';
  const notice=document.createElement('p');notice.id='adventurer-name-notice';notice.className='name-notice';
  const status=document.createElement('p');status.id='adventurer-name-status';status.className='name-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const challenge=document.createElement('div');challenge.className='name-challenge';
  const submit=document.createElement('button');submit.type='submit';submit.className='title-name-continue';
  form.append(label,input,hint,notice,status,challenge,submit);document.body.append(form);
  let active=true,revision=0,timer:ReturnType<typeof setTimeout>|undefined,statusSource=error,captchaToken:string|undefined;
  let captcha:{destroy():void;reset():void}|undefined;
  const message=(source:string,bad=false)=>{statusSource=source;status.textContent=translate(source);status.dataset.error=String(bad);};
  const localize=()=>{
    form.setAttribute('aria-label',translate('冒険者の名前'));label.textContent=translate('名前（必須・2〜12文字）');
    hint.textContent=translate('文字・数字・「ー」「_」「・」が使えます。');
    notice.textContent=translate(rankingConfigured?'終了時に名前と成績を自動送信します。名前の変更は1日1回。ブラウザの保存データは消さずに残してください。':'名前をこのブラウザに保存します。ランキングは準備中です。');
    status.textContent=translate(statusSource);submit.textContent=translate('この名前で進む');
  };
  const fit=()=>{const rect=scene.game.canvas.getBoundingClientRect();form.style.width=`${width}px`;form.style.left=`${rect.left+(GAME_W-width)/2*rect.width/GAME_W}px`;form.style.top=`${rect.top+y*rect.height/GAME_H}px`;form.style.transform=`scale(${rect.width/GAME_W},${rect.height/GAME_H})`;};
  const resize=new ResizeObserver(fit);resize.observe(scene.game.canvas);window.addEventListener('resize',fit);window.addEventListener('scroll',fit);window.addEventListener('chari-language-changed',localize);
  const keyboard=scene.input.keyboard,keyboardEnabled=keyboard?.enabled;if(keyboard)keyboard.enabled=false;
  const dispose=()=>{
    if(!active)return;active=false;++revision;clearTimeout(timer);captcha?.destroy();resize.disconnect();form.remove();
    window.removeEventListener('resize',fit);window.removeEventListener('scroll',fit);window.removeEventListener('chari-language-changed',localize);
    if(keyboard)keyboard.enabled=keyboardEnabled??true;scene.events.off('shutdown',dispose);
  };
  scene.events.once('shutdown',dispose);
  input.oninput=()=>{
    const current=++revision;clearTimeout(timer);message('');
    try{normalizeName(input.value);}catch(e){message((e as Error).message,true);return;}
    if(!rankingConfigured)return;message('名前を確認しています…');
    timer=setTimeout(async()=>{try{const{available}=await checkName(input.value);if(active&&revision===current)message(available?'この名前を登録できます。':'この名前は使われています。別の名前を入力してください。',!available);}catch(e){if(active&&revision===current)message((e as Error).message,true);}},450);
  };
  form.onsubmit=async event=>{
    event.preventDefault();if(submit.disabled||composing)return;
    ++revision;clearTimeout(timer);submit.disabled=true;input.disabled=true;
    try{
      let{name}=normalizeName(input.value);
      if(rankingConfigured){
        if(captchaSiteKey&&!captchaToken&&!await hasIdentity())throw new Error('本人確認が完了してから登録してください。');
        message('名前を登録しています…');name=await reserveName(name,captchaToken);
      }else saveName(name);
      if(active)done(name);
    }catch(e){if(active){message((e as Error).message,true);captcha?.reset();}}
    finally{if(active){submit.disabled=false;input.disabled=false;}}
  };
  // IME confirmation must not accidentally submit Korean, Chinese or Japanese names.
  let composing=false;input.addEventListener('compositionstart',()=>{composing=true;});input.addEventListener('compositionend',()=>{composing=false;});
  input.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'&&(e.isComposing||composing||e.keyCode===229))e.preventDefault();if(e.key==='Escape'&&!composing)cancel();});
  if(rankingConfigured&&captchaSiteKey)void hasIdentity().then(async exists=>{if(exists||!active)return;try{captcha=await mountCaptcha(challenge,value=>{captchaToken=value;});if(!active)captcha.destroy();}catch(e){if(active)message((e as Error).message,true);}}).catch(e=>{if(active)message((e as Error).message,true);});
  localize();fit();if(error)message(error,true);
  // Avoid bringing up a mobile keyboard before the player taps the name field.
  if(!mobile)input.focus({preventScroll:true});
  return {dispose,submit:()=>form.requestSubmit(),active:()=>active,setVisible:(visible:boolean)=>{form.hidden=!visible;}};
}
