import {townSoundLevel} from '../presentation';
import type {RailTrip} from './railRoute';

export const RAIL_AUDIO={run:'assets/online/railway-audio-v1/run.mp3',brake:'assets/online/railway-audio-v1/brake.mp3',arrival:'assets/online/railway-audio-v1/arrival.mp3'} as const;

/** One local rider, one loop. Poll packets never restart it; scene exit always stops it. */
export function createRailAudio(scene:any){
 let key='',lastTrip:RailTrip|undefined,braked=false,arrived=false,loop:any;
 const shots=new Set<any>();
 const stopLoop=()=>{if(loop){loop.stop();loop.destroy();loop=undefined;}};
 const stopShots=()=>{for(const sound of shots){sound.stop();sound.destroy();}shots.clear();};
 const level=()=>townSoundLevel(scene.registry.get('onlineAudio'),scene.sound.mute,
  scene.game.config.audio.noAudio||new URLSearchParams(location.search).get('mute')==='1'||document.hidden,'equip');
 const shot=(name:'brake'|'arrival',volume:number)=>{const id='rail_'+name;if(!volume||!scene.cache.audio.exists(id))return;const sound=scene.sound.add(id,{volume});shots.add(sound);sound.once('complete',()=>{shots.delete(sound);sound.destroy();});sound.play();};
 const finish=(volume:number)=>{stopLoop();if(!arrived){arrived=true;shot('arrival',volume*.85);}};
 return{
  update(trip:RailTrip|null|undefined,now:number){
   const volume=level();if(!volume){stopLoop();stopShots();}
   if(!trip){if(lastTrip&&!arrived&&now>=lastTrip.started+lastTrip.duration-500)finish(volume);else{stopLoop();if(lastTrip&&!arrived)stopShots();}lastTrip=undefined;return;}
   const next=`${trip.started}:${trip.reverse}`;
   if(next!==key){stopLoop();stopShots();key=next;braked=false;arrived=now>=trip.started+trip.duration;}
   lastTrip=trip;
   const elapsed=now-trip.started,remaining=trip.duration-elapsed;
   if(remaining<=0){finish(volume);return;}
   if(elapsed<0||!volume)return;
   if(remaining<=3000&&!braked){braked=true;shot('brake',volume*.65);}
   const ramp=Math.max(0,Math.min(1,elapsed/3000,remaining/3000));
   if(!loop&&scene.cache.audio.exists('rail_run')){loop=scene.sound.add('rail_run',{loop:true,volume:0});loop.play({seek:(Math.max(0,elapsed)/1000)%8});}
   loop?.setVolume(volume*(.25+.65*ramp));loop?.setRate(.65+.35*ramp);
  },
  destroy(){stopLoop();stopShots();lastTrip=undefined;}
 };
}
