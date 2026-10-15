import test from 'node:test';
import assert from 'node:assert/strict';
import health from '../workers/lema-main-health.mjs';
const kv=()=>{const db=new Map();return {get:async key=>JSON.parse(db.get(key)||'null'),put:async(k,v)=>db.set(k,v)}};
const oldFetch=globalThis.fetch;
function stub(url){
 const p=new URL(url).pathname;
 if(p==='/robots.txt')return Promise.resolve(new Response('User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://witnesslema.com/sitemap.xml\n'));
 if(p==='/sitemap.xml')return Promise.resolve(new Response('<?xml version="1.0"?><urlset>'+['/','/about/','/gallery/','/services/','/contact/','/reviews/'].map(u=>'<url><loc>https://witnesslema.com'+u+'</loc></url>').join('')+'</urlset>'));
 const meta=['/privacy/','/admin'].includes(p)?'<meta name="robots" content="noindex">':'<meta name="robots" content="index, follow">';
 return Promise.resolve(new Response('<html><head><title>Witness Lema</title>'+meta+'<meta name="description" content="A real private website."><link rel="canonical" href="https://witnesslema.com'+p+'"></head><body><h1>Website</h1></body></html>'));
}
test('monitor is honest about Google indexing, and checks six indexable pages',async()=>{
 globalThis.fetch=stub;
 try{
  const r=await health.fetch(new Request('https://health.example/status'),{HEALTH_KV:kv()});
  const data=await r.json();
  assert.equal(data.status,'healthy');
  assert.equal(data.failures,0);
  assert.equal(data.indexingExpected,true);
  assert.equal(data.googleIndexed,'unknown');
  assert.equal(data.searchConsoleConnected,'unverified');
 }finally{globalThis.fetch=oldFetch;}
});
test('monitor detects noindex on the real homepage',async()=>{
 globalThis.fetch=url=>{
  const p=new URL(url).pathname;
  if(p!=='/')return stub(url);
  return Promise.resolve(new Response('<title>Website</title><meta name="robots" content="noindex"><h1>Hello</h1>'));
 };
 try{
  const r=await health.fetch(new Request('https://health.example/status'),{HEALTH_KV:kv()});
  const d=await r.json();
  assert.equal(d.status,'action_needed');
  assert.ok(d.checks.find(x=>x.path==='/').issues.includes('MAIN_NOINDEX_PRESENT'));
 }finally{globalThis.fetch=oldFetch;}
});
