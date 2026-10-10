import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';
import { site } from '../data/site.js';
import { answerQuestion } from '../lib/faq.js';
import { createSessionToken, verifySessionToken, adminAuthConfigured, parseCookies } from '../lib/admin-auth.js';
import { validateOwnerWriteOrigin } from '../lib/admin-origin-guard.js';

test('FAQ answers are sourced from the published model and unknowns are explicit',()=>{
 assert.equal(answerQuestion('How can I contact witness_lema_?',site.faqs).answer,site.faqs[1].answer);
 assert.match(answerQuestion('Tell me her private address',site.faqs).answer,/don’t have a confirmed answer/);
 assert.match(answerQuestion('What photos are these?',site.faqs).answer,/reference|abstract/i);
});
test('imported owner authentication fails closed, rejects tampering and invalidates rotated credentials',()=>{
 delete process.env.SIGNATURE_SESSION_SECRET;assert.equal(adminAuthConfigured(),false);assert.equal(verifySessionToken('bad'),null);
 process.env.SIGNATURE_ADMIN_LOGIN_ID='test-owner';process.env.SIGNATURE_ADMIN_PASSWORD_HASH='test-only-hash';process.env.SIGNATURE_SESSION_SECRET='test-only-secret-with-more-than-32-characters';
 const token=createSessionToken('test-owner');assert.equal(verifySessionToken(token).sub,'test-owner');assert.equal(verifySessionToken(token+'x'),null);
 process.env.SIGNATURE_ADMIN_PASSWORD_HASH='rotated-test-only-hash';assert.equal(verifySessionToken(token),null);
 assert.deepEqual(parseCookies({headers:{cookie:'bad=%E0%A4%A'}}),{});
});
test('imported origin guard rejects cross-site writes',()=>{
 assert.equal(validateOwnerWriteOrigin({method:'POST',headers:{host:'example.com',origin:'https://evil.example'}}).allowed,false);
 assert.equal(validateOwnerWriteOrigin({method:'POST',headers:{host:'example.com',origin:'https://example.com'}}).allowed,true);
});
test('all generated internal links and assets resolve; only public modules are shipped',async()=>{
 const root=path.resolve('dist');const files=await readdir(root,{recursive:true});
 for(const f of files.filter(f=>f.endsWith('.html'))){const html=await readFile(path.join(root,f),'utf8');assert.match(html,/noindex,nofollow/);assert.doesNotMatch(html,/Rebecca|Élanora|Élrebecca|RC_STORE_SECRET|supabase/i);for(const [,url] of html.matchAll(/(?:href|src)="(\/[^"#]*)"/g)){await access(path.join(root,url,url.endsWith('/')?'index.html':''));}}
 await assert.rejects(access(path.join(root,'lib/admin-auth.js')));
 for(const route of ['about','gallery','services','contact'])await access(path.join(root,route,'index.html'));
});
