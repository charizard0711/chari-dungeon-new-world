import {gradeColor} from '../data';
import type {EquipmentGrade} from '../types';
import './gachaPresentation.css';
export interface GachaPrize {name:string;grade:EquipmentGrade;starred:boolean;icon:HTMLElement;}
const el=(tag:string,cls:string,text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;};
/** Animate the existing illustration. Rewards always come from the server, once per roll. */
export function createGachaPresentation(onPhase?:(phase:string)=>void){
 const element=el('div','town-gacha-stage');element.dataset.phase='idle';
 const ring=el('div','gacha-magic-ring'),rays=el('div','gacha-rays'),halo=el('div','gacha-halo'),machine=el('img','gacha-machine') as HTMLImageElement;machine.src='assets/online/gacha-v3.png';machine.alt='魔法のガチャ';machine.draggable=false;
 const motes=el('div','gacha-motes');for(let i=0;i<18;i++){const mote=el('i','');mote.style.setProperty('--i',String(i));mote.style.setProperty('--x',`${12+(i*37)%77}%`);motes.append(mote);}
 const capsule=el('div','gacha-capsule'),closed=el('img','capsule-closed') as HTMLImageElement,top=el('img','capsule-top') as HTMLImageElement,bottom=el('img','capsule-bottom') as HTMLImageElement;for(const img of [closed,top,bottom]){img.alt='';img.draggable=false;}capsule.append(closed,top,bottom);
 const prize=el('div','gacha-prize'),badge=el('span','gacha-prize-grade'),icon=el('div','gacha-prize-icon'),name=el('strong','gacha-prize-name');prize.append(badge,icon,name);
 const caption=el('p','gacha-caption','運命のカプセルを、ひとつ。');caption.setAttribute('role','status');element.append(ring,rays,halo,motes,machine,capsule,prize,caption);
 let running=false,disposed=false,skip=false,wake:(()=>void)|undefined;
 const phase=(value:string,text:string)=>{if(disposed)return;element.dataset.phase=value;caption.textContent=text;onPhase?.(value);};
 const delay=(ms:number)=>new Promise<void>(resolve=>{if(skip||disposed){resolve();return;}const timer=setTimeout(()=>{wake=undefined;resolve();},ms);wake=()=>{clearTimeout(timer);wake=undefined;resolve();};});
 const finishEarly=()=>{skip=true;wake?.();};
 return{element,get running(){return running;},skip:finishEarly,dispose(){disposed=true;finishEarly();},async play(request:()=>Promise<GachaPrize>){
  if(running||disposed)return;running=true;skip=false;prize.setAttribute('aria-hidden','true');phase('spinning','カプセルをかき混ぜています…');
  try{
   // Await the actual result even if the player skips. No second request on skip/close.
   const [result]=await Promise.all([request(),delay(1350)]);if(disposed)return;
   const color='#'+gradeColor(result.grade).toString(16).padStart(6,'0');element.style.setProperty('--prize-color',color);element.dataset.grade=result.grade;for(const [img,part]of [[closed,'closed'],[top,'top'],[bottom,'bottom']] as const)img.src=`assets/online/exploration-v3/capsule-${result.grade.toLowerCase()}-${part}.webp`;await Promise.all([closed,top,bottom].map(img=>img.decode().catch(()=>{})));element.dataset.rare=String(['S','SS','SSS'].includes(result.grade)||result.starred);badge.textContent=`${result.grade}${result.starred?' · COLOR VARIANT':''}`;name.textContent=result.name+(result.starred?' ★ 色違い':'');icon.replaceChildren(result.icon);
   phase('drop','カプセルが出てきた！');await delay(750);if(disposed)return;
   phase('opening','光の向こうに、新しい装備が…');await delay(500);if(disposed)return;
   prize.removeAttribute('aria-hidden');phase('reveal','新しい装備を獲得しました');await delay(350);return result;
  }catch(error){wake?.();phase('idle','抽選できませんでした。もう一度お試しください。');throw error;}
  finally{running=false;}
 }};
}
