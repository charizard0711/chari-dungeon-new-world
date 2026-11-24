import Phaser from 'phaser';
import {Audio} from '../audio/manager';
import {finishLoading} from '../loadingScreen';
import {GAME_W,GAME_H} from '../layout';
import {openOnline} from '../online/ui';
import {openOnlineSettings} from '../online/release';
import {getLanguage,setLanguage} from '../i18n';
import type {Language} from '../localeCore';
import {NEW_WORLD_NAME,NEW_WORLD_LOGO} from '../newWorldBrand';
import '../newWorld.css';
import {finishLobbyButton} from '../online/lobbyButtons';
import '../online/lobby.css';

/** The new game has a single entry: account -> character -> town. */
export class TitleScene extends Phaser.Scene {
  constructor(){super('TitleScene');}
  create(){
    Audio.playBgm('title');
    const image=this.add.image(GAME_W/2,GAME_H/2,'title_citadel_v1');
    image.setScale(Math.max(GAME_W/image.width,GAME_H/image.height));
    const root=document.createElement('section');root.className='new-world-title zero-lobby';root.setAttribute('aria-label',NEW_WORLD_NAME);
    const fit=()=>{const r=this.game.canvas.getBoundingClientRect();Object.assign(root.style,{left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`});};
    const observer=new ResizeObserver(fit);observer.observe(this.game.canvas);window.addEventListener('resize',fit);window.addEventListener('scroll',fit);fit();
    const languages=document.createElement('select');languages.className='new-world-language';languages.setAttribute('aria-label','Language / 言語');
    for(const [value,label] of [['ja','日本語'],['en','English'],['ko','한국어'],['zh-CN','简体中文']]){const option=document.createElement('option');option.value=value;option.textContent=label;languages.append(option);}
    languages.value=getLanguage();languages.onchange=()=>{setLanguage(languages.value as Language);refresh();};
    const logo=document.createElement('img');logo.src=NEW_WORLD_LOGO;logo.alt=NEW_WORLD_NAME;logo.className='new-world-logo';
    const actions=document.createElement('div');actions.className='new-world-actions';
    const start=document.createElement('button');start.type='button';start.className='new-world-start';start.onclick=()=>{Audio.playSe('click');openOnline(this,Audio);};
    const settings=document.createElement('button');settings.type='button';settings.className='new-world-settings';settings.onclick=()=>{Audio.playSe('click');openOnlineSettings(this,Audio);};
    const caption=document.createElement('p');caption.className='new-world-caption';
    const footer=document.createElement('p');footer.className='new-world-footer';footer.textContent='CHARI DUNGEON : ZERO';
    const refresh=()=>{const language=getLanguage();start.textContent=({ja:'スタート',en:'START',ko:'시작','zh-CN':'开始'})[language];settings.textContent=({ja:'設定',en:'SETTINGS',ko:'설정','zh-CN':'设置'})[language];finishLobbyButton(start,start.textContent??'START','confirm');finishLobbyButton(settings,settings.textContent??'SETTINGS','slate');caption.textContent=({ja:'まだ見ぬ世界へ、仲間と。',en:'A new world. An adventure together.',ko:'동료와 함께, 새로운 세계로.','zh-CN':'与伙伴一起，前往崭新的世界。'})[language];};
    refresh();actions.append(start,settings);root.append(languages,logo,caption,actions,footer);document.body.append(root);finishLoading();
    const key=(event:KeyboardEvent)=>{if(event.key==='Enter'&&document.activeElement===document.body){event.preventDefault();start.click();}};
    window.addEventListener('keydown',key);
    const entry=new URL(location.href);if(['google','microsoft'].includes(entry.searchParams.get('login')??'')){entry.searchParams.delete('login');history.replaceState(null,'',entry);this.time.delayedCall(0,()=>openOnline(this,Audio));}
    this.events.once('shutdown',()=>{root.remove();observer.disconnect();window.removeEventListener('resize',fit);window.removeEventListener('scroll',fit);window.removeEventListener('keydown',key);});
  }
}
