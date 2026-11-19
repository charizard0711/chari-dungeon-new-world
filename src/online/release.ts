export { openOnline } from './ui';
export { mountEmailConfirmation } from './confirm';
export { ensureShieldMist } from '../shieldAuraArt';
export function openOnlineSettings(scene:any, audio:any) {
  const root=document.createElement('section');root.className='online-panel';
  const title=document.createElement('h2');title.textContent='設定';root.append(title);
  const keyboard=scene.input.keyboard,enabled=keyboard?.enabled;if(keyboard)keyboard.enabled=false;
  const close=()=>{root.remove();if(keyboard)keyboard.enabled=enabled;scene.events.off('shutdown',close);};
  for(const [label,key,setter] of [['BGM','bgmVolume','setBgmVolume'],['効果音','seVolume','setSeVolume']]){
    const row=document.createElement('label');row.textContent=label;
    const slider=document.createElement('input');slider.type='range';slider.min='0';slider.max='1';slider.step='.05';slider.value=String(audio[key]);slider.setAttribute('aria-label',`${label}音量`);
    slider.oninput=()=>audio[setter](Number(slider.value));row.append(slider);root.append(row);
  }
  const back=document.createElement('button');back.textContent='戻る';back.onclick=close;root.append(back);document.body.append(root);scene.events.once('shutdown',close);
}

export {installGamePresentation} from './presentation';
