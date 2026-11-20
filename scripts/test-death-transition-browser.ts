import Phaser from 'phaser';import {mountDeathTransition} from '../src/online/deathTransition';
const canvas=document.createElement('canvas');canvas.width=900;canvas.height=500;canvas.style.cssText='width:900px;max-width:95vw;height:500px;display:block;background:#183d3e';document.body.append(canvas);
const ctx=canvas.getContext('2d')!,events=new Phaser.Events.EventEmitter();let black=0,done=0;const output=document.getElementById('results')!;
function draw(label:string){ctx.fillStyle='#163136';ctx.fillRect(0,0,900,500);ctx.strokeStyle='#577069';for(let i=0;i<900;i+=48){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,500);ctx.stroke();}for(let i=0;i<500;i+=48){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(900,i);ctx.stroke();}ctx.fillStyle='#e8dca1';ctx.font='30px sans-serif';ctx.fillText(label,70,240);}
draw('Dungeon — fallen location');
const scene={game:{canvas},events} as unknown as Phaser.Scene;
const button=document.createElement('button');button.textContent='Replay death transition';document.body.append(button);
async function run(){button.disabled=true;black=0;done=0;draw('Dungeon — fallen location');const transition=mountDeathTransition(scene,()=>{black++;if(transition.root.dataset.phase!=='black')throw Error('Location changed before blackout');draw('Dungeon entrance — waking up');},()=>{done++;});
 await transition.finished;
 if(black!==1||done!==1||document.querySelector('.online-death-transition')){output.textContent='FAIL death transition';document.body.dataset.result='fail';}else{output.textContent='PASS: location changed only under full black; eyes opened; input shield removed; callback fired once. No sound.';document.body.dataset.result='pass';}
 button.disabled=false;
}
button.onclick=()=>void run();void run();
