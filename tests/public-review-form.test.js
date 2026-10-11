import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
test('public form and API automatically publish visitor reviews with consent and rate limits',async()=>{
 const [build,app,api]=await Promise.all([read('../scripts/build.mjs'),read('../public/app.js'),read('../api/reviews.js')]);
 assert.match(build,/id="review-form"/);
 for(const control of ['author','language','text','consent'])assert.ok(build.includes('name="'+control+'"'));
 assert.ok(build.includes('published immediately'));
 assert.ok(app.includes('Your review is published and visible on this page.'));
 assert.ok(api.includes('Review published.'));
 assert.ok(api.includes("consumeRateLimit(req,'review-submit',3,3600)"));
 assert.ok(api.includes('raw.consent!==true'));
 assert.ok(api.includes("if(req.method==='GET')"));
 assert.ok(!api.includes('Review received for approval.'));
});
test('owner can add or delete reviews immediately without republishing website',async()=>{
 const [html,ui,admin,edge,inbox]=await Promise.all([
  read('../public/admin.html'),read('../public/admin.js'),read('../api/admin/[route].js'),
  read('../supabase/functions/witness-lema-admin/index.ts'),read('../lib/review-inbox.js')
 ]);
 for(const s of ['data-admin-review-form','data-reviews-editor','data-review-refresh','data-review-cancel'])assert.ok(html.includes(s));
 for(const s of ['async function addLiveReview','Review published immediately','Review deleted from the live website',"method:'DELETE'"])assert.ok(ui.includes(s),s);
 assert.ok(admin.includes("body.action!=='add'"));
 assert.ok(admin.includes("req.method==='DELETE'"));
 assert.ok(edge.includes("['submit','list','delete']"));
 assert.ok(inbox.includes("['submit','list','delete']"));
});
test('database safeguards and SQL knowledge repair',async()=>{
 const [migration,previous]=await Promise.all([
  read('../supabase/migrations/20261011130000_fix_knowledge_open_reviews.sql'),
  read('../supabase/migrations/20261011100000_review_inbox_service_only.sql')
 ]);
 for(const s of ['ROWS FROM (','WITH ORDINALITY AS x','review-submit',
   'witness_lema_public_reviews','FOR SELECT TO anon,authenticated',
   'REVOKE ALL ON TABLE public.witness_lema_public_reviews FROM public,anon,authenticated',
   'REVOKE ALL ON FUNCTION public.witness_lema_review_inbox(text,text,jsonb)'])assert.ok(migration.includes(s),s);
 assert.ok(migration.includes('TO service_role;'));
 assert.ok(previous.includes('from public, anon, authenticated;'));
});
test('review API rejects invalid reviews and accepts honeypot safely',async()=>{
 const {default:handler}=await import('../api/reviews.js');
 const request=body=>({method:'POST',body,headers:{}});
 const reply=()=>({statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(value){this.body=JSON.parse(value);}});
 const base={author:'Guest',text:'I had a meaningful experience and wanted to share feedback.',language:'en',consent:true};
 const noConsent=reply();await handler(request({...base,consent:false}),noConsent);
 assert.equal(noConsent.statusCode,400);
 const short=reply();await handler(request({...base,text:'Short'}),short);
 assert.equal(short.statusCode,400);
 const honeypot=reply();await handler(request({...base,website:'spam'}),honeypot);
 assert.equal(honeypot.statusCode,200);
 const wrong=reply();await handler({method:'DELETE',headers:{}},wrong);
 assert.equal(wrong.statusCode,405);
});
test('owner review delete uses server secret and public roles cannot call privileged RPC',async()=>{
 const {reviewInbox}=await import('../lib/review-inbox.js');
 const prevUrl=process.env.SUPABASE_URL,prevSecret=process.env.WITNESS_LEMA_INTERNAL_SECRET,originalFetch=globalThis.fetch;
 process.env.SUPABASE_URL='https://example.supabase.co';
 process.env.WITNESS_LEMA_INTERNAL_SECRET='example-test-secret-is-long-enough-1234';
 const calls=[];
 globalThis.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({ok:true})};};
 try{
   await reviewInbox('delete',{id:9});
   assert.equal(calls.length,1);
   assert.equal(calls[0].url,'https://example.supabase.co/functions/v1/witness-lema-admin');
   assert.equal(calls[0].options.headers['x-admin-secret'],process.env.WITNESS_LEMA_INTERNAL_SECRET);
   assert.deepEqual(JSON.parse(calls[0].options.body),{
     action:'review-inbox',body:{reviewAction:'delete',payload:{id:9}},reviewAction:'delete',payload:{id:9}
   });
   await assert.rejects(()=>reviewInbox('resolve'),/Unknown review action/);
   assert.equal(calls.length,1);
 }finally{
   globalThis.fetch=originalFetch;
   if(prevUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=prevUrl;
   if(prevSecret===undefined)delete process.env.WITNESS_LEMA_INTERNAL_SECRET;else process.env.WITNESS_LEMA_INTERNAL_SECRET=prevSecret;
 }
});
