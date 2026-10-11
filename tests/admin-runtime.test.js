import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const code=await readFile(new URL('../public/admin.js',import.meta.url),'utf8');

class FakeElement{
 constructor(dataset={}){
  this.dataset=dataset;this.hidden=false;this.value='';this.textContent='';this.innerHTML='';
  this.classList={active:false,toggle(name,active){this.active=active;}};
 }
 addEventListener(name,callback){this['on'+name]=callback;}
 setAttribute(){}
 focus(){}
 querySelectorAll(){return [];}
}
const routes=['/','/about/','/gallery/','/services/','/contact/','/reviews/'];
const defaults={business:{name:'Witness Lema',wordmark:'witness_lema_',tagline:'A WORLD OF HER OWN',city:'Gurgaon',email:'',logoUrl:'/assets/mark.svg',requestedDomain:''},pages:Object.fromEntries(routes.map(route=>[route,{
 title:'A useful and descriptive Witness Lema page title',
 description:'A factual summary of this page with enough meaningful information to help real visitors find the relevant content.',
 heading:'Helpful information for website visitors',
 paragraphs:[
  'This is a meaningful paragraph containing useful details about the website and the information available to visitors.',
  'This second paragraph provides additional honest context about the page so that people can find and understand it.'
 ],
 image:'/images/gallery/portrait-01.jpg',
 index:true,
 links:[{href:route==='/'?'/about/':'/',label:'Read more about Lema'}]
}]))};
function dashboard({seoAvailable=true}={}){
 const elements=new Map();
 const element=selector=>{
  if(!elements.has(selector))elements.set(selector,new FakeElement());
  return elements.get(selector);
 };
 const tabs=['overview','business','profile','services','photos','assistant','links','reviews','seo'].map(tab=>new FakeElement({tab}));
 const panels=tabs.map(item=>new FakeElement({panel:item.dataset.tab}));
 const fields=['title','description','heading','image'].map(seoField=>new FakeElement({seoField}));
 const businessFields=['name','wordmark','tagline','city','email','logoUrl','requestedDomain'].map(businessField=>new FakeElement({businessField}));
 const paragraphs=[0,1].map(seoParagraph=>new FakeElement({seoParagraph:String(seoParagraph)}));
 const saves=Array.from({length:7},()=>new FakeElement());
 const lists={
  '[data-tab]':tabs,'[data-panel]':panels,
  '[data-seo-field]':fields,'[data-seo-paragraph]':paragraphs,'[data-business-field]':businessFields,'[data-save]':saves
 };
 const document={
  querySelector:selector=>lists[selector]?.[0]||element(selector),
  querySelectorAll:selector=>lists[selector]||[]
 };
 const calls=[];
 const state={
  draft:{
   images:[{src:'/images/gallery/portrait-01.jpg',hero:true,title:'Portrait',alt:'Portrait'}],
   aboutImages:Array(3).fill('/images/gallery/portrait-01.jpg'),
   services:[],social:{},assistant:{name:'Lema Concierge',greeting:'Hello!'}
  },
  version:1,publishedVersion:1,history:[]
 };
 const fetch=async(url,options={})=>{
  calls.push({url,method:options.method||'GET',body:options.body});
  let data={},ok=true;
  if(url==='/api/admin/session')data={state};
  else if(url==='/api/admin/knowledge')data={items:[]};
  else if(url==='/seo-defaults.json'){ok=seoAvailable;data=defaults;}
  else if(url==='/api/admin/ai-status')data={configured:false};
  else if(url==='/api/admin/state'&&options.method==='PUT'){
   const body=JSON.parse(options.body);
   assert.equal(body.expectedVersion,state.version);
   state.draft=body.state;
   state.version+=1;
   data=state;
  }else if(url==='/api/admin/state'&&options.method==='POST'){
   const body=JSON.parse(options.body);
   assert.equal(body.expectedVersion,state.version);
   state.publishedVersion=state.version;
   data=state;
  }
  return {ok,json:async()=>data};
 };
 const context=vm.createContext({
  document,window:{addEventListener(){}},fetch,FormData:class{},confirm:()=>true,
  console,URL,Array,JSON,Date,String,Number,Promise
 });
 new vm.Script(code,{filename:'public/admin.js'}).runInContext(context);
 return {element,tabs,panels,fields,businessFields,paragraphs,saves,calls,state};
}
async function initialized(ui){
 // Drain asynchronous mock responses and the dashboard's Promise.allSettled.
 for(let i=0;i<20;i++)await Promise.resolve();
 assert.equal(ui.element('[data-dashboard]').hidden,false,'dashboard must open');
 assert.equal(ui.element('[data-login]').hidden,true,'login screen must close');
}
test('all admin navigation links and SEO controls work after login',async()=>{
 const ui=dashboard();
 await initialized(ui);
 for(const tab of ui.tabs)assert.equal(typeof tab.onclick,'function','missing menu handler '+tab.dataset.tab);
 for(let i=0;i<ui.tabs.length;i++){
  ui.tabs[i].onclick();
  assert.equal(ui.panels[i].classList.active,true,'menu did not open '+ui.tabs[i].dataset.tab);
 }
 assert.equal(typeof ui.element('[data-publish]').onclick,'function');
 assert.equal(typeof ui.element('[data-refresh]').onclick,'function');
 assert.equal(typeof ui.element('[data-logout]').onclick,'function');
 for(const item of ui.fields.filter(x=>x.dataset.seoField!=='image'))assert.equal(typeof item.oninput,'function');
 for(const item of ui.paragraphs)assert.equal(typeof item.oninput,'function');
 ui.fields[0].value='An improved and truthful Lema homepage title';
 ui.fields[0].oninput();
 await ui.saves[0].onclick();
 assert.ok(ui.calls.some(x=>x.url==='/api/admin/state'&&x.method==='PUT'),'Save draft request missing');
 assert.match(ui.element('[data-notice]').textContent,/Draft saved privately/);
 await ui.element('[data-publish]').onclick();
 assert.ok(ui.calls.some(x=>x.url==='/api/admin/state'&&x.method==='POST'),'Publish request missing');
 assert.match(ui.element('[data-notice]').textContent,/Published successfully/);
});
test('business identity edits save privately and publish through the existing versioned API',async()=>{
 const ui=dashboard();await initialized(ui);
 const name=ui.businessFields.find(x=>x.dataset.businessField==='name');
 assert.equal(typeof name.oninput,'function');
 name.value='Example Studios';name.oninput();
 assert.equal(ui.state.draft.business.name,'Example Studios');
 await ui.saves[0].onclick();
 assert.ok(ui.calls.some(x=>x.method==='PUT'&&JSON.parse(x.body||'{}').state?.business?.name==='Example Studios'));
 await ui.element('[data-publish]').onclick();
 assert.match(ui.element('[data-notice]').textContent,/Published successfully/);
});

