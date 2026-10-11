import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
test('public reviews do not contain fabricated examples or unnecessary disclaimer',async()=>{
 const [app,build]=await Promise.all([read('../public/app.js'),read('../scripts/build.mjs')]);
 assert.ok(!app.includes('Layout example · not a client review'));
 assert.ok(!build.includes('Example cards are clearly labelled'));
 assert.ok(build.includes('No reviews published yet.'));
 assert.ok(build.includes("link('/reviews/','Reviews')"));
});
test('optional learning needs explicit consent and private backend authorization',async()=>{
 const [api,edge,build,sql]=await Promise.all([
  read('../api/assistant-learning.js'),read('../supabase/functions/witness-lema-admin/index.ts'),
  read('../scripts/build.mjs'),read('../supabase/migrations/20261011050000_owner_approved_chat_learning.sql')
 ]);
 assert.match(api,/raw\.consent!==true/);
 assert.match(api,/consumeRateLimit\(req,'chat-learning',5,3600\)/);
 assert.match(edge,/witness_lema_review_learning/);
 assert.match(build,/type="checkbox" id="assistant-learning-consent"/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all on public\.witness_lema_learning_queue from public, anon, authenticated/);
});
