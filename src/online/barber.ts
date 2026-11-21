import {isTap} from './tapActions';
import {HAIR_COLORS} from '../motionLab/wardrobe';
import {mountCharacterPreview} from './characterPreview';
import type {TownInteraction} from './townInteractions';

/** Small south-gate salon, beside the road rather than across the entrance. */
export function drawBarber(scene:any,n:TownInteraction){
 const x=(n.x+.5)*48,y=(n.y+1)*48;
 const booth=scene.add.image(x,y,'housing_booth').setOrigin(.5,1).setDisplaySize(96,112).setTint(0xd9e8f4).setDepth(n.y+.9).setInteractive();
 const pole=scene.add.graphics().setPosition(x-43,y-64).setDepth(n.y+1);
 pole.fillStyle(0xead9ac).fillRoundedRect(-6,-4,16,61,4);
 pole.fillStyle(0xf7eee1).fillRect(-3,0,10,51);
 for(let i=0;i<6;i++){pole.fillStyle(i%2?0x28628b:0xb94749).fillRect(-3,i*8,10,4);}
 scene.add.text(x,y-76,'✂',{fontSize:'25px',color:'#ffe9ab',backgroundColor:'#163c45',padding:{x:9,y:2}}).setOrigin(.5).setDepth(n.y+1);
 booth.on('pointerover',()=>scene.hoverInteraction=n);booth.on('pointerout',()=>scene.hoverInteraction=undefined);
 booth.on('pointerdown',(p:any,_x:any,_y:any,e:any)=>{if(p.rightButtonDown()||isTap(p)){e?.stopPropagation();if(isTap(p))scene.tapNpc(n);else void scene.tryInteract(n);}});
}

export function openBarber(scene:any){
 if(scene.housingModal||!scene.packet.active)return;
 scene.clearMoveInput();scene.housingModal=true;scene.hud.overlayMode='housing';scene.hud.townUI?.refresh();
 const root=document.createElement('section');root.className='housing-modal';root.setAttribute('role','dialog');root.setAttribute('aria-label','南門の床屋');root.setAttribute('aria-modal','true');
 root.style.cssText='inset:50% auto auto 50%;transform:translate(-50%,-50%);width:min(620px,94vw);max-height:90dvh;overflow:auto;box-sizing:border-box';
 const title=document.createElement('h2');title.textContent='南門の床屋 · ヘアカラー';
 const note=document.createElement('p');note.textContent='髪色を選んで試着できます。変更は1回1,000Gです。同じ色のままなら料金はかかりません。フード装備では髪が隠れます。';
 const preview=document.createElement('div'),colors=document.createElement('div');colors.style.cssText='display:flex;flex-wrap:wrap;gap:10px';
 let chosen=scene.packet.active.hair_color??'brown',pending=false;
 const status=document.createElement('p'),save=document.createElement('button'),exit=document.createElement('button');save.textContent='1,000Gで髪色を変更';exit.textContent='閉じる';
 const refresh=()=>{preview.replaceChildren(mountCharacterPreview(scene,{...scene.packet.active,hair_color:chosen}));for(const b of colors.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.color===chosen));};
 for(const color of HAIR_COLORS){const b=document.createElement('button');b.textContent=color.name;b.dataset.color=color.key;b.style.borderBottom=`5px solid rgb(${color.rgb.join(',')})`;b.onclick=()=>{chosen=color.key;refresh();};colors.append(b);}
 const close=()=>{if(pending)return;root.remove();scene.housingModal=false;scene.hud.overlayMode='none';scene.hud.townUI?.refresh();scene.events.off('shutdown',cleanup);};
 const cleanup=()=>root.remove();scene.events.once('shutdown',cleanup);exit.onclick=close;
 save.onclick=async()=>{if(pending)return;pending=true;save.disabled=exit.disabled=true;colors.querySelectorAll('button').forEach(b=>b.disabled=true);try{await scene.action('appearance_hair',{character_id:scene.packet.active.id,hair_color:chosen});status.textContent='髪色を変更しました。';}catch(e){status.textContent=(e as Error).message;}finally{pending=false;save.disabled=exit.disabled=false;colors.querySelectorAll('button').forEach(b=>b.disabled=false);}};
 root.append(title,note,preview,colors,status,save,exit);document.body.append(root);refresh();
}
