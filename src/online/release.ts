export { openOnline } from './ui';
export { mountEmailConfirmation } from './confirm';
export { ensureShieldMist } from '../shieldAuraArt';
import {finishLobbyButton} from './lobbyButtons';
import './settings.css';
export function openOnlineSettings(scene:any, audio:any) {
  const root=document.createElement('section');root.className='zero-settings-overlay zero-lobby';const panel=document.createElement('div');panel.className='zero-settings-dialog';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','設定');root.append(panel);const previousFocus=document.activeElement as HTMLElement|null;
  const title=document.createElement('h2');title.textContent='設定';panel.append(title);
  const keyboard=scene.input.keyboard,enabled=keyboard?.enabled;if(keyboard)keyboard.enabled=false;
  const close=()=>{root.remove();previousFocus?.focus();if(keyboard)keyboard.enabled=enabled;scene.events.off('shutdown',close);};
  for(const [label,key,setter] of [['BGM','bgmVolume','setBgmVolume'],['効果音','seVolume','setSeVolume']]){
    const row=document.createElement('label');row.textContent=label;
    const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='1';slider.step='.05';slider.value=String(audio[key]);slider.setAttribute('aria-label',`${label}音量`);
    const value=document.createElement('output');const refresh=()=>{value.textContent=Math.round(Number(slider.value)*100)+'%';slider.style.setProperty('--volume',value.textContent);};refresh();slider.oninput=()=>{audio[setter](Number(slider.value));refresh();};row.append(value,slider);panel.append(row);
  }
  const back=document.createElement('button');back.textContent='戻る';back.onclick=close;finishLobbyButton(back,'戻る','slate');panel.append(back);root.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();close();}if(event.key==='Tab'){const inputs=Array.from(panel.querySelectorAll<HTMLElement>('input,button'));const first=inputs[0],last=inputs[inputs.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});document.body.append(root);back.focus();scene.events.once('shutdown',close);
}

export {installGamePresentation} from './presentation';
