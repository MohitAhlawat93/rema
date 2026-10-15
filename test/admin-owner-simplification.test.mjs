import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('owner home provides everyday actions through existing section handlers',async()=>{
 const h=await readFile(new URL('../public/admin.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../public/admin.js',import.meta.url),'utf8');
 for(const tab of ['photos','services','links','reviews','assistant','design']){
  assert.match(h,new RegExp('data-go-tab="'+tab+'"'));
  assert.match(h,new RegExp('data-panel="'+tab+'"'));
 }
 assert.match(js,/\$\$\('\[data-go-tab\]'\)\.forEach/);
 assert.match(h,/data-tab="seo">Google appearance/);
 assert.match(h,/data-restore|data-history/);
 assert.match(h,/data-publish/);
 assert.match(h,/<details class="admin-advanced">/);
 assert.doesNotMatch(h,/data-tab="growth"|data-go-tab="growth"/);
});
