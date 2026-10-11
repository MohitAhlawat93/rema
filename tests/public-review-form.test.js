import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
test('public Reviews page contains accessible submission controls',async()=>{
  const [build,app]=await Promise.all([read('../scripts/build.mjs'),read('../public/app.js')]);
  assert.match(build,/id="review-form"/);
  assert.match(build,/name="author"/);
  assert.match(build,/name="language"/);
  assert.match(build,/name="text"/);
  assert.match(build,/name="consent" type="checkbox" required/);
  assert.match(app,/fetch\('\/api\/reviews'/);
  assert.match(app,/submitted for approval/);
});
test('review API enforces owner moderation and spam limits',async()=>{
  const [api,moderation,sql,admin]=await Promise.all([
    read('../api/reviews.js'),read('../lib/review-inbox.js'),
    read('../supabase/migrations/20261011060000_public_review_submission_moderation.sql'),
    read('../api/admin/[route].js')
  ]);
  assert.match(api,/raw\.consent!==true/);
  assert.match(api,/consumeRateLimit\(req,'review-submit',3,3600\)/);
  assert.ok(moderation.includes("callAdminBackend('review-inbox'"));
  const edge=await read('../supabase/functions/witness-lema-admin/index.ts');
  const migration=await read('../supabase/migrations/20261011100000_review_inbox_service_only.sql');
  assert.match(edge,/action==='review-inbox'/);
  assert.ok(edge.includes("rpc('witness_lema_review_inbox'"));
  assert.ok(migration.includes('from public, anon, authenticated;'));
  assert.ok(migration.includes('revoke execute on function public.witness_lema_review_inbox'));
  assert.match(sql,/enable row level security/);
  assert.match(sql,/revoke all on table witness_lema_private\.review_submissions from public, anon, authenticated/);
  assert.match(sql,/c\.secret_sha256=p_secret_sha256/);
  assert.match(admin,/if\(route==='review-inbox'\)/);
});
test('owner can see pending reviews and approve into unpublished draft',async()=>{
  const [admin,html]=await Promise.all([read('../public/admin.js'),read('../public/admin.html')]);
  assert.match(admin,/state\.draft\.reviews\.push/);
  assert.match(admin,/Click Publish website to show it publicly/);
  assert.match(admin,/async function loadPendingReviews/);
  assert.match(html,/data-review-submissions/);
});

test('public endpoint rejects incomplete submissions and returns no honeypot error',async()=>{
  const {default:handler}=await import('../api/reviews.js');
  const request=body=>({method:'POST',body,headers:{}});
  const reply=()=>({
    statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},
    end(value){this.body=JSON.parse(value);}
  });
  const noConsent=reply();
  await handler(request({author:'Guest',text:'I had a meaningful meeting and wanted to share my experience.',language:'en',consent:false}),noConsent);
  assert.equal(noConsent.statusCode,400);
  const tooShort=reply();
  await handler(request({author:'Guest',text:'Nice',language:'en',consent:true}),tooShort);
  assert.equal(tooShort.statusCode,400);
  const honeypot=reply();
  await handler(request({author:'Guest',text:'I had a meaningful meeting and wanted to share my experience.',language:'en',consent:true,website:'spam'}),honeypot);
  assert.equal(honeypot.statusCode,200);
});

test('review moderation is routed through authenticated server-side Edge Function',async()=>{
  const {reviewInbox}=await import('../lib/review-inbox.js');
  const prevUrl=process.env.SUPABASE_URL,prevSecret=process.env.WITNESS_LEMA_INTERNAL_SECRET,originalFetch=globalThis.fetch;
  process.env.SUPABASE_URL='https://example.supabase.co';
  process.env.WITNESS_LEMA_INTERNAL_SECRET='example-test-secret-is-long-enough-1234';
  const calls=[];
  globalThis.fetch=async(url,options)=>{
    calls.push({url,options});
    return {ok:true,json:async()=>({items:[]})};
  };
  try{
    const result=await reviewInbox('list');
    assert.deepEqual(result,{items:[]});
    assert.equal(calls.length,1);
    assert.equal(calls[0].url,'https://example.supabase.co/functions/v1/witness-lema-admin');
    assert.equal(calls[0].options.headers['x-admin-secret'],process.env.WITNESS_LEMA_INTERNAL_SECRET);
    assert.deepEqual(JSON.parse(calls[0].options.body),{
      action:'review-inbox',body:{reviewAction:'list',payload:{}},reviewAction:'list',payload:{}
    });
    await assert.rejects(()=>reviewInbox('unapproved-action'),/Unknown review action/);
    assert.equal(calls.length,1);
  }finally{
    globalThis.fetch=originalFetch;
    if(prevUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=prevUrl;
    if(prevSecret===undefined)delete process.env.WITNESS_LEMA_INTERNAL_SECRET;else process.env.WITNESS_LEMA_INTERNAL_SECRET=prevSecret;
  }
});
