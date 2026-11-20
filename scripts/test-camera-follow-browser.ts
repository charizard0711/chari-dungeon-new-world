import Phaser from 'phaser';
import {onlineCameraFollow} from '../src/online/cameraFollow';

const results:string[]=[];
function check(ok:boolean,message:string){if(!ok)throw Error(message);results.push('PASS '+message);}
try{
 for(const [width,height,label] of [[740,520,'PC'],[374,374,'mobile']] as const){
  const camera=new Phaser.Cameras.Scene2D.Camera(0,0,width,height).setBounds(0,0,6144,2880);
  const target={x:2000,y:1500} as Phaser.GameObjects.Zone;
  const follow=onlineCameraFollow(camera,true);follow.follow(target);camera.preRender();
  const initial=[camera.scrollX,camera.scrollY];
  target.x+=48;target.y+=48;
  for(let i=0;i<30;i++){follow.follow(target);camera.preRender();}
  check(camera.scrollX===initial[0]&&camera.scrollY===initial[1],label+': one-cell movement and repeated server packets leave camera still');
  target.x+=width*.4;follow.follow(target);camera.preRender();
  check(camera.scrollX>initial[0]&&camera.scrollX<target.x-width/2,label+': outer movement scrolls gently without snapping player to center');
  for(let i=0;i<90;i++){follow.follow(target);camera.preRender();}
  const settled=camera.scrollX;target.x-=48;
  for(let i=0;i<30;i++){follow.follow(target);camera.preRender();}
  check(camera.scrollX===settled,label+': reversing one cell leaves camera still');
  target.x=0;target.y=0;for(let i=0;i<180;i++)camera.preRender();
  check(camera.scrollX===0&&camera.scrollY===0,label+': upper/left map bounds');
  target.x=6144;target.y=2880;for(let i=0;i<180;i++)camera.preRender();
  check(camera.scrollX===6144-width&&camera.scrollY===2880-height,label+': lower/right map bounds');
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
 document.body.dataset.result='pass';
}catch(error){results.push('FAIL '+(error as Error).message);document.body.dataset.result='fail';}
document.getElementById('results')!.textContent=results.join('\n');
