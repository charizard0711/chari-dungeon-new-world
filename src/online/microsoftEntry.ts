import {online} from './api';
const url=new URL(location.href);
const code=url.searchParams.get('code');
const rejected=url.searchParams.has('error');
const muted=url.searchParams.get('mute')==='1';
// Remove the one-time code before loading any other screen or displaying errors.
history.replaceState(null,'',location.pathname+(muted?'?mute=1':''));
const back=new URL('./',location.href);back.searchParams.set('login','microsoft');if(muted)back.searchParams.set('mute','1');
const link=document.getElementById('return') as HTMLAnchorElement;link.href=back.href;
async function finish(){
  try{
    if(rejected)throw Error('Microsoftログインがキャンセルされました。もう一度お試しください。');
    if(!online||!code)throw Error('ログイン情報を確認できませんでした。ログイン画面からやり直してください。');
    const {data,error}=await online.auth.exchangeCodeForSession(code);
    if(error||!data.session)throw Error('ログインの有効期限が切れたか、開始したブラウザーと異なります。もう一度お試しください。');
    location.replace(back.href);
  }catch(error){document.getElementById('status')!.textContent=error instanceof Error?error.message:'ログインできませんでした。';document.querySelector('progress')?.remove();link.hidden=false;}
}
void finish();
