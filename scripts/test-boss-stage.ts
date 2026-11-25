import assert from 'node:assert/strict';
import {bossStage,inStage,BOARDING_PANELS} from '../src/online/adventure/stage';
import {predictedWorld} from '../src/online/responsiveness';
const packet:any={active:{id:'a'},players:[{character_id:'a',x:49,y:23,dir:'up'}],adventure:{inside:true,floor:1,x:49,y:23,snapshot:{}}};
assert.equal(bossStage(packet.adventure),false);
// A predicted crossing must not restart the scene before the server accepts the move.
const predicted=predictedWorld(packet,[{x:49,y:22}]);assert.equal(bossStage(predicted.adventure),false);
assert.equal(bossStage({...packet.adventure,y:22}),true);
assert.equal(bossStage({...packet.adventure,y:22,floor:2}),false);
assert.equal(bossStage({...packet.adventure,y:22,inside:false}),false);
assert.equal(inStage(true,49,16),true);assert.equal(inStage(true,54,29),false);
assert.equal(inStage(false,49,16),false);assert.equal(inStage(false,54,29),true);
assert.deepEqual(BOARDING_PANELS.map(p=>[p.x,p.y]),[[51,101],[102,16]]);
console.log('Boss scene boundary, authoritative movement and boarding pads: passed');
