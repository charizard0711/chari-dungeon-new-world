import Phaser from 'phaser';
import {onlineCameraFollow} from '../src/online/cameraFollow';

const results:string[]=[];
function check(ok:boolean,message:string){if(!ok)throw Error(message);results.push('PASS '+message);}
try{
 for(const [width,height,label] of [[740,520,'PC'],[374,374,'mobile']] as const){
  const camera=new Phaser.Cameras.Scene2D.Camera(0,0,width,height).setBounds(0,0,6144,2880);
  const target={x:2000,y:1500} as Phaser.GameObjects.Zone;
  const follow=onlineCameraFollow(camera,true);follow.follow(target);camera.preRender();
  for(const [x,y] of [[2048.25,1548.5],[2000,1500],[0,0],[6144,2880]]){
   target.x=x;target.y=y;follow.follow(target);camera.preRender();
   check(Math.abs(camera.scrollX+width/2-x)<.01&&Math.abs(camera.scrollY+height/2-y)<.01,label+': centre follows interpolated position '+x+','+y);
  }
  follow.stop();const old=camera.scrollX;target.x=2000;camera.preRender();
  check(camera.scrollX===old,label+': leaving stops follow');
  follow.follow(target);camera.preRender();check(camera.scrollX!==old,label+': re-entry attaches again');
  camera.destroy();
 }
 const town=new Phaser.Cameras.Scene2D.Camera(0,0,740,520).setBounds(0,0,1200,912);
 const target={x:600,y:450} as Phaser.GameObjects.Zone,follow=onlineCameraFollow(town,false);
 follow.follow(target);town.preRender();const before=town.scrollX;target.x+=48;follow.follow(target);
 check(town.scrollX===before&&town.deadzone===null,'Town: packets do not snap; existing follow style retained');
 town.preRender();check(town.scrollX>before&&town.scrollX<target.x-370,'Town: movement keeps smooth existing interpolation');
 const house=new Phaser.Cameras.Scene2D.Camera(0,0,740,520).setBounds(0,0,1200,912);
 onlineCameraFollow(house,false,true).follow(target);check(house.deadzone!==null&&house.useBounds,'House: existing deadzone and bounds retained');
 document.body.dataset.result='pass';
}catch(error){results.push('FAIL '+(error as Error).message);document.body.dataset.result='fail';}
document.getElementById('results')!.textContent=results.join('\n');
