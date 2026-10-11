import test from 'node:test';
import assert from 'node:assert/strict';
import { visitorReply } from '../lib/assistant-intents.js';
import { readFile } from 'node:fs/promises';
const site={services:[{title:'Dinner Date'},{title:'Incall – 1 Hour'}]};
test('subjective appearance questions do not receive unrelated service FAQ answers',()=>{
 const r=visitorReply('is she hot','en',site);
 assert.match(r.answer,/personal taste/i);
 assert.equal(r.href,'/gallery/');
});
test('private meeting question gives a qualified, conversational answer',()=>{
 const r=visitorReply('can i meet her alone','en',site);
 assert.match(r.answer,/one-to-one/);
 assert.match(r.answer,/confirmed directly/);
});
test('Hindi and Hinglish get a real Hindi answer',()=>{
 assert.match(visitorReply('क्या मैं अकेले मिल सकता हूँ?','hi',site).answer,/निजी/);
 assert.match(visitorReply('wo hot hai kya?','hi',site).answer,/खूबसूरती/);
});
test('availability and verification are not invented',()=>{
 assert.match(visitorReply('Can I meet today?','en',site).answer,/can't see.*calendar/i);
 assert.match(visitorReply('Is she real person?','en',site).answer,/can't independently verify/i);
});
test('public frontend has a once-per-session automatic popup and a Reviews route',async()=>{
 const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const build=await readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8');
 assert.match(app,/lema-concierge-first-visit-v3/);
 assert.match(app,/setAssistant\(true,false\)/);
 assert.match(build,/['"]\/reviews\/['"]/);
 assert.match(build,/data-public-reviews/);
});
