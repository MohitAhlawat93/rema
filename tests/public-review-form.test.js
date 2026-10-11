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
  assert.match(moderation,/createHash\('sha256'\)/);
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
