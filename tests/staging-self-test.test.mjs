import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedStagingSelfTest,validStagingTestStep,STAGING_TEST_STEPS,runStagingSelfTest} from '../lib/staging-self-test.js';
test('full self-test can never run without explicit staging flag, known host and DB',()=>{
 const old={enabled:process.env.SITE_STAGING_TEST_ENABLED,url:process.env.SUPABASE_URL};
 const req={headers:{host:'lema-website-staging.pages.dev'}};
 try{
  process.env.SITE_STAGING_TEST_ENABLED='false';
  process.env.SUPABASE_URL='https://yebbfjemvvtenpzrrhno.supabase.co';
  assert.equal(allowedStagingSelfTest(req),false);
  process.env.SITE_STAGING_TEST_ENABLED='true';
  assert.equal(allowedStagingSelfTest({headers:{host:'rema-ruby.vercel.app'}}),false);
  process.env.SUPABASE_URL='https://rhwefssbnhmsypnjdfcl.supabase.co';
  assert.equal(allowedStagingSelfTest(req),false);
  process.env.SUPABASE_URL='https://yebbfjemvvtenpzrrhno.supabase.co';
  assert.equal(allowedStagingSelfTest(req),true);
 }finally{
  if(old.enabled===undefined)delete process.env.SITE_STAGING_TEST_ENABLED;
  else process.env.SITE_STAGING_TEST_ENABLED=old.enabled;
  if(old.url===undefined)delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL=old.url;
 }
});

import {workersAiAnswer} from '../lib/workers-ai-fallback.js';

test('Workers AI backup uses a supported model and reads the text response',async()=>{
  let selected='';
  const binding={async run(model,input){
    selected=model;
    assert.equal(input.messages[0].role,'system');
    assert.deepEqual(input.chat_template_kwargs,{enable_thinking:false});
    assert.equal(input.max_completion_tokens,280);
    assert.equal(input.enable_thinking,undefined);
    return {choices:[{message:{content:'Hello from Cloudflare AI'}}]};
  }};
  const answer=await workersAiAnswer(binding,'Only answer verified information.','Hello');
  assert.equal(selected,'@cf/zai-org/glm-4.7-flash');
  assert.equal(answer,'Hello from Cloudflare AI');
});

test('Workers AI never exposes reasoning content as a visitor answer',async()=>{
  const binding={async run(){return {choices:[{message:{content:null,reasoning:'private reasoning'}}]};}};
  assert.equal(await workersAiAnswer(binding,'Ground all website claims.','Hello'), '');
});


test('all staged checks have unique stable IDs and reject other requests',()=>{
 assert.equal(STAGING_TEST_STEPS.length,6);
 assert.equal(new Set(STAGING_TEST_STEPS.map(step=>step.id)).size,6);
 assert.ok(STAGING_TEST_STEPS.every(step=>validStagingTestStep(step.id)));
 for(const value of ['',null,{},'../../admin','publish','all'])assert.equal(validStagingTestStep(value),false);
});

test('a single selected check runs without modifying published state',async()=>{
 const report=await runStagingSelfTest({},{only:'database'});
 assert.equal(report.total,1);
 assert.equal(report.checks[0].id,'database');
 assert.equal(report.checks[0].passed,false); // No configured Supabase in a unit test.
});
