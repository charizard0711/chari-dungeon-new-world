import {GAME_W,GAME_H,MAP_X,MAP_Y,MAP_H,IS_MOBILE} from '../layout';
import type {WorldState} from './worldApi';
import './floorHud.css';

export const floorItemEffects:Record<string,string>={
 potion:'自分のHPを回復',skill_drink:'武器スキルを即時チャージ',
 warp:'いまいる階層の入口へ戻る',invis:'10秒間透明になる。攻撃すると解除',
 mystery_bread:'同じ部屋・同じ階層の全員を全回復し、2分間無敵にする',
 dynamite:'近くの雑魚を倒す。近衛に最大HPの30%、ボスに10%のダメージ',
};

export function attachFloorTooltip(button:HTMLButtonElement,text:string,tooltip:HTMLElement){
 const initialized=button.dataset.floorTooltip!==undefined;
 button.dataset.floorTooltip=text;
 if(initialized)return;
 const show=()=>{
  const rect=button.getBoundingClientRect();
  tooltip.textContent=button.dataset.floorTooltip??'';tooltip.hidden=false;
  const left=Math.max(6,Math.min(rect.left+rect.width/2-tooltip.offsetWidth/2,innerWidth-tooltip.offsetWidth-6));
  tooltip.style.left=left+'px';
  tooltip.style.top=Math.max(6,rect.top-tooltip.offsetHeight-8)+'px';
 };
 button.addEventListener('pointerenter',show);
 button.addEventListener('focus',show);
 for(const event of ['pointerleave','blur','pointerdown'])button.addEventListener(event,()=>{tooltip.hidden=true;});
 button.setAttribute('aria-describedby',tooltip.id);
}

export function mountFloorRoster(canvas:HTMLCanvasElement,inspect:(id:string)=>void){
 const root=document.createElement('section');
 root.className='zero-floor-roster';
 root.setAttribute('aria-label','同じ部屋の冒険者');
 root.hidden=true;
 document.body.append(root);
 const fit=()=>{
  const r=canvas.getBoundingClientRect();
  root.style.left=r.left+(MAP_X+7)*r.width/GAME_W+'px';
  root.style.top=r.top+(MAP_Y+42)*r.height/GAME_H+'px';
  root.style.maxHeight=Math.min(MAP_H-50,IS_MOBILE?140:310)+'px';
  root.style.transform=`scale(${r.width/GAME_W},${r.height/GAME_H})`;
 };
 const resize=new ResizeObserver(fit);
 resize.observe(canvas);window.addEventListener('resize',fit);window.addEventListener('scroll',fit);fit();
 let signature='',previousRows:WorldState['roomRoster'];
 return {
  update(state:WorldState,hide:boolean){
   const rows=state.adventure?.inside?state.roomRoster:undefined;
   root.hidden=hide||!rows?.length;
   if(!rows)return;
   if(root.hidden)return;
   if(rows===previousRows)return;
   previousRows=rows;
   const next=JSON.stringify([state.active?.id,rows]);
   if(next===signature)return;
   signature=next;
   root.replaceChildren();
   for(const row of rows){
    const b=document.createElement('button'),name=document.createElement('span'),hp=document.createElement('progress');
    b.type='button';b.disabled=row.id===state.active?.id;
    name.textContent=row.name+(row.floor===state.adventure?.floor?'':` · ${row.floor}F`);
    hp.max=Math.max(1,row.hpMax);hp.value=Math.max(0,row.hp);
    hp.setAttribute('aria-label',`HP ${row.hp} / ${row.hpMax}`);
    b.append(name,hp);b.onclick=()=>inspect(row.id);root.append(b);
   }
  },
  destroy(){resize.disconnect();window.removeEventListener('resize',fit);window.removeEventListener('scroll',fit);root.remove();},
 };
}
