import './main';
import {installOnlineScenes} from './online/townScene';
import {mountOnlineLobby} from './online/ui';
if((import.meta as any).env.DEV&&location.hostname==='localhost'){
 const character={id:'lobby-preview',slot:1,name:'charizard',gender:'male' as const,hair_color:'blue',hp:100,inventory:{},gear:{weapon:true,weapon_key:'w_bow_fire',armor:true,armor_key:'leather'}};
 const state={characters:[character],active:character,players:[],messages:[],superAccount:false};
 const timer=setInterval(()=>{const scene=(window as any).__game?.scene.keys.TitleScene;if(scene?.sys.isActive()){clearInterval(timer);installOnlineScenes(scene,s=>mountOnlineLobby(s,new URLSearchParams(location.search).has('login')?undefined:state));scene.scene.start('OnlineLobbyScene');}},100);
}

