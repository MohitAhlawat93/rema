import {analyzeGscCSV} from './gsc-csv.js';
const $=id=>document.getElementById(id);
const DATA={
 impressions:{title:'Impressions but low click-through rate',evidence:'Example: 1,100 impressions, 14 clicks, average position 9.8 over 28 days.',reason:'We would compare matching queries, device types, snippets and rankings before proposing a more useful page title.',action:'Draft clearer title and description based on approved page content.'},
 indexed:{title:'Google has not indexed a page',evidence:'Example: URL Inspection reports page not indexed. This is fictional demo evidence.',reason:'Check robots, noindex, canonical, crawl response and page quality. A sitemap is not a guarantee of indexing.',action:'Draft a technical review and verify the URL is eligible for crawling.'},
 ranking:{title:'Weak location-specific search visibility',evidence:'Example: Top-10 coverage 2 of 9 sampled searches (fictional grid).',reason:'Check identical queries, points, devices and actual approved service areas before comparing relevant competing pages.',action:'Draft improvements to genuinely useful local information; no copied location pages.'},
 conversion:{title:'Visitors seldom take a contact action',evidence:'Example: 2 contact link clicks from 140 visits (fictional event counts).',reason:'Test mobile layout, click-to-contact handoff and page clarity; a click is not proof of a confirmed enquiry.',action:'Draft clearer contact cues and test actual links.'}
};
const KEY='witness-lema-growth-lab-rehearsal-v1';
let state={scenario:'impressions',status:'investigate',history:[]};
try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&DATA[saved.scenario]&&['investigate','draft','approve','undo'].includes(saved.status))state=saved;}catch{}
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}};
function render(){
 $('scenario').value=state.scenario;
 const item=DATA[state.scenario];
 $('case-title').textContent=item.title;
 $('case-evidence').textContent=item.evidence;
 $('case-reason').textContent='Diagnosis: '+item.reason;
 const map={investigate:['Ready to investigate','Select Create recommendation to create an evidence-backed demonstration draft.'],
 draft:['Draft awaiting approval',item.action+' No actual site content has changed.'],
 approve:['Demo change approved','The example approval was recorded in this browser only. A real release would validate the actual HTML, inspect a comparable baseline and wait for reliable results.'],
 undo:['Example change reversed','The example approval has been undone. The live website and database were never altered.']};
 const [label,description]=map[state.status];
 $('workflow-state').textContent=label;
 $('workflow-description').textContent=description;
 $('draft').disabled=state.status==='draft'||state.status==='approve';
 $('approve').disabled=state.status!=='draft';
 $('undo').disabled=state.status!=='approve';
 $('result').textContent=state.status==='approve'?'Outcome pending real data':state.status==='undo'?'Reverted (demo)':'Not measured — demo';
 for(const el of document.querySelectorAll('[data-stage]'))el.classList.toggle('selected',el.dataset.stage===state.status||(el.dataset.stage==='verify'&&state.status==='approve'));
 persist();
}
$('scenario').addEventListener('change',event=>{state={scenario:event.target.value,status:'investigate',history:[]};render();});
$('draft').addEventListener('click',()=>{state.status='draft';state.history.push({event:'draft',at:new Date().toISOString()});render();});
$('approve').addEventListener('click',()=>{state.status='approve';state.history.push({event:'demo-approval',at:new Date().toISOString()});render();});
$('undo').addEventListener('click',()=>{state.status='undo';state.history.push({event:'demo-undo',at:new Date().toISOString()});render();});
render();
function setStatus(id,title,detail){$(id+'-status').textContent=title;$(id+'-details').textContent=detail;}
async function audit(){
 $('audit-log').textContent='Checking the live Cloudflare test site and trial database…';
 $('start-audit').disabled=true;$('rerun-audit').disabled=true;
 try{
  const response=await fetch('/api/growth-lab/readiness',{cache:'no-store',signal:AbortSignal.timeout(15000)});
  const report=await response.json();
  if(!response.ok||report.mode!=='test'||!Array.isArray(report.checks))throw Error('The testing API is unavailable');
  const byId=Object.fromEntries(report.checks.map(x=>[x.id,x]));
  const db=byId.database||{},seo=byId.seo||{},content=byId.published_content||{};
  setStatus('db',db.ok?'Connected':'Not ready',db.note||'Separate trial database');
  setStatus('seo',seo.ok?'Protected':'Needs attention',seo.note||'Checking indexing');
  setStatus('content',content.ok?'Available':'Not ready',content.note||'Published trial content');
  const failed=report.checks.filter(x=>!x.ok);
  $('audit-log').textContent=failed.length
   ? 'Live check: '+failed.length+' item(s) need attention. '+failed.map(x=>x.note).join(' ')
   : 'All '+report.checks.length+' live technical checks passed. This does not mean Google Search Console or production ownership is verified.';
 }catch(e){
  for(const id of ['db','seo','content'])setStatus(id,'Check failed','Could not verify the current state');
  $('audit-log').textContent='Live checks were not available: '+(e.name==='TimeoutError'?'request timed out':'please retry shortly')+'. No success is assumed.';
 }finally{$('start-audit').disabled=false;$('rerun-audit').disabled=false;}
}
$('start-audit').addEventListener('click',audit);
$('rerun-audit').addEventListener('click',audit);
const gates=[...document.querySelectorAll('[data-gate]')];
function updateGates(){const count=gates.filter(x=>x.checked).length;$('launch-status').textContent=count+' of 5 rehearsal approvals'+(count===5?' · SIMULATION ONLY':'');}
gates.forEach(x=>x.addEventListener('change',updateGates));
$('reset-gates').addEventListener('click',()=>{gates.forEach(x=>x.checked=false);updateGates();});updateGates();


const sample='Query,Clicks,Impressions,CTR,Position\n"fictional local query",3,300,1%,10\n"fictional brand query",40,100,40%,1\n"fictional informational query",5,230,2.17%,12\n';
function showGsc(text,source){
 try{
  const result=analyzeGscCSV(text);
  $('gsc-data-label').textContent=source==='sample'?'FICTIONAL EXAMPLE — NOT REAL GSC':'USER CSV — SOURCE NOT VERIFIED';
  $('gsc-total').textContent=result.totals.clicks+' clicks / '+result.totals.impressions+' impressions';
  $('gsc-message').textContent=result.rows+' '+result.dimension+' rows · '+(result.ctr*100).toFixed(2)+'% weighted CTR. Opportunity rules are examples, not proof of causation.';
  const container=$('gsc-opportunities');container.textContent='';
  if(!result.opportunities.length){container.textContent='No rows met the minimum sample opportunity criteria.';return;}
  const ul=document.createElement('ul');
  for(const item of result.opportunities){
   const li=document.createElement('li');
   li.textContent=item.label+' — '+item.impressions+' impressions, '+(item.ctr*100).toFixed(1)+'% CTR';
   ul.append(li);
  }
  container.append(ul);
 }catch(e){
  $('gsc-data-label').textContent='INVALID OR UNSUPPORTED CSV';
  $('gsc-total').textContent='No data loaded';
  $('gsc-message').textContent=e.message;
  $('gsc-opportunities').textContent='';
 }
}
$('gsc-example').addEventListener('click',()=>showGsc(sample,'sample'));
$('gsc-upload').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file)return;
 if(file.size>700000){showGsc('','file');return;}
 showGsc(await file.text(),'file');
});
