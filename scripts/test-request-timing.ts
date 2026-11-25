import assert from 'node:assert/strict';import {boundedRequest,recordRequest,recentRequestTimings}from '../src/online/requestTiming';
assert.equal(await boundedRequest(async()=>42,100),42);let aborted=false;
await assert.rejects(boundedRequest(signal=>{signal.addEventListener('abort',()=>aborted=true);return new Promise(()=>{});},5),/状態を再確認/);assert(aborted);
await assert.rejects(boundedRequest(async()=>{throw Error('failure');},100),/failure/);
for(let i=0;i<105;i++)recordRequest('move',i,'ok');const rows=recentRequestTimings();assert.equal(rows.length,100);rows[0].action='changed';assert.equal(recentRequestTimings()[0].action,'move');assert.deepEqual(Object.keys(rows[0]).sort(),['action','at','ms','status']);
console.log('PASS bounded network wait, abort, errors, 100-entry metadata-only diagnostic ring');
