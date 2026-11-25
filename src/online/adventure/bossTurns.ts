import type {AdventureSnapshot} from './types';

export function bossTurnLabel(turn:NonNullable<AdventureSnapshot['turn']>,selected:boolean,now:number){
 const clock=turn.deadline>0?`あと${Math.max(0,(turn.deadline-now)/1000).toFixed(1)}秒`:'行動を選んでください';
 return `共通ターン ${turn.number} · ${turn.ready??0}/${turn.participants??1}人が選択 · ${clock}\n${selected?'選択済み · 確定まで変更できます':'移動・攻撃・道具から1手 · 未入力は待機'}`;
}
