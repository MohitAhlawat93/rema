import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/assistant.js';

function responseCapture(){
  let data;
  const response={
    statusCode:200,
    headers:{},
    setHeader(name,value){this.headers[name]=value;},
    end(text){data=JSON.parse(text);}
  };
  return {response,get data(){return data;}};
}
async function chat(question){
  const capture=responseCapture();
  await handler({method:'POST',body:{question,language:'en'},headers:{'x-forwarded-for':'127.0.0.1'}},capture.response);
  return {status:capture.response.statusCode,body:capture.data};
}

test('greetings answer without depending on Supabase or AI latency',async()=>{
  const previous=globalThis.fetch;
  let networkCalls=0;
  globalThis.fetch=async()=>{networkCalls++;throw new Error('Remote services unavailable');};
  try{
    const start=performance.now();
    const result=await chat('hello');
    assert.equal(result.status,200);
    assert.match(result.body.answer,/Hello/i);
    assert.equal(networkCalls,0);
    assert.ok(performance.now()-start<800,'Local greeting should be immediate');
    const natural=await chat('How are you?');
    assert.equal(natural.status,200);
    assert.match(natural.body.answer,/doing well/i);
    assert.equal(networkCalls,0);
  }finally{globalThis.fetch=previous;}
});

test('exact published answers return directly and reuse short-lived public-data cache',async()=>{
 const previousFetch=globalThis.fetch;
 const previousEnv={
   SUPABASE_URL:process.env.SUPABASE_URL,
   SUPABASE_PUBLISHABLE_KEY:process.env.SUPABASE_PUBLISHABLE_KEY,
   WITNESS_LEMA_INTERNAL_SECRET:process.env.WITNESS_LEMA_INTERNAL_SECRET
 };
 process.env.SUPABASE_URL='https://test.supabase.co';
 process.env.SUPABASE_PUBLISHABLE_KEY='public-test-key';
 process.env.WITNESS_LEMA_INTERNAL_SECRET='x'.repeat(36);
 const calls={knowledge:0,profile:0,ai:0,rate:0};
 globalThis.fetch=async input=>{
   const url=String(input);
   const ok=body=>({ok:true,json:async()=>body});
   if(url.includes('/functions/v1/witness-lema-admin')){calls.rate++;return ok({allowed:true});}
   if(url.includes('witness_lema_knowledge?')){calls.knowledge++;return ok([{question:'How can I contact Lema?',answer:'Use the official Contact page.',href:'/contact/'}]);}
   if(url.includes('search_witness_lema_knowledge'))return ok([]);
   if(url.includes('witness_lema_published_site?')){calls.profile++;return ok([{payload:{}}]);}
   calls.ai++;
   throw Error('Unexpected AI call '+url);
 };
 try{
   const first=await chat('How can I contact Lema?');
   const second=await chat('How can I contact Lema?');
   for(const r of [first,second]){
     assert.equal(r.status,200);
     assert.equal(r.body.answer,'Use the official Contact page.');
     assert.equal(r.body.href,'/contact/');
   }
   assert.equal(calls.ai,0,'Exact approved answers must avoid external AI latency');
   assert.equal(calls.knowledge,1,'Reuse public knowledge cache on warm function');
   assert.equal(calls.profile,1,'Reuse short-lived published profile cache');
   assert.equal(calls.rate,2,'Costly requests remain rate-limited');
 }finally{
   globalThis.fetch=previousFetch;
   for(const [key,value] of Object.entries(previousEnv)){
     if(value===undefined)delete process.env[key];else process.env[key]=value;
   }
 }
});
