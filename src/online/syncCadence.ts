import {bossStage,inStage} from './adventure/stage';
import type {AdventureState} from './adventure/types';

export function combatSyncInterval(adventure:AdventureState|undefined|null){
 if(!adventure?.inside)return 0;
 if(adventure.railTrip)return 320;
 if(adventure.floor!==1)return 480;
 const {snapshot,x,y}=adventure;
 if(snapshot.telegraphs?.length||snapshot.bossEncounter?.smash&&!snapshot.bossEncounter.smash.applied)return 160;
 const boss=bossStage(adventure);
 const nearby=snapshot.enemies.some(enemy=>
  enemy.hp>0&&inStage(boss,enemy.x,enemy.y)&&Math.abs(enemy.x-x)+Math.abs(enemy.y-y)<=10
 );
 return nearby?160:480;
}

export function worldSyncInterval(inDungeon:boolean,elapsedSinceAction:number){
 if(inDungeon)return 3000;
 return elapsedSinceAction<8000?800:1200;
}
