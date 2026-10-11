import test from 'node:test';
import assert from 'node:assert/strict';
import { auditHandover } from '../scripts/handover-audit.mjs';
import { readFile } from 'node:fs/promises';

test('handover audit identifies client-specific dependencies without reporting secrets',async()=>{
  const report=await auditHandover();
  assert.equal(report.schemaVersion,1);
  assert.equal(report.scope.includes('NOT verified'),true);
  for(const id of ['brand-in-code','temporary-domain','shared-supabase-host','contact-defaults','database-isolation','source-repository']){
    assert.ok(report.checks.some(c=>c.id===id),'missing handover dependency '+id);
  }
  assert.equal(report.checks.find(x=>x.id==='database-isolation').status,'verification_required');
  const output=JSON.stringify(report);
  assert.doesNotMatch(output,/SUPABASE_SERVICE_ROLE_KEY\s*=|GROQ_API_KEY\s*=|sk-[A-Za-z0-9]{20,}/);
});

test('admin dashboard exposes a clear, non-operative handover section',async()=>{
  const html=await readFile(new URL('../public/admin.html',import.meta.url),'utf8');
  assert.match(html,/data-tab="handover"/);
  assert.match(html,/data-panel="handover"/);
  assert.match(html,/Ownership transfers are not performed by this page/);
  assert.doesNotMatch(html,/name="(?:apiKey|password|secret)"[^>]*data-handover/);
});
