import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const git=(args,cwd=root)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
const expected='https://github.com/charizard0711/chari-dungeon-new-world.git';
if(git(['remote','get-url','origin'])!==expected)throw Error('Wrong repository; refusing to deploy');
if(!process.argv.includes('--built'))execFileSync(process.platform==='win32'?'npm.cmd':'npm',['run','build'],{cwd:root,stdio:'inherit',shell:process.platform==='win32'});
const target=path.join(root,'tmp',`pages-${Date.now()}`);
fs.mkdirSync(path.dirname(target),{recursive:true});
const remoteBranches=git(['ls-remote','--heads','origin','gh-pages']);
if(remoteBranches){git(['fetch','origin','gh-pages']);git(['worktree','add','--detach',target,'origin/gh-pages']);}
else{git(['worktree','add','--detach',target,'HEAD']);git(['checkout','--orphan','gh-pages'],target);}
// Verify every removal stays inside this purpose-built publication worktree.
const resolved=fs.realpathSync(target);
if(!resolved.startsWith(fs.realpathSync(path.join(root,'tmp'))+path.sep))throw Error('Unexpected publication directory');
for(const entry of fs.readdirSync(target)){if(entry==='.git')continue;const file=path.resolve(target,entry);if(path.dirname(file)!==path.resolve(target))throw Error('Invalid release path');fs.rmSync(file,{recursive:true,force:true});}
fs.cpSync(path.join(root,'dist'),target,{recursive:true});
fs.writeFileSync(path.join(target,'.nojekyll'),'');
fs.writeFileSync(path.join(target,'new-world-release.json'),JSON.stringify({name:'Chari Dungeon: ZERO',source:git(['rev-parse','HEAD']),builtAt:new Date().toISOString(),mode:'online-only'},null,2)+'\n');
git(['add','-A'],target);
if(!git(['diff','--cached','--name-only'],target)){console.log('No deployment changes');process.exit(0);}
git(['commit','-m','Publish Chari Dungeon: ZERO'],target);
console.log(git(['push','origin','HEAD:gh-pages'],target));
console.log('Published branch commit: '+git(['rev-parse','HEAD'],target));
