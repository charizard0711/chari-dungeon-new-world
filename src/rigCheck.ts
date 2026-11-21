import './main';
import {installOnlineScenes} from './online/townScene';
import {mountCharacterPreview} from './online/characterPreview';
import {COSTUMES,HAIR_COLORS} from './motionLab/wardrobe';
import weapons from './motionLab/weapons.json';
import type {WorldState} from './online/worldApi';
if((import.meta as any).env.DEV){
 const bar=document.createElement('div');bar.style.cssText='position:fixed;top:0;left:0;z-index:999999;background:#15262f;color:white;padding:6px;font:13px sans-serif;display:flex;gap:8px;align-items:center';document.body.append(bar);
 const select=(name:string,items:{key:string;name:string}[])=>{const s=document.createElement('select');s.ariaLabel=name;for(const i of items)s.add(new Option(i.name,i.key));bar.append(s);return s;};
 const armor=select('QA 服',COSTUMES.filter(c=>!c.key.startsWith('pumpkin'))),gender=select('QA 性別',[{key:'male',name:'男'},{key:'female',name:'女'}]),hair=select('QA 髪色',[...HAIR_COLORS]),weapon=select('QA 武器',weapons),dir=select('QA 方向',['down','up','left','right'].map(key=>({key,name:key})));weapon.value='w_iron_dagger';
 const star=document.createElement('input');star.type='checkbox';star.ariaLabel='QA 色違い';bar.append(star);
 const shield=document.createElement('input');shield.type='checkbox';shield.ariaLabel='QA 盾';bar.append(shield);
 const preview=document.createElement('div');preview.style.cssText='position:fixed;right:12px;top:42px;width:176px;background:#07121a;z-index:999999';document.body.append(preview);
 const status=document.createElement('span');bar.append(status);let town:any;
 const state:WorldState={characters:[],active:{id:'qa',slot:1,name:'Release QA',gender:'male',hp:100,gold:200,inventory:{potion:3},gear:{weapon:true,weapon_key:'w_iron_dagger',armor:true,armor_key:'leather',shield:true,shield_key:'s_iron_round'},equipment:{weapon:['w_iron_dagger'],armor:['leather'],shield:['s_iron_round']}},players:[{character_id:'qa',name:'Release QA',gender:'male',x:12,y:14,dir:'down',armor:'leather',weapon:'w_iron_dagger',shield:'s_iron_round'}],messages:[],drops:[],superAccount:false};state.characters=[state.active!];
 const apply=()=>{if(!town)return;const c=state.active!,p=state.players[0];c.gear.shield=shield.checked;p.shield=shield.checked?'s_iron_round':null;c.gender=p.gender=gender.value as any;c.hair_color=p.hair_color=hair.value;c.gear.armor_key=p.armor=armor.value;c.gear.weapon_key=p.weapon=(star.checked?'star_':'')+weapon.value;c.equipment!.weapon=[c.gear.weapon_key!];c.equipment!.armor=[armor.value];p.dir=dir.value as any;town.playerSignature='';town.syncPlayer();town.drawPlayers();preview.replaceChildren(mountCharacterPreview(town,c));status.textContent='無音・ローカル町';};
 for(const s of [armor,gender,hair,weapon,dir,star,shield])s.onchange=apply;
 const b=document.createElement('button');b.textContent='攻撃テスト';b.onclick=()=>town?.action('attack',{dir:dir.value,x:12,y:13});bar.append(b);
 const houseButton=document.createElement('button');houseButton.textContent='住宅売却テスト';houseButton.onclick=()=>{if(!town)return;state.active!.gold=1500000;state.houses=[{id:'north-1',ownerId:'qa',ownerName:'Release QA',mine:true,resalePrice:350000}];town.registry.set('townTestTransport',async(action:string)=>{if(action==='house_sell'){state.active!.gold!+=350000;state.houses![0]={id:'north-1',ownerId:null,ownerName:null,mine:false};}return state;});town.housingUI.sale('north-1');};bar.append(houseButton);
 const timer=setInterval(()=>{const game=(window as any).__game,host=game?.scene?.keys?.TitleScene;if(host?.sys?.isActive()){clearInterval(timer);installOnlineScenes(host,()=>{});host.scene.start('OnlineTownScene',{state,preview:true});const ready=setInterval(()=>{town=game.scene.keys.OnlineTownScene;if(town?.sys?.isActive()&&town.hud){clearInterval(ready);apply();}},100);}},100);
}
