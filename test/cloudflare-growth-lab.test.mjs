import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet} from '../functions/api/growth-lab/readiness.js';
const req=new Request('https://test.witnesslema.com/api/growth-lab/readiness');
const env={GROWTH_LAB_MODE:'test',SEO_INDEXING_ENABLED:'false',SEO_SITE_ORIGIN:'https://test.witnesslema.com',
 SUPABASE_URL:'https://qyydipskdsfbcqgqnjoi.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_dummy_test_key_123456'};
const oldFetch=globalThis.fetch;
test('test-only readiness never reveals keys and labels Google data unavailable',async()=>{
 globalThis.fetch=async()=>Response.json([{id:'main'}]);
 try{
  const res=await onRequestGet({request:req,env});
  const data=await res.json();
  assert.equal(res.status,200);
  assert.equal(data.mode,'test');
  assert.equal(data.checks.length,3);
  assert.equal(data.checks.every(c=>c.ok),true);
  assert.equal(data.googleSearchConsole.status,'not_connected');
  assert.equal(data.geographicRanks.paidRequests,0);
  assert.doesNotMatch(JSON.stringify(data),/sb_publishable_|SUPABASE_URL|Bearer /);
 }finally{globalThis.fetch=oldFetch;}
});
test('production and wrongly configured environments are rejected or fail closed',async()=>{
 const p=await onRequestGet({request:req,env:{...env,GROWTH_LAB_MODE:'production'}});
 assert.equal(p.status,404);
 const bad=await onRequestGet({request:req,env:{...env,SEO_INDEXING_ENABLED:'true',SUPABASE_URL:'https://yebbfjemvvtenpzrrhno.supabase.co'}});
 const body=await bad.json();
 assert.equal(body.checks[0].ok,false);
 assert.equal(body.checks[1].ok,false);
});
