import test from 'node:test';
import assert from 'node:assert/strict';
import {runLegacyHandler} from '../lib/cloudflare-http.js';
import middleware from '../middleware.js';

const ctx=(url='https://example.com/api/assistant',body='{}',headers={})=>({
  request:new Request(url,{method:'POST',body,headers:{'content-type':'application/json',...headers}}),
  env:{}
});
test('Cloudflare API bridge preserves JSON body, route and safe host',async()=>{
 const response=await runLegacyHandler(ctx('https://example.com/api/admin/state',
   JSON.stringify({test:1}),{'x-forwarded-for':'spoofed','cf-connecting-ip':'203.0.113.5'}),
   async(req,res)=>{
     assert.equal(req.headers.host,'example.com');
     assert.equal(req.headers['x-forwarded-for'],'203.0.113.5');
     assert.equal(req.query.route,'state');
     assert.equal(req.body.test,1);
     res.setHeader('content-type','application/json');
     res.statusCode=201;
     res.end(JSON.stringify({ok:true}));
   },'state');
 assert.equal(response.status,201);
 assert.deepEqual(await response.json(),{ok:true});
});
test('Cloudflare API bridge rejects invalid or oversized request JSON',async()=>{
 const handler=()=>{throw Error('must not reach handler');};
 assert.equal((await runLegacyHandler(ctx('https://example.com/api/x','{'),handler)).status,400);
 assert.equal((await runLegacyHandler(ctx('https://example.com/api/x','x'.repeat(600000)),handler)).status,413);
});
test('Cloudflare API bridge hides thrown secrets and fails closed',async()=>{
 const response=await runLegacyHandler(ctx(),async()=>{throw Error('token-private-secret');});
 assert.equal(response.status,503);
 assert.ok(!(await response.text()).includes('token-private-secret'));
});
test('Cloudflare SEO stage does not allow preview indexing',async()=>{
 const req=new Request('https://preview.example.com/about/');
 const assetFetch=async(url)=>new Response(new URL(url).pathname.endsWith('seo-defaults.json')?'{}':'<!doctype html><title>Preview</title>',{status:200});
 const result=await middleware(req,{env:{SEO_SITE_ORIGIN:'https://example.com',SEO_INDEXING_ENABLED:'false'},
   hosting:'cloudflare',assetFetch});
 assert.equal(result.status,200);
 assert.equal(result.headers.get('x-robots-tag'),'noindex, nofollow');
 assert.match(await result.text(),/Preview/);
});
