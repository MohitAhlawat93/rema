import test from 'node:test';
import assert from 'node:assert/strict';
import monitor from '../workers/lema-search-health.mjs';

const html=(indexable=false)=>'<html><head><title>Witness Lema test page</title>'+
  (indexable?'':'<meta name="robots" content="noindex, nofollow">')+
  '<meta name="description" content="A complete representative staging page description."></head><body><h1>Test page</h1></body></html>';
const responseFor=(path,shouldFail=false)=>{
  if(path==='/robots.txt')return new Response('User-agent: *\nDisallow: /',{status:200});
  if(path==='/sitemap.xml')return new Response('<?xml version="1.0"?><urlset></urlset>',{status:200});
  return new Response(html(shouldFail&&path==='/about/'),{status:200});
};
function fakeKV(){
  const data=new Map();
  return {get:async key=>JSON.parse(data.get(key)||'null'),put:async(key,value)=>{data.set(key,value);}};
}
async function mockFetch(callback,run){
  const original=globalThis.fetch;
  globalThis.fetch=(url,options)=>callback(new URL(url).pathname,options);
  try{return await run();}finally{globalThis.fetch=original;}
}
test('initial status checks ten routes and caches subsequent reads',async()=>{
  const kv=fakeKV();
  let calls=0;
  await mockFetch(path=>{calls++;return Promise.resolve(responseFor(path));},async()=>{
    const r=await monitor.fetch(new Request('https://monitor.example/status'),{HEALTH_KV:kv});
    assert.equal(r.status,200);
    const body=await r.json();
    assert.equal(body.status,'healthy');
    assert.equal(body.checked,10);
    assert.equal(body.indexingExpected,false);
    assert.equal(body.googleIndexed,'unknown');
    assert.equal(calls,10);
    const again=await monitor.fetch(new Request('https://monitor.example/status'),{HEALTH_KV:kv});
    assert.equal(again.status,200);
    assert.equal(calls,10);
    assert.match(again.headers.get('x-robots-tag'),/noindex/);
  });
});
test('detects accidental indexing on staging',async()=>{
  await mockFetch(path=>Promise.resolve(responseFor(path,true)),async()=>{
    const r=await monitor.fetch(new Request('https://monitor.example/'),{HEALTH_KV:fakeKV()});
    const body=await r.json();
    assert.equal(body.status,'action_needed');
    assert.ok(body.checks.find(c=>c.path==='/about/').issues.includes('STAGING_NOINDEX_MISSING'));
  });
});
test('refuses URL selection, POST, and missing storage',async()=>{
  const env={HEALTH_KV:fakeKV()};
  const invalid=await monitor.fetch(new Request('https://monitor.example/probe?url=https://example.org'),env);
  assert.equal(invalid.status,404);
  const post=await monitor.fetch(new Request('https://monitor.example/status',{method:'POST'}),env);
  assert.equal(post.status,405);
  const missing=await monitor.fetch(new Request('https://monitor.example/status'),{});
  assert.equal(missing.status,503);
});
test('scheduled invocation persists latest report',async()=>{
  const kv=fakeKV(),pending=[];
  await mockFetch(path=>Promise.resolve(responseFor(path)),async()=>{
    await monitor.scheduled({scheduledTime:Date.now()},{HEALTH_KV:kv},{waitUntil:p=>pending.push(p)});
    await Promise.all(pending);
    assert.equal((await kv.get('latest')).status,'healthy');
  });
});


test('human dashboard is readable, noindex, and does not claim Google rankings',async()=>{
  const kv=fakeKV();
  await mockFetch(path=>Promise.resolve(responseFor(path)),async()=>{
    const response=await monitor.fetch(new Request('https://monitor.example/dashboard'),{HEALTH_KV:kv});
    assert.equal(response.status,200);
    assert.match(response.headers.get('content-type'),/text\/html/);
    assert.match(response.headers.get('x-robots-tag'),/noindex/);
    const page=await response.text();
    assert.match(page,/<h1>Website health<\/h1>/);
    assert.match(page,/Checks by page/);
    assert.match(page,/not Google ranking data/);
    assert.match(page,/Search Console: Not yet verified/);
    assert.match(page,/<td><code>\/privacy\/<\/code><\/td>/);
  });
});
