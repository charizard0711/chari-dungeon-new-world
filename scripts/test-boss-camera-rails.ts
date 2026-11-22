import assert from 'node:assert/strict';
import {onlineCameraFollow} from '../src/online/cameraFollow';
import {railTilePath} from '../src/online/adventure/railGeometry';
let starts=0,stops=0;const camera:any={removeBounds(){},startFollow(){starts++},stopFollow(){stops++},setDeadzone(){}};
const follow=onlineCameraFollow(camera,true),actor:any={};follow.follow(actor);follow.follow(actor);assert.equal(starts,1);follow.stop();follow.follow(actor);assert.equal(starts,2);assert.equal(stops,1);
const expected=[[[0,24],[48,24]],[[24,0],[24,48]],[[24,0],[48,24]],[[24,48],[48,24]],[[24,48],[0,24]],[[24,0],[0,24]]];
for(let f=0;f<6;f++){const path=railTilePath(f);for(const [i,p]of [path[0],path.at(-1)!].entries()){assert(Math.abs(p.x-expected[f][i][0])<1e-8);assert(Math.abs(p.y-expected[f][i][1])<1e-8);}for(const p of path)assert(p.x>=-1e-8&&p.x<=48+1e-8&&p.y>=-1e-8&&p.y<=48+1e-8);}
console.log('PASS camera resumes same actor after cinematic; all six rail tiles share matching edge centres');
