import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedStagingSelfTest} from '../lib/staging-self-test.js';
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
