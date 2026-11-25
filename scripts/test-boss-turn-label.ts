import assert from 'node:assert/strict';
import {bossTurnLabel} from '../src/online/adventure/bossTurns';
assert.match(bossTurnLabel({number:1,deadline:0,durationMs:1800,ready:0,participants:4},false,2000),/0\/4人が選択 · 行動を選んでください/);
assert.match(bossTurnLabel({number:2,deadline:3000,durationMs:1800,ready:3,participants:4},true,2200),/あと0.8秒\n選択済み/);
assert.match(bossTurnLabel({number:2,deadline:3000,durationMs:1800},false,3200),/あと0.0秒/);
console.log('PASS boss turn readiness, idle prompt and synchronized countdown labels');
