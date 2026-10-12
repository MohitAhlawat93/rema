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

test('vector-only FAQ uses Supabase vector endpoint, not legacy keyword search',async()=>{
 const previous=globalThis.fetch;
 const env={SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY:process.env.SUPABASE_PUBLISHABLE_KEY,
  WITNESS_LEMA_INTERNAL_SECRET:process.env.WITNESS_LEMA_INTERNAL_SECRET,GROQ_API_KEY:process.env.GROQ_API_KEY,XAI_API_KEY:process.env.XAI_API_KEY};
 process.env.SUPABASE_URL='https://test.supabase.co';
 process.env.SUPABASE_PUBLISHABLE_KEY='public-test-key';
 process.env.WITNESS_LEMA_INTERNAL_SECRET='x'.repeat(36);
 delete process.env.GROQ_API_KEY;delete process.env.XAI_API_KEY;
 let vector=0,legacy=0;
 const ok=body=>({ok:true,status:200,json:async()=>body});
 globalThis.fetch=async(url,options={})=>{
  url=String(url);
  if(url.includes('witness-lema-admin'))return ok({allowed:true});
  if(url.includes('/functions/v1/tenant-hybrid-rag')){
   vector++;assert.equal(JSON.parse(options.body).tenant,'witness-lema');
   return ok({mode:'vector',rows:[{question:'How can I contact her?',answer:'Use the Contact page.',href:'/contact/',score:.95,similarity:.95}]});
  }
  if(url.includes('witness_lema_published_site'))return ok([{payload:{}}]);
  if(url.includes('witness_lema_knowledge'))legacy++;
  throw Error('Unexpected legacy call '+url);
 };
 try{
  const result=await chat('How can I contact her?');
  assert.equal(result.status,200);
  assert.equal(result.body.source,'vector');
  assert.equal(result.body.rag,'vector');
  assert.equal(result.body.answer,'Use the Contact page.');
  assert.equal(result.body.href,'/contact/');
  assert.equal(vector,1);assert.equal(legacy,0);
 }finally{
  globalThis.fetch=previous;
  for(const [key,value] of Object.entries(env)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
});
