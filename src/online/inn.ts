import type Phaser from 'phaser';
import {MAP_X,MAP_Y,MAP_W,MAP_H,IS_MOBILE} from '../layout';
import {TOWN_TILE as TILE} from './townLayout';

const COLS=15,ROWS=10;
const PATRON={x:13,y:3};
const EXIT={x:7,y:9};
export function innInteractionAt(x:number,y:number){
 if(x===PATRON.x&&y===PATRON.y)return 'patron';
 if(x===EXIT.x&&y===EXIT.y)return 'exit';
}
export function innBlocked(x:number,y:number){
 if(x<1||x>13||y<2||y>=9)return innInteractionAt(x,y)!=='exit';
 if(y<=3&&x>=3&&x<=11)return true;
 return (y>=4&&y<=7)&&(x<=3||x>=11)||innInteractionAt(x,y)==='patron';
}
export function preloadInn(scene:Phaser.Scene){
 for(const name of ['interior','patron'])if(!scene.textures.exists('inn_'+name))scene.load.image('inn_'+name,'assets/online/inn-v1/'+name+'.webp');
}
export function mountInnInterior(scene:Phaser.Scene){
 const camera=scene.cameras.main.setViewport(MAP_X,MAP_Y,MAP_W,MAP_H).setBackgroundColor('#0e0806');
 if(IS_MOBILE)camera.setBounds(0,0,COLS*TILE,ROWS*TILE);
 else camera.removeBounds().setZoom(.95).centerOn(COLS*TILE/2,ROWS*TILE/2);
 scene.add.image(0,0,'inn_interior').setOrigin(0).setDisplaySize(COLS*TILE,ROWS*TILE).setDepth(-100);
 const light=scene.add.ellipse((EXIT.x+.5)*TILE,(EXIT.y+.68)*TILE,44,14,0xffce7d,.22).setDepth(0);
 scene.tweens.add({targets:light,alpha:.45,yoyo:true,repeat:-1,duration:1280});
 const patron=scene.add.image((PATRON.x+.5)*TILE,(PATRON.y+1)*TILE,'inn_patron').setOrigin(.5,1).setDepth(PATRON.y+.85);
 patron.setScale(57/patron.height);
 scene.tweens.add({targets:patron,y:patron.y-1,yoyo:true,repeat:-1,duration:950,ease:'Sine.inOut'});
 const label={fontFamily:'Meiryo',fontSize:'11px',color:'#ffdfad',backgroundColor:'#21170dcc',padding:{x:4,y:2}};
 scene.add.text(patron.x,patron.y+1,'黒いフードの人物',label).setOrigin(.5,0).setDepth(PATRON.y+1);
 scene.add.text(light.x,light.y-8,'町へ',label).setOrigin(.5,0).setDepth(10);
}
