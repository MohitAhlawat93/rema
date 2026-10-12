import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/assistant.js';

test('second answer stays independent and RAG retrieval uses vector results only',async()=>{
 const keys=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','WITNESS_LEMA_INTERNAL_SECRET','GROQ_API_KEY','XAI_API_KEY','ASSISTANT_AI_PROVIDER'];
 const original=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 const oldFetch=globalThis.fetch,oldWarn=console.warn;
 process.env.SUPABASE_URL='https://test.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='public';
 process.env.WITNESS_LEMA_INTERNAL_SECRET='s'.repeat(40);process.env.GROQ_API_KEY='test';
 delete process.env.XAI_API_KEY;delete process.env.ASSISTANT_AI_PROVIDER;
 let provider=0,vector=0,legacy=0;const prompts=[];
 const ok=body=>({ok:true,status:200,json:async()=>body});
 globalThis.fetch=async(url,opts={})=>{
  url=String(url);
  if(url.includes('witness-lema-admin'))return ok({allowed:true});
  if(url.includes('witness_lema_published_site'))return ok([{payload:{}}]);
  if(url.includes('witness_lema_knowledge')){legacy++;throw Error('Legacy keyword lookup');}
  if(url.includes('tenant-hybrid-rag')){vector++;return ok({mode:'vector',rows:[{
   question:'Contact or Gallery',answer:'Owner-approved fact',href:'/contact/',score:.79,similarity:.79}]});}
  if(url.includes('api.groq.com')){
   provider++;
   const input=JSON.parse(opts.body);
   assert.equal(input.messages.length,2,'Only system and latest visitor message');
   prompts.push(input.messages[1].content);
   return ok({choices:[{message:{content:provider===1?'THE_FIRST_ANSWER':'THE_SECOND_ANSWER'}}]});
  }
  throw Error('Unexpected '+url);
 };
 console.warn=()=>{};
 const chat=async(question,history=[])=>{
  let result;const res={statusCode:200,setHeader(){},end(value){result=JSON.parse(value)}};
  await handler({method:'POST',body:{question,language:'en',history},headers:{'x-forwarded-for':'127.0.0.1'}},res);
  return {status:res.statusCode,...result};
 };
 try{
  const first=await chat('How can I contact her?');
  assert.equal(first.status,200);assert.equal(first.answer,'THE_FIRST_ANSWER');
  const second=await chat('Can you show her gallery?',[
   {role:'user',content:'How can I contact her?'},{role:'assistant',content:'THE_FIRST_ANSWER'}
  ]);
  assert.equal(second.status,200);assert.equal(second.answer,'THE_SECOND_ANSWER');
  assert.doesNotMatch(prompts[1],/THE_FIRST_ANSWER|How can I contact her/i);
  assert.equal(provider,2);assert.equal(vector,2);assert.equal(legacy,0);
 }finally{
  globalThis.fetch=oldFetch;console.warn=oldWarn;
  for(const [k,v] of Object.entries(original)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
 }
});

test('genuine followups use the preceding visitor question, never its answer',async()=>{
 const keys=['SUPABASE_URL','WITNESS_LEMA_INTERNAL_SECRET','GROQ_API_KEY','XAI_API_KEY'];
 const env=Object.fromEntries(keys.map(k=>[k,process.env[k]])),oldFetch=globalThis.fetch;
 process.env.SUPABASE_URL='https://test.supabase.co';process.env.WITNESS_LEMA_INTERNAL_SECRET='s'.repeat(40);
 process.env.GROQ_API_KEY='test';delete process.env.XAI_API_KEY;
 let prompt='';
 const ok=body=>({ok:true,status:200,json:async()=>body});
 globalThis.fetch=async(url,opts={})=>{
  url=String(url);
  if(url.includes('witness-lema-admin'))return ok({allowed:true});
  if(url.includes('api.groq.com')){prompt=JSON.parse(opts.body).messages[1].content;
   return ok({choices:[{message:{content:'Explanation of this question only.'}}]});}
  throw Error('Unexpected '+url);
 };
 try{
  let response;const res={statusCode:200,setHeader(){},end(v){response=JSON.parse(v)}};
  await handler({method:'POST',body:{question:'Why is that the answer?',history:[
   {role:'user',content:'What is two plus two?'},{role:'assistant',content:'PREVIOUS PRIVATE ANSWER'}
  ]}},res);
  assert.equal(res.statusCode,200);assert.match(prompt,/What is two plus two/);
  assert.doesNotMatch(prompt,/PREVIOUS PRIVATE ANSWER/);
  assert.equal(response.answer,'Explanation of this question only.');
 }finally{
  globalThis.fetch=oldFetch;
  for(const [k,v] of Object.entries(env)){if(v===undefined)delete process.env[k];else process.env[k]=v;}
 }
});
