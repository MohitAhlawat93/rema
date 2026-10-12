import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const hash = content => createHash('sha256').update(content).digest('hex').slice(0,12);

test('public HTML fingerprints the currently deployed chat app and stylesheet',async()=>{
 const html=await readFile('dist/index.html','utf8');
 const app=await readFile('public/app.js');
 const css=await readFile('public/styles.css');
 assert.ok(html.includes('/app.js?v='+hash(app)),'Mobile must not reuse stale chatbot JavaScript');
 assert.ok(html.includes('/styles.css?v='+hash(css)),'Mobile must not reuse stale chatbot CSS');
});
