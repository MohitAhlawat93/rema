import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDomains,probe} from '../scripts/cloudflare-domains-preflight.mjs';
const base=(url,status=200,index=true)=>new Response('<html><head><meta name="robots" content="'+
 (index?'noindex, nofollow':'index,follow')+
 '"><link rel="canonical" href="'+(url.includes('production.pages.dev')?'https://witnesslema.com/':url+'/')+'"></head></html>',
 {status});
test('prelaunch sites are all required to stay noindex',async()=>{
 const good=await checkDomains(async url=>base(new URL(url).origin));
 assert.equal(good.pass,true);
 assert.equal(good.checks.length,4);
});
test('candidate with noindex disabled fails the launch gate',async()=>{
 const site={name:'candidate',url:'https://lema-website-production.pages.dev',kind:'candidate'};
 const x=await probe(site,async url=>base(new URL(url).origin,200,false));
 assert.equal(x.pass,false);
 assert.ok(x.issues.includes('INDEXING_NOT_BLOCKED'));
});
test('candidate must point canonically at main domain',async()=>{
 const x=await probe({name:'candidate',url:'https://example.com',kind:'candidate'},
  async()=>new Response('<meta name="robots" content="noindex">'));
 assert.ok(x.issues.includes('CANDIDATE_CANONICAL_NOT_READY'));
});
