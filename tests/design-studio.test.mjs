import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const files=Object.fromEntries(await Promise.all([
  'public/admin.html','public/admin.js','public/admin.css','public/app.js','public/styles.css',
  'api/site-content.js'
].map(async path=>[path,await readFile(new URL('../'+path,import.meta.url),'utf8')])));
const html=files['public/admin.html'], admin=files['public/admin.js'],
  adminCss=files['public/admin.css'], app=files['public/app.js'],
  css=files['public/styles.css'], content=files['api/site-content.js'];

test('owner gets exactly three curated designs with a saved draft workflow',()=>{
  for(const name of ['signature','noir','atelier'])
    assert.match(html,new RegExp('data-design-preset="'+name+'"'));
  assert.equal((html.match(/data-design-preset="/g)||[]).length,3);
  assert.match(html,/data-panel="design"/);
  assert.match(html,/data-tab="design"/);
  assert.match(html,/data-design-preview/);
  assert.match(admin,/data-design-current/);
  assert.match(admin,/data-design-live/);
  assert.match(admin,/async function previewDesign\(\)/);
  assert.match(admin,/hasUnsavedDraft\(\)\?await saveDraft\(\):true/);
  assert.match(admin,/admin_preview=1/);
});

test('public design uses published payload and rejects arbitrary CSS inputs',()=>{
  assert.match(app,/designChoices=new Set\(\['signature','noir','atelier'\]\)/);
  assert.match(app,/document.documentElement.dataset.design=designChoices.has\(selected\)\?selected:'signature'/);
  assert.match(app,/function hydratePublishedContent\(\)\{\s*applyDesignPreset\(\)/);
  assert.match(content,/preview=1/);
  assert.match(content,/getAdminSession\(req\)/);
  assert.match(content,/payload:state.draft/);
  assert.match(admin,/action:'restore'/);
});

test('all three design variants retain mobile and reduced-motion styling',()=>{
  assert.match(css,/PUBLIC SITE DESIGN STUDIO/);
  assert.match(css,/html\[data-design="noir"\]/);
  assert.match(css,/html\[data-design="atelier"\]/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(adminCss,/\.design-preset\.selected/);
});
