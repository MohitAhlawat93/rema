import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const files=['public/app.js','public/admin.js','public/admin.html','seo/live.mjs'];
test('visitor and owner review interfaces contain no Hindi text',async()=>{
 for(const file of files){
  const text=await readFile(new URL('../'+file,import.meta.url),'utf8');
  assert.doesNotMatch(text,/[\u0900-\u097f]/,file+' still contains Hindi script');
  assert.doesNotMatch(text,/Guest feedback\s*·/i,file+' still has bilingual review heading');
 }
});
test('public reviews show only English review bodies',async()=>{
 for(const file of ['public/app.js','seo/live.mjs']){
  const text=await readFile(new URL('../'+file,import.meta.url),'utf8');
  assert.doesNotMatch(text,/<blockquote lang="hi">/i,file+' displays non-English review');
 }
});
test('owner review form only offers English',async()=>{
 const html=await readFile(new URL('../public/admin.html',import.meta.url),'utf8');
 assert.match(html,/<option value="en">English<\/option>/);
 assert.doesNotMatch(html,/<option value="hi">/);
});
