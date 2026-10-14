import test from 'node:test';
import assert from 'node:assert/strict';
import {indexingAllowed} from '../middleware.js';

const can=(enabled,origin,url)=>indexingAllowed({
  SEO_INDEXING_ENABLED:enabled?'true':'false',
  SEO_SITE_ORIGIN:origin
},'cloudflare',url);

test('staging Pages domain remains noindex with indexing flag accidentally enabled',()=>{
  assert.equal(can(true,'https://lema-website-staging.pages.dev','https://lema-website-staging.pages.dev/about/'),false);
  assert.equal(can(true,'https://lema-transfer-trial.pages.dev','https://lema-transfer-trial.pages.dev/'),false);
  assert.equal(can(false,'https://example.org','https://example.org/'),false);
});
test('only the exact owner-approved HTTPS custom domain is eligible to index',()=>{
  assert.equal(can(true,'https://example.org','https://example.org/services/'),true);
  assert.equal(can(true,'https://example.org','https://example.org/sitemap.xml'),true);
  assert.equal(can(true,'https://example.org','https://lema-website-staging.pages.dev/'),false);
  assert.equal(can(true,'https://www.example.org','https://example.org/'),false);
  assert.equal(can(true,'https://example.org','http://example.org/'),false);
});
test('rejects preview hosts, malformed origins, ports and paths',()=>{
  const r='https://example.org/';
  for(const origin of ['https://demo.workers.dev','https://preview.vercel.app','http://example.org',
    'https://example.org:8443','https://example.org/seo','https://example.org/?preview=1',
    'https://user:pass@example.org','not-a-url','https://localhost']){
    assert.equal(can(true,origin,r),false,origin);
  }
});
test('legacy Vercel production guard remains unchanged',()=>{
  assert.equal(indexingAllowed({VERCEL_ENV:'production',SEO_INDEXING_ENABLED:'true'},'vercel','https://example.org/'),true);
  assert.equal(indexingAllowed({VERCEL_ENV:'preview',SEO_INDEXING_ENABLED:'true'},'vercel','https://example.org/'),false);
});
