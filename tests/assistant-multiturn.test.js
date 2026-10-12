import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/assistant.js';

test('multiple questions survive provider failure, use published FAQ, then AI success',async()=>{
 const before={
  SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY:process.env.SUPABASE_PUBLISHABLE_KEY,
  WITNESS_LEMA_INTERNAL_SECRET:process.env.WITNESS_LEMA_INTERNAL_SECRET,
  GROQ_API_KEY:process.env.GROQ_API_KEY,XAI_API_KEY:process.env.XAI_API_KEY,
  ASSISTANT_AI_PROVIDER:process.env.ASSISTANT_AI_PROVIDER
 };
 const fetchBefore=globalThis.fetch,logsBefore=console.warn;
 const requests={knowledge:0,profile:0,provider:0,rate:0};
 process.env.SUPABASE_URL='https://fixture.supabase.co';
 process.env.SUPABASE_PUBLISHABLE_KEY='public-fixture';
 process.env.WITNESS_LEMA_INTERNAL_SECRET='x'.repeat(36);
 process.env.GROQ_API_KEY='test-only-key';
 delete process.env.XAI_API_KEY;
 delete process.env.ASSISTANT_AI_PROVIDER;
 console.warn=()=>{};
 globalThis.fetch=async (input,options={})=>{
  const url=String(input);
  const reply=body=>({ok:true,status:200,json:async()=>body});
  if(url.includes('/functions/v1/witness-lema-admin')){requests.rate++;return reply({allowed:true});}
  if(url.includes('/rest/v1/witness_lema_knowledge?')){
   requests.knowledge++;
   return reply([{question:'Where is the current booking policy?',answer:'See Contact for approved booking information.',href:'/contact/',published:true,keywords:['booking','policy']}]);
  }
  if(url.includes('/rest/v1/witness_lema_published_site?')){requests.profile++;return reply([{payload:{}}]);}
  if(url.includes('api.groq.com')){
   assert.equal(JSON.parse(options.body).model,'openai/gpt-oss-20b');
   requests.provider++;
   if(requests.provider===1)return {ok:false,status:429};
   return reply({choices:[{message:{content:'A short model answer from the test.'}}]});
  }
  throw new Error('Unexpected endpoint '+url);
 };
 const chat=async(question,history=[])=>{
  let data=null;
  const response={statusCode:200,setHeader(){},end(value){data=JSON.parse(value);}};
  await handler({method:'POST',body:{question,language:'en',history},headers:{'x-forwarded-for':'127.0.0.1'}},response);
  return {status:response.statusCode,...data};
 };
 try{
  const first=await chat('Can you explain a new idea?');
  assert.equal(first.status,200);
  assert.match(first.answer,/happy to help|Could you tell/i);
  assert.equal(first.source,'fallback');
  const second=await chat('Where is the current booking policy?',[{role:'user',content:'Can you explain a new idea?'}]);
  assert.equal(second.status,200);
  assert.equal(second.source,'approved');
  assert.match(second.answer,/approved booking information/i);
  const third=await chat('Tell me something unrelated');
  assert.equal(third.status,200);
  assert.equal(third.source,'ai');
  assert.match(third.answer,/short model answer/);
  const fourth=await chat('Hello');
  assert.equal(fourth.status,200);
  assert.match(fourth.answer,/Hello/i);
  assert.equal(requests.provider,2,'Do not call a second AI provider after first failure');
  assert.equal(requests.knowledge,1,'Reuse published knowledge between requests');
  assert.equal(requests.profile,1,'Reuse public profile between requests');
  assert.equal(requests.rate,3,'Expensive requests are still rate limited');
 }finally{
  globalThis.fetch=fetchBefore;console.warn=logsBefore;
  for(const [k,v] of Object.entries(before)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
 }
});