test('missing SEO defaults cannot disable the rest of the admin dashboard',async()=>{
 const ui=dashboard({seoAvailable:false});
 await initialized(ui);
 ui.tabs[2].onclick();
 assert.equal(ui.panels[2].classList.active,true);
 assert.equal(typeof ui.element('[data-save-answers]').onclick,'function');
 assert.equal(typeof ui.element('[data-publish]').onclick,'function');
 assert.equal(ui.element('[data-seo-loading-error]').hidden,false);
 assert.match(ui.element('[data-notice]').textContent,/Some optional settings did not load/);
});
test('do not invoke forEach on a single DOM element',()=>{
 assert.doesNotMatch(code,/(?<!\$)\$\('\[data-(?:tab|seo-field|seo-paragraph)\]'\)\.forEach/);
});

test('Save Draft keeps unfinished SEO and Publish still rejects it',async()=>{
 const ui=dashboard();
 await initialized(ui);
 ui.fields[0].value='';
 ui.fields[0].oninput();
 await ui.saves[0].onclick();
 assert.match(ui.element('[data-notice]').textContent,/Draft saved privately/);
 const puts=ui.calls.filter(x=>x.url==='/api/admin/state'&&x.method==='PUT').length;
 assert.equal(puts,1,'incomplete draft must be saved');
 await ui.element('[data-publish]').onclick();
 assert.match(ui.element('[data-notice]').textContent,/SEO title for Home/);
 assert.equal(ui.calls.filter(x=>x.url==='/api/admin/state'&&x.method==='POST').length,0,'invalid draft must not publish');
});
test('backend distinguishes save from publish and gives precise client-safe errors',async()=>{
 const [edge,backend,route]=await Promise.all([
   readFile(new URL('../supabase/functions/witness-lema-admin/index.ts',import.meta.url),'utf8'),
   readFile(new URL('../lib/admin-backend.js',import.meta.url),'utf8'),
   readFile(new URL('../api/admin/[route].js',import.meta.url),'utf8')
 ]);
 assert.match(edge,/if\(action==='save'\)\{[\s\S]*?Drafts are private/);
 assert.match(edge,/if\(action==='publish'\)\{[\s\S]*?const current=await rpc\('witness_lema_admin_state'/);
 assert.match(backend,/statusCode: 409/);
 assert.match(route,/\[400,409,413\]/);
});

test('all admin Save Draft controls persist changes from their sections',async()=>{
 const ui=dashboard();
 await initialized(ui);
 assert.equal(ui.saves.length,7);
 for(let index=0;index<ui.saves.length;index++){
  ui.state.draft.hero={...ui.state.draft.hero,title:'Updated heading '+index};
  ui.state.draft.about={title:'About '+index,heading:'Heading '+index,text:'Biography '+index};
  ui.state.draft.services=[{title:'Service '+index,text:'Service details '+index}];
  ui.state.draft.afterhours={enabled:true,title:'Afterhours '+index,intro:'Intro',links:[]};
  ui.state.draft.contactLinks=[];
  ui.state.draft.reviews=[];
  await ui.saves[index].onclick();
  assert.match(ui.element('[data-notice]').textContent,/Draft saved privately/,'save control '+index+' must persist');
  const saved=ui.calls.filter(x=>x.url==='/api/admin/state'&&x.method==='PUT').at(-1);
  const payload=JSON.parse(saved.body);
  assert.equal(payload.state.hero.title,'Updated heading '+index);
  assert.equal(payload.state.about.heading,'Heading '+index);
  assert.equal(payload.state.services[0].title,'Service '+index);
  assert.equal(payload.state.afterhours.title,'Afterhours '+index);
 }
 assert.equal(ui.calls.filter(x=>x.method==='PUT'&&x.url==='/api/admin/state').length,7);
});
test('every indexed page has an independently editable and savable SEO draft',async()=>{
 const ui=dashboard();
 await initialized(ui);
 const picker=ui.element('[data-seo-page]');
 for(const route of routes){
  picker.value=route;picker.onchange({target:picker});
  ui.fields[0].value='Useful updated owner title '+route;
  ui.fields[0].oninput();
  await ui.saves[6].onclick();
  assert.equal(ui.state.draft.seo.pages[route].title,'Useful updated owner title '+route);
  assert.match(ui.element('[data-notice]').textContent,/Draft saved privately/);
 }
});

test('assistant Save Answers explains incomplete entries instead of calling broken backend',async()=>{
 const ui=dashboard();
 await initialized(ui);
 ui.element('[data-add-answer]').onclick();
 await ui.element('[data-save-answers]').onclick();
 assert.match(ui.element('[data-notice]').textContent,/needs both a question and an answer/);
 assert.equal(ui.calls.filter(x=>x.url==='/api/admin/knowledge'&&x.method==='PUT').length,0);
});
test('admin review manager allows add and delete actions',async()=>{
 const [html,route]=await Promise.all([
 readFile(new URL('../public/admin.html',import.meta.url),'utf8'),
 readFile(new URL('../api/admin/[route].js',import.meta.url),'utf8')
 ]);
 assert.ok(html.includes('data-admin-review-form'));
 assert.ok(html.includes('data-reviews-editor'));
 assert.ok(code.includes('addLiveReview'));
 assert.ok(code.includes("method:'DELETE'"));
 assert.ok(route.includes("req.method==='DELETE'"));
});
