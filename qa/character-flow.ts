import {online} from '/src/online/api';
if(!import.meta.env.DEV || !['localhost','127.0.0.1'].includes(location.hostname))throw Error('Local QA only');
if(new URLSearchParams(location.search).get('mute')!=='1')throw Error('Mute is required');
const state={characters:[],active:null,players:[],messages:[],drops:[],trainingHits:[],superAccount:false};
const result=()=>({data:structuredClone(state),error:null});
online.auth.getSession=async()=>({data:{session:{user:{id:'qa-account',is_anonymous:false}}},error:null});
online.auth.signOut=async()=>({error:null});
online.rpc=async(_name,{action,payload})=>{
 if(action==='create_character'){state.characters.push({id:'qa-one',slot:1,name:payload.name,gender:payload.gender,hp:100,inventory:{potion:3},gear:{weapon:true,armor:true,weapon_key:'w_iron_dagger',armor_key:'leather'},equipment:{weapon:['w_iron_dagger'],armor:['leather'],shield:[]}});}
 if(action==='join'){state.active=state.characters.find(c=>c.id===payload.character_id);state.players=[{character_id:state.active.id,name:state.active.name,gender:state.active.gender,armor:'leather',weapon:'w_iron_dagger',x:12,y:14,dir:'down'}];}
 if(action==='move'){Object.assign(state.players[0],{x:payload.x,y:payload.y,dir:payload.dir});}
 if(action==='leave'){state.active=null;state.players=[];}
 return result();
};
await import('/src/main');
const report=document.createElement('output');report.id='qa-silence';report.style.cssText='position:fixed;left:4px;bottom:4px;z-index:9000;background:#07191d;color:#aee5d7;font:11px monospace';document.body.append(report);
setInterval(()=>{const g=window.__game;if(g)report.textContent='Local fixture · noAudio='+g.config.audio.noAudio+' · scene='+g.scene.getScenes(true).map(s=>s.sys.settings.key).join(',');},250);
