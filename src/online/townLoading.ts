import type Phaser from 'phaser';
import './online.css';

export type TownLoading=ReturnType<typeof mountTownLoading>;
export function mountTownLoading(scene:Phaser.Scene,destination?:string){
  const root=document.createElement('section');root.className='town-entry-loading';root.setAttribute('aria-label',destination?'冒険を読み込み中':'町を読み込み中');root.setAttribute('aria-busy','true');
  const painting=document.createElement('img');painting.src=new URL('assets/new-world/title-world-v1.webp',scene.game.canvas.ownerDocument.baseURI).href;painting.alt='';painting.className='town-entry-painting';root.append(painting);
  const panel=document.createElement('div');panel.className='town-entry-caption';
  const eyebrow=document.createElement('p');eyebrow.textContent='ONLINE · サーバー1';eyebrow.className='town-entry-eyebrow';
  const title=document.createElement('h2');title.textContent=destination??'はじまりの町へ';
  const status=document.createElement('p');status.setAttribute('role','status');status.textContent='町への道を準備しています…';
  const bar=document.createElement('div');bar.className='town-entry-progress';bar.setAttribute('role','progressbar');bar.setAttribute('aria-label','町の読み込み状況');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax','100');
  const fill=document.createElement('div');bar.append(fill);
  const percent=document.createElement('span');percent.className='town-entry-percent';
  panel.append(eyebrow,title,status,bar,percent);root.append(panel);document.body.append(root);
  let disposed=false,timer:ReturnType<typeof setTimeout>|undefined;
  const fit=()=>{const r=scene.game.canvas.getBoundingClientRect();Object.assign(root.style,{left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`});};
  const resize=new ResizeObserver(fit);resize.observe(scene.game.canvas);window.addEventListener('resize',fit);window.addEventListener('scroll',fit);
  const destroy=()=>{if(disposed)return;disposed=true;clearTimeout(timer);resize.disconnect();window.removeEventListener('resize',fit);window.removeEventListener('scroll',fit);root.remove();};
  const update=(progress:number,label='町の画像と冒険者を読み込み中…')=>{if(disposed)return;const value=Math.round(Math.max(0,Math.min(1,progress))*100);fill.style.width=`${value}%`;bar.setAttribute('aria-valuenow',String(value));percent.textContent=`${value}%`;status.textContent=label;};
  fit();update(.03,'サーバーに接続中…');
  return {root,update,destroy,finish(done:()=>void){update(1,'準備ができました');root.setAttribute('aria-busy','false');root.classList.add('ready');timer=setTimeout(()=>{destroy();done();},220);}};
}
