import test from 'node:test';
import assert from 'node:assert/strict';
import {withTimeBudget} from '../lib/workers-ai-fallback.js';
test('AI backup gives a quick response when available',async()=>{
 const out=await withTimeBudget(Promise.resolve('working'),300);
 assert.equal(out,'working');
});
test('slow AI fallback cannot indefinitely block an answer',async()=>{
 const start=Date.now();
 await assert.rejects(()=>withTimeBudget(new Promise(()=>{}),120),error=>error.name==='TimeoutError');
 assert.ok(Date.now()-start<1000);
});
