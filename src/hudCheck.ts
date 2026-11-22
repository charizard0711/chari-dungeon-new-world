import './main';
import {installOnlineScenes} from './online/townScene';
if((import.meta as any).env.DEV&&location.hostname==='localhost'){
 const active={id:'hud-preview',slot:1,name:'charizard',gender:'male',hair_color:'blue',hp:95,gold:2770402,inventory:{potion:27},gear:{weapon:true,weapon_key:'w_bow_fire',armor:true,armor_key:'leather',shield:false},equipment:{weapon:['w_bow_fire','w_iron_dagger'],armor:['leather'],shield:[]}};
 const state:any={characters:[active],active,players:[{character_id:active.id,name:active.name,gender:'male',hair_color:'blue',x:12,y:14,dir:'down',armor:'leather',weapon:'w_bow_fire'}],messages:[],drops:[],superAccount:false};
 const timer=setInterval(()=>{const host=(window as any).__game?.scene.keys.TitleScene;if(host?.sys.isActive()){clearInterval(timer);installOnlineScenes(host,()=>{});host.scene.start('OnlineTownScene',{state,preview:true});}},100);
}

