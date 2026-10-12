import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {HANDOVER_STEPS,HANDOVER_MODES,blankProgress,validateHandoverUpdate,handoverIndicators} from '../lib/handover.js';

test('handover is versioned, has explicit statuses, and cannot accept invented evidence or secrets',()=>{
 assert.equal(HANDOVER_STEPS.length,10);
 assert.equal(new Set(HANDOVER_STEPS.map(s=>s.id)).size,10);
 assert.deepEqual(Object.keys(blankProgress()),HANDOVER_STEPS.map(s=>s.id));
 assert.deepEqual(HANDOVER_MODES,['undecided','managed','client_owned','full_source']);
 const good={saleModel:'managed',expectedVersion:1,progress:{'email-domain':'submitted'}};
 assert.equal(validateHandoverUpdate(good),'');
 assert.match(validateHandoverUpdate({...good,progress:{'unknown':'submitted'}}),/Unknown handover/);
 assert.match(validateHandoverUpdate({...good,progress:{'email-domain':'verified'}}),/Invalid handover status/);
 assert.match(validateHandoverUpdate({...good,expectedVersion:0}),/version/);
 assert.match(validateHandoverUpdate({...good,saleModel:'transfer_everything'}),/model/);
 assert.match(validateHandoverUpdate({...good,progress:{'email-domain':'submitted',secret:'sk-test'}}),/Unknown handover/);
});
test('technical indicators report configuration, never false ownership assurances',()=>{
 const env={SUPABASE_URL:'https://rhwefssbnhmsypnjdfcl.supabase.co',SUPABASE_PUBLISHABLE_KEY:'publishable',
 GROQ_API_KEY:'exists',SIGNATURE_ADMIN_LOGIN_ID:'owner',SIGNATURE_ADMIN_PASSWORD_HASH:'hash',SIGNATURE_SESSION_SECRET:'secret'};
 const list=handoverIndicators(env);
 assert.equal(list.find(x=>x.id==='published-db').configured,true);
 assert.equal(list.find(x=>x.id==='isolated-db').configured,false);
 assert.equal(list.find(x=>x.id==='canonical').configured,false);
 assert.equal(list.find(x=>x.id==='ai').configured,true);
 assert.equal(list.find(x=>x.id==='gsc').configured,false);
 assert.ok(list.every(x=>/configured|setting|endpoint|proof/i.test(x.label)));
});
test('private schema, service-role-only RPC and owner session guard are mandatory',async()=>{
 const sql=await readFile(new URL('../supabase/migrations/20261012140000_private_handover_state.sql',import.meta.url),'utf8');
 const edge=await readFile(new URL('../supabase/functions/witness-lema-admin/index.ts',import.meta.url),'utf8');
 const route=await readFile(new URL('../api/admin/[route].js',import.meta.url),'utf8');
 const html=await readFile(new URL('../public/admin.html',import.meta.url),'utf8');
 const app=await readFile(new URL('../public/handover.js',import.meta.url),'utf8');
 assert.match(sql,/handover_state enable row level security/);
 assert.match(sql,/revoke all on function public\.witness_lema_handover_state\(text,jsonb\) from public, anon, authenticated/i);
 assert.match(sql,/grant execute on function public\.witness_lema_handover_state\(text,jsonb\) to service_role/i);
 assert.match(sql,/security invoker/i);
 assert.match(edge,/if\(action==='handover-read'\|\|action==='handover-save'\)/);
 assert.ok(edge.indexOf('if(action===\'handover-read\'')>edge.indexOf("if(allowed!==true)"),'must authenticate before private read');
 assert.ok(route.indexOf("if(route==='handover')")>route.indexOf('if(!protectedRoute(req,res))return;'),'owner guard must precede handover');
 assert.match(route,/if\(route==='handover-export'\)/);
 assert.match(route,/callAdminBackend\('knowledge-read'\)/);
 assert.match(route,/reviewInbox\('list'\)/);
 assert.match(html,/data-handover-save/);
 assert.match(html,/data-handover-export/);
 assert.doesNotMatch(html,/type="password"[^>]*data-handover/);
 assert.match(app,/expectedVersion:plan.version/);
 assert.match(app,/URL\.revokeObjectURL/);
});
test('only main triggers automatic Vercel builds; browser changes stay under version control',async()=>{
 const cfg=JSON.parse(await readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 assert.equal(cfg.git.deploymentEnabled['*'],false);
 assert.equal(cfg.git.deploymentEnabled.main,true);
});
test('client handover UI loads after protected tab click and persists with optimistic versioning',async()=>{
 const script=await readFile(new URL('../public/handover.js',import.meta.url),'utf8');
 class FakeElement{
  constructor(){this.dataset={};this.handlers={};this.value='';this.textContent='';this.innerHTML='';this.disabled=false;this.className='';}
  addEventListener(name,fn){this.handlers[name]=fn;}
  setAttribute(name,value){this[name]=value;}
 }
 const elements=new Map();
 const element=selector=>{if(!elements.has(selector))elements.set(selector,new FakeElement());return elements.get(selector);};
 const calls=[];
 const initial={version:1,saleModel:'undecided',progress:{},steps:HANDOVER_STEPS,indicators:[]};
 const responses={
  '/api/admin/handover':initial
 };
 const fetch=async(url,options={})=>{
   calls.push({url,method:options.method||'GET',body:options.body});
   if(url==='/api/admin/handover'&&options.method==='PUT'){
      const body=JSON.parse(options.body);
      assert.equal(body.expectedVersion,1);
      assert.equal(body.saleModel,'managed');
      assert.equal(body.progress['business-approval'],'submitted');
      return {ok:true,json:async()=>({...body,version:2})};
   }
   return {ok:true,json:async()=>responses[url]||{}};
 };
 const context=vm.createContext({document:{querySelector:element},window:{addEventListener(){}},fetch,confirm:()=>true});
 new vm.Script(script,{filename:'public/handover.js'}).runInContext(context);
 assert.equal(calls.length,0,'do not access private APIs before owner opens handover');
 element('[data-tab="handover"]').handlers.click();
 for(let n=0;n<12;n++)await Promise.resolve();
 assert.match(element('[data-handover-count]').textContent,/0\/10/);
 element('[data-handover-sale-model]').handlers.change({target:{value:'managed'}});
 element('[data-handover-list]').handlers.change({target:{dataset:{handoverStep:'business-approval'},value:'submitted'}});
 element('[data-handover-save]').handlers.click();
 for(let n=0;n<12;n++)await Promise.resolve();
 assert.equal(calls.filter(c=>c.method==='PUT').length,1);
 assert.match(element('[data-handover-message]').textContent,/Submitted steps are awaiting/);
});

test('beginner practice uses a second email only in local memory and cannot change live progress',async()=>{
 const script=await readFile(new URL('../public/handover.js',import.meta.url),'utf8');
 class FakeElement{
  constructor(){this.dataset={};this.handlers={};this.value='';this.textContent='';this.innerHTML='';this.disabled=false;this.hidden=false;this.className='';}
  addEventListener(name,fn){this.handlers[name]=fn;}
  setAttribute(name,value){this[name]=value;}
 }
 const items=new Map();
 const element=name=>{if(!items.has(name))items.set(name,new FakeElement());return items.get(name);};
 const requests=[];
 const initial={version:5,saleModel:'managed',progress:{'business-approval':'submitted'},steps:HANDOVER_STEPS,indicators:[]};
 const fetch=async(url,options={})=>{
  requests.push({url,method:options.method||'GET',body:options.body});
  if(url==='/api/admin/handover')return {ok:true,json:async()=>initial};
  throw new Error('Unexpected API call during practice: '+url);
 };
 const ctx=vm.createContext({document:{querySelector:element},window:{addEventListener(){}},fetch,confirm:()=>true});
 new vm.Script(script,{filename:'public/handover.js'}).runInContext(ctx);
 element('[data-tab="handover"]').handlers.click();
 for(let n=0;n<15;n++)await Promise.resolve();
 assert.equal(requests.length,1);
 assert.match(element('[data-handover-simple]').innerHTML,/Check your website/);
 element('[data-handover-practice]').handlers.click();
 assert.equal(element('[data-handover-practice-banner]').hidden,false);
 assert.match(element('[data-handover-simple]').innerHTML,/Practice only/);
 assert.doesNotMatch(element('[data-handover-simple]').innerHTML,/https:\/\/accounts.google.com/);
 element('[data-handover-practice-email]').handlers.input({target:{value:'my.other.email@example.com'}});
 assert.match(element('[data-handover-practice-email-note]').textContent,/NOT been sent/);
 element('[data-handover-simple]').handlers.change({target:{dataset:{simpleStep:'business-approval'},value:'submitted'}});
 element('[data-handover-simple]').handlers.change({target:{dataset:{simpleSaleModel:'client_owned'},value:'client_owned'}});
 element('[data-handover-save]').handlers.click();
 element('[data-handover-export]').handlers.click();
 for(let n=0;n<10;n++)await Promise.resolve();
 assert.equal(requests.length,1,'practice cannot make backend API calls');
 assert.match(element('[data-handover-message]').textContent,/disabled in practice/i);
 element('[data-handover-real]').handlers.click();
 assert.equal(element('[data-handover-practice-banner]').hidden,true);
 assert.match(element('[data-handover-count]').textContent,/1\/10/,'real owner progress must survive the practice session');
 assert.equal(element('[data-handover-sale-model]').value,'managed');
 assert.ok(!requests.some(x=>JSON.stringify(x).includes('my.other.email@example.com')),'practice email must not be transmitted');
});
test('easy setup has exactly three owner steps and keeps developer work separate',async()=>{
 const html=await readFile(new URL('../public/admin.html',import.meta.url),'utf8');
 const js=await readFile(new URL('../public/handover.js',import.meta.url),'utf8');
 assert.match(html,/Try it safely \(practice\)/);
 assert.match(html,/data-handover-practice-email/);
 assert.match(html,/data-handover-simple/);
 assert.match(html,/<details class="handover-advanced">/);
 assert.match(js,/STEP '+\(index\+1\)+' OF 3/);
 assert.match(js,/if\(practice\)\{changes=false;/);
 assert.match(html,/nothing here changes the real website/);
});
