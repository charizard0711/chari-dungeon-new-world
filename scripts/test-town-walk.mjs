import fs from 'node:fs/promises';
import ts from 'typescript';
import assert from 'node:assert/strict';
const framesCode=ts.transpileModule(await fs.readFile('src/playerWalkFrames.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const framesUrl=`data:text/javascript;base64,${Buffer.from(framesCode).toString('base64')}`;
const code=ts.transpileModule(await fs.readFile('src/online/walkPose.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText.replace('../playerWalkFrames',framesUrl);
const {townWalkPose,TOWN_STEP_MS}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
assert.equal(TOWN_STEP_MS,150);
const poses=Array.from({length:96},(_,distance)=>townWalkPose(distance,1,'down'));
assert.equal(new Set(poses.map(p=>p.frame)).size,18);
assert.ok(Math.min(...poses.map(p=>p.bob))<-2.5);
assert.ok(Math.max(...poses.map(p=>p.bob))>-.01);
assert.ok(poses.some(p=>p.leftFoot>p.rightFoot));assert.ok(poses.some(p=>p.rightFoot>p.leftFoot));
for(const dir of ['up','down','left','right']){
 const rest=townWalkPose(37,0,dir);assert.equal(Math.abs(rest.bob),0);assert.equal(Math.abs(rest.sway),0);assert.equal(Math.abs(rest.angle),0);
 const cycle=townWalkPose(17+96,1,dir),start=townWalkPose(17,1,dir);assert.equal(cycle.frame,start.frame);assert.ok(Math.abs(cycle.bob-start.bob)<1e-9);
}
assert.equal(townWalkPose(48,1,'down').frame,'walk10');
assert.ok(townWalkPose(0,1,'left').angle<0);assert.ok(townWalkPose(0,1,'right').angle>0);
console.log('PASS: eighteen distance-driven poses, unchanged step speed/stride, foot alternation, body lift, directional lean, neutral rest and continuous stride');

const bubbleCode=ts.transpileModule(await fs.readFile('src/online/chatBubble.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;const {chatBubbleText}=await import(`data:text/javascript;base64,${Buffer.from(bubbleCode).toString('base64')}`);assert.equal(chatBubbleText('  hello\n town  '),'hello town');assert.equal(chatBubbleText('あ'.repeat(50)),'あ'.repeat(32)+'…');assert.equal(chatBubbleText('😀'.repeat(33)),'😀'.repeat(32)+'…');console.log('PASS: chat bubble whitespace, Japanese truncation and emoji-safe code points');

const layoutCode=ts.transpileModule((await fs.readFile('src/online/housingCatalog.ts','utf8'))+'\n'+(await fs.readFile('src/online/townLayout.ts','utf8')).replace(/^import .*;\r?$/gm,''),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const layoutUrl=`data:text/javascript;base64,${Buffer.from(layoutCode).toString('base64')}`;
const pathCode=ts.transpileModule(await fs.readFile('src/online/gridPath.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText.replace('./townLayout',layoutUrl);
const {townPath}=await import(`data:text/javascript;base64,${Buffer.from(pathCode).toString('base64')}`),{townBlocked}=await import(layoutUrl);
const start={x:12,y:14},end={x:12,y:6},busy=[{x:12,y:13},{x:11,y:13}];let previous=start;const route=townPath(start,end,busy);assert.ok(route.length);for(const cell of route){assert.equal(Math.abs(cell.x-previous.x)+Math.abs(cell.y-previous.y),1);assert.equal(townBlocked(cell.x,cell.y),false);assert.equal(busy.some(p=>p.x===cell.x&&p.y===cell.y),false);previous=cell;}assert.deepEqual(previous,end);assert.deepEqual(townPath(start,busy[0],busy),[]);assert.deepEqual(townPath(start,start),[]);console.log('PASS: cardinal single-cell routes, prop/player avoidance, occupied destination and stationary route');
