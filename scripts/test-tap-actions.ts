import assert from 'node:assert/strict';import {startTapAction,advanceTapAction,withinTapReach} from '../src/online/tapActions';
let count=0;const scene:any={player:{x:0,y:0},hud:{overlayMode:'none'},stopClickPath(){this.destination=undefined;this.tapTarget=undefined;},blocked:()=>false,enemyAt:()=>false,occupiedByOther:()=>false,pathStep:()=> 'right',log:()=>{}};
startTapAction(scene,{x:5,y:0,reach:1,aligned:true,run:()=>count++});assert.equal(count,0);assert.ok(scene.destination);scene.player={x:4,y:0};advanceTapAction(scene);assert.equal(count,1);advanceTapAction(scene);assert.equal(count,1);
assert.equal(withinTapReach({x:1,y:1},{x:0,y:0,reach:3,aligned:true,run(){}}),false);
scene.player={x:0,y:0};startTapAction(scene,{x:5,y:0,reach:2,run:()=>count++});scene.stopClickPath();scene.player={x:4,y:0};advanceTapAction(scene);assert.equal(count,1);
scene.blocked=()=>true;scene.player={x:0,y:0};startTapAction(scene,{x:5,y:0,reach:1,run:()=>count++});assert.equal(scene.tapTarget,undefined);
console.log('PASS tap approaches before action, triggers exactly once, aligned weapon range, cancellation and unreachable target.');
