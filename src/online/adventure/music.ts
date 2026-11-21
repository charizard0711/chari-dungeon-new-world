import type {BgmName} from '../../audio/config';
import type {AdventureState} from './types';
import {adventureAreaAt, ADVENTURE_MONSTERS} from './layout';

/** Only the living floor boss changes music; key guardians retain exploration music. */
export function adventureBgm(adventure?:AdventureState|null):BgmName {
  if(!adventure?.inside)return 'title';
  if(adventure.status!=='active'||adventure.snapshot.stairs)return 'floor01';
  if(adventure.snapshot.bossEncounter&&!['opening','battle'].includes(adventure.snapshot.bossEncounter.phase))return 'floor01';
  if(adventure.snapshot.bossEncounter?.phase==='opening'&&adventureAreaAt(adventure.x,adventure.y)?.id==='boss')return 'boss';
  const area=adventure.floor===1?adventureAreaAt(adventure.x,adventure.y):undefined;
  const fighting=adventure.snapshot.enemies.some(enemy=>{
    if(!enemy.boss||enemy.hp<=0)return false;
    const spawn=ADVENTURE_MONSTERS.find(candidate=>candidate.id===enemy.id);
    const bossArea=adventure.floor===1?adventureAreaAt(spawn?.x??enemy.x,spawn?.y??enemy.y):undefined;
    return bossArea?area?.id===bossArea.id:Math.abs(adventure.x-enemy.x)+Math.abs(adventure.y-enemy.y)<=8;
  });
  return fighting?'boss':'floor01';
}
