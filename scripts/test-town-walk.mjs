import fs from 'node:fs/promises';
import ts from 'typescript';
import assert from 'node:assert/strict';
const framesCode=ts.transpileModule(await fs.readFile('src/playerWalkFrames.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const framesUrl=`data:text/javascript;base64,${Buffer.from(framesCode).toString('base64')}`;
const code=ts.transpileModule(await fs.readFile('src/online/walkPose.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText.replace('../playerWalkFrames',framesUrl);
const {townWalkPose,TOWN_STEP_MS}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
assert.equal(TOWN_STEP_MS,152);
const stride=48*600/TOWN_STEP_MS;
for(const dir of ['up','down','left','right']){
 const phases=new Set();
 for(let ms=0;ms<600;ms+=5){const pose=townWalkPose(ms*48/TOWN_STEP_MS,1,dir);phases.add(Math.floor((pose.phase+1e-8)*8));assert.equal(pose.bob,0);assert.equal(pose.sway,0);assert.equal(pose.angle,0);}
 assert.equal(phases.size,8);
 const start=townWalkPose(17,1,dir),cycle=townWalkPose(17+stride,1,dir);assert.ok(Math.abs(start.phase-cycle.phase)<1e-9);
}
console.log('PASS: slightly faster 152ms steps, 600ms continuous eight-pose gait, no extra body distortion');

const bubbleCode=ts.transpileModule(await fs.readFile('src/online/chatBubble.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;const {chatBubbleText}=await import(`data:text/javascript;base64,${Buffer.from(bubbleCode).toString('base64')}`);assert.equal(chatBubbleText('  hello\n town  '),'hello town');assert.equal(chatBubbleText('あ'.repeat(50)),'あ'.repeat(32)+'…');assert.equal(chatBubbleText('😀'.repeat(33)),'😀'.repeat(32)+'…');console.log('PASS: chat bubble whitespace, Japanese truncation and emoji-safe code points');

const layoutCode=ts.transpileModule((await fs.readFile('src/online/housingCatalog.ts','utf8'))+'\n'+(await fs.readFile('src/online/townLayout.ts','utf8')).replace(/^import .*;\r?$/gm,''),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const layoutUrl=`data:text/javascript;base64,${Buffer.from(layoutCode).toString('base64')}`;
const pathCode=ts.transpileModule(await fs.readFile('src/online/gridPath.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText.replace('./townLayout',layoutUrl);
const {townPath}=await import(`data:text/javascript;base64,${Buffer.from(pathCode).toString('base64')}`),{townBlocked}=await import(layoutUrl);
const start={x:12,y:14},end={x:12,y:6},busy=[{x:12,y:13},{x:11,y:13}];let previous=start;const route=townPath(start,end,busy);assert.ok(route.length);for(const cell of route){assert.equal(Math.abs(cell.x-previous.x)+Math.abs(cell.y-previous.y),1);assert.equal(townBlocked(cell.x,cell.y),false);assert.equal(busy.some(p=>p.x===cell.x&&p.y===cell.y),false);previous=cell;}assert.deepEqual(previous,end);assert.deepEqual(townPath(start,busy[0],busy),[]);assert.deepEqual(townPath(start,start),[]);console.log('PASS: cardinal single-cell routes, prop/player avoidance, occupied destination and stationary route');
