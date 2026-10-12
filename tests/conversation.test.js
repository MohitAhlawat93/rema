import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {interpretQuestion,verifiedFactAnswer,ownerName} from '../lib/assistant-facts.js';
import {site} from '../data/site.js';
test('English conversation recognizes owner and assistant role naturally',()=>{
 assert.equal(ownerName(site),'Lema');
 assert.match(verifiedFactAnswer('who is your boss?',site).answer,/Lema/);
 assert.equal(interpretQuestion('whose websits is it?').kind,'identity');
 assert.match(verifiedFactAnswer('and what you do for her?',site).answer,/help visitors/i);
});
test('availability is never invented',()=>{
 assert.match(verifiedFactAnswer('is she available tomorrow?',site).answer,/cannot view live availability/i);
});
test('unverified sensitive claims are not asserted',()=>{
 const result=verifiedFactAnswer('does she do threesome?',site);
 assert.equal(result.needsReview,true);
 assert.match(result.answer,/cannot confirm/i);
});
test('frontend keeps an auto popup, English-only UI and reviews',async()=>{
 const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const build=await readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8');
 assert.match(app,/lema-concierge-first-visit-v3/);
 assert.match(app,/setAssistant\(true,false\)/);
 assert.doesNotMatch(build,/Hinglish|हिंदी|assistant-language/);
 assert.match(build,/['"]\/reviews\/['"]/);
 assert.match(build,/data-public-reviews/);
});
