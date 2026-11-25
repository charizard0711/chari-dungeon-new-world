import fs from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
for(const path of ['index.html','maze-check.html','qa/character-flow.html']){
 const html=await fs.readFile(path,'utf8'),script=html.match(/<script>\s*(\/\/ Match the default game bounds[\s\S]*?)<\/script>/)[1];
 assert(html.indexOf('id="game-container"')<html.indexOf('id="loading-screen"'),'loading belongs inside the game frame');
 for(const [width,height,search,touch,expected]of [
  [1600,900,'',0,[1515.7894736842106,900]],
  [800,600,'',0,[800,475]],
  [390,844,'',1,[390,844]],
  [1600,900,'?mobile=1',0,[390,844]],
  [390,844,'?mobile=0',1,[390,231.5625]],
 ]){
  const vars={};vm.runInNewContext(script,{URLSearchParams,location:{search},innerWidth:width,innerHeight:height,window:{},navigator:{maxTouchPoints:touch},document:{documentElement:{style:{setProperty:(k,v)=>vars[k]=parseFloat(v)}}}});
  assert(Math.abs(vars['--initial-game-width']-expected[0])<.01,path+' initial width');assert(Math.abs(vars['--initial-game-height']-expected[1])<.01,path+' initial height');
 }
}
console.log('PASS boot bounds before bundle load: desktop, constrained window, phone and forced layout modes across all three entry pages.');
