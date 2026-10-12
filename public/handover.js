// Beginner-friendly website setup. Real progress uses private service-only storage.
// PRACTICE IS MEMORY-ONLY: never save or export, send sample emails, or open production editors.
const $=selector=>document.querySelector(selector);
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options=[['todo','Not started'],['in_progress','I am working on this'],['submitted','Please review this for me']];
const easySteps=[
 {id:'business-approval',title:'Check your website',description:'Look at your name, photos, prices, services and contact details. Are they correct?',action:'Review website details',tab:'business'},
 {id:'email-domain',title:'Use your own email',description:'Have an email address that only you control. You can choose a website address later with our help. You do not need to buy anything to practice.',action:'Create a Google email',url:'https://accounts.google.com/signup'},
 {id:'source-agreement',title:'Choose who manages it',description:'Would you like us to handle the technical work, or do you want accounts in your own name? We will explain the agreement first.',action:null}
];
let plan=null,realPlan=null,practicePlan=null,practice=false,changes=false,practiceEmail='' ,loadSequence=0,scanSequence=0,scanInProgress=false,lastScan=null;
const report=(message,error=false)=>{const el=$('[data-handover-message]');if(el){el.textContent=message;el.className=error?'notice error':'notice success';}};
async function request(path,options={}){
 const response=await fetch('/api/admin/'+path,{...options,cache:'no-store',headers:{'content-type':'application/json',...(options.headers||{})}});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(body.error||'Could not load website setup.');
 return body;
}
const firstOutstanding=()=>easySteps.find(s=>(plan?.progress?.[s.id]||'todo')!=='submitted');
const markChanged=()=>{changes=true;report(practice?'Practice only — this is not saved anywhere.':'Your changes are not saved yet. Choose Save my progress.');};
const checkLabels={passed:'Working',configured:'Configured — ownership unverified',attention:'Needs attention',owner_action:'Needs owner's decision',developer_action:'Needs technical setup'};
const drawScan=(scan)=>{
 const summary=$('[data-handover-auto-summary]'),body=$('[data-handover-auto-results]');
 if(practice){
   summary.textContent='Practice: automatic checks are not run against Lema’s live website.';
   body.innerHTML='<p>In the real setup we will check the website automatically. No practice request is sent to any server.</p>';
   return;
 }
 if(!scan){summary.textContent='Checking live website…';body.innerHTML='';return;}
 if(scan.error){summary.textContent='Could not finish the automatic check. Please try Check again.';body.innerHTML='';return;}
 const checks=scan.checks||[];
 const working=checks.filter(x=>x.status==='passed'||x.status==='configured').length;
 summary.textContent=working+'/'+checks.length+' technical checks working or configured. Items below explain anything still needed.';
 body.innerHTML=checks.map(x=>'<article class="auto-check-item">'+
  '<div><strong>'+escapeHtml(x.title)+'</strong><p class="fine">'+escapeHtml(x.detail)+'</p>'+
  (x.action?'<p class="fine">'+escapeHtml(x.action)+'</p>':'')+'</div>'+
  '<span class="auto-check-status '+escapeHtml(x.status)+'">'+escapeHtml(checkLabels[x.status]||'Not verified')+'</span></article>').join('');
};
async function runAutoCheck(){
 if(practice){drawScan(null);return;}
 if(scanInProgress)return;
 const run=++scanSequence;
 scanInProgress=true;
 $('[data-handover-check]').disabled=true;
 drawScan(null);
 try{
  const result=await request('setup-check');
  if(practice||run!==scanSequence)return;
  lastScan=result;drawScan(result);
 }catch(error){
  if(practice||run!==scanSequence)return;
  lastScan={error:true};drawScan(lastScan);
 }finally{
  scanInProgress=false;
  $('[data-handover-check]').disabled=false;
 }
}
const selectOptions=(selected)=>options.map(([value,label])=>
 '<option value="'+value+'" '+(selected===value?'selected':'')+'>'+escapeHtml(label)+'</option>').join('');
function draw(){
 if(!plan)return;
 const status=plan.progress||{},steps=plan.steps||[];
 const total=steps.filter(s=>status[s.id]==='submitted').length;
 const clientTotal=easySteps.filter(s=>status[s.id]==='submitted').length;
 $('[data-handover-sale-model]').value=plan.saleModel||'undecided';
 const count=$('[data-handover-count]');
 count.textContent=total+'/'+steps.length+' tasks sent for review. Your three steps: '+clientTotal+'/3 sent.';
 const next=firstOutstanding();
 $('[data-handover-next]').textContent=next?'Next: '+next.title:'Your three steps were sent for review.';
 $('[data-handover-simple]').innerHTML=easySteps.map((step,index)=>{
  const selected=status[step.id]||'todo';
  const action=step.url?
    (practice?'<p class="fine">In practice, no new account is created.</p>':
     '<a href="'+escapeHtml(step.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(step.action)+' ↗</a>'):
    (step.tab?(practice?'<p class="fine">Practice only — the real editor stays untouched.</p>':
     '<button class="secondary" type="button" data-simple-navigate="'+escapeHtml(step.tab)+'">'+escapeHtml(step.action)+' →</button>'):'');
  const ownerType=step.id==='source-agreement'?
    '<label>Who should look after the technical setup?<select data-simple-sale-model>'+
    [['undecided','I am not sure yet'],['managed','Please manage it for me'],['client_owned','I want to own the accounts'],['full_source','I purchased the website code']].map(([v,label])=>
      '<option value="'+v+'" '+(plan.saleModel===v?'selected':'')+'>'+escapeHtml(label)+'</option>').join('')+
    '</select></label>':'';
  return '<article class="handover-easy-step"><p class="easy-number">STEP '+(index+1)+' OF 3</p>'+
    '<h3>'+escapeHtml(step.title)+'</h3><p>'+escapeHtml(step.description)+'</p>'+
    ownerType+'<label>Where are you with this?<select data-simple-step="'+escapeHtml(step.id)+'">'+
    selectOptions(selected)+'</select></label><div class="easy-actions">'+action+'</div></article>';
 }).join('');
 $('[data-handover-list]').innerHTML=steps.map((step,index)=>
  '<article class="handover-step"><p class="fine">Technical item '+(index+1)+'</p>'+
  '<h3>'+escapeHtml(step.title)+'</h3><p>'+escapeHtml(step.description)+'</p>'+
  '<label>Tracking only<select data-handover-step="'+escapeHtml(step.id)+'">'+
  selectOptions(status[step.id]||'todo')+'</select></label>'+
  (practice?'<p class="fine">Links to real editors are disabled in practice.</p>':
   '<button type="button" class="secondary" data-handover-navigate="'+escapeHtml(step.tab)+'">Open relevant section →</button>')+
  '</article>').join('');
 $('[data-handover-indicators]').innerHTML=(practice?[]:plan.indicators||[]).map(x=>
  '<li><strong>'+escapeHtml(x.configured?'Configured':'Not configured')+'</strong> — '+escapeHtml(x.label)+'</li>').join('');
 $('[data-handover-practice-banner]').hidden=!practice;
 $('[data-handover-practice]').setAttribute('aria-pressed',String(practice));
 $('[data-handover-real]').setAttribute('aria-pressed',String(!practice));
 $('[data-handover-practice]').className=practice?'primary':'secondary';
 $('[data-handover-real]').className=practice?'secondary':'primary';
 $('[data-handover-export]').disabled=practice;
 $('[data-handover-save]').textContent=practice?'Try saving (practice only)':'Save my progress';
}
async function refresh(){
 if(practice){draw();report('You are practising. Nothing is saved or sent to anyone.');return;}
 if(changes&&!confirm('Discard unsaved setup changes and reload?'))return;
 report('Loading your website setup…');
 const requestId=++loadSequence;
 try{
  const loaded=await request('handover');
  if(practice||requestId!==loadSequence)return;
  plan=loaded;realPlan=plan;changes=false;draw();report('Ready. Complete the three simple steps above.');
  if(!lastScan)void runAutoCheck(); else drawScan(lastScan);
 }
 catch(error){report(error.message||'Could not load setup. Sign in again and retry.',true);}
}
function choosePractice(){
 if(practice)return;
 if(changes&&!confirm('Leave without saving your real setup changes?'))return;
 loadSequence++;scanSequence++;
 realPlan=plan;practice=true;changes=false;practiceEmail='';
 if($('[data-handover-practice-email]'))$('[data-handover-practice-email]').value='';
 const steps=plan?.steps||easySteps.map(s=>({id:s.id,title:s.title,description:s.description,tab:s.tab||'handover'}));
 practicePlan={version:0,saleModel:'undecided',progress:{},steps,indicators:[]};
 plan=practicePlan;draw();drawScan(null);report('Practice mode is ON. No real account, payment, data or website content can change here.');
}
function chooseReal(){
 if(!practice)return;
 practice=false;practicePlan=null;practiceEmail='';changes=false;
 plan=realPlan;draw();if(lastScan)drawScan(lastScan);
 if(plan){report('Back to real website setup. Your practice changes were discarded.');if(!lastScan)void runAutoCheck();}
 else void refresh();
}
async function save(){
 if(!plan)return report('Open this page again to load the setup.',true);
 if(practice){changes=false;report('Practice complete! Nothing was saved or sent. Switch to Real website setup when ready.');return;}
 const button=$('[data-handover-save]');button.disabled=true;report('Saving your progress…');
 try{
  const updated=await request('handover',{method:'PUT',body:JSON.stringify({
   expectedVersion:plan.version,saleModel:plan.saleModel,progress:plan.progress
  })});
  plan.version=updated.version;plan.updatedAt=updated.updatedAt;changes=false;
  realPlan=plan;draw();report('Saved. Items marked “Please review” are waiting for a person to check them.');
 }catch(error){report(error.message||'Could not save. Your changes are still on this screen.',true);}
 finally{button.disabled=false;}
}
async function exportOwnerData(){
 if(practice)return report('Exports are disabled in practice mode.',true);
 const button=$('[data-handover-export]');button.disabled=true;report('Preparing your private website information…');
 try{
  const data=await request('handover-export');
  const content=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const uri=URL.createObjectURL(content);
  const a=document.createElement('a');a.href=uri;a.download='lema-owner-content-export.json';
  document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(uri);
  report('Downloaded. This is website information, NOT a full media or database backup.');
 }catch(error){report(error.message||'The download did not complete.',true);}
 finally{button.disabled=practice;}
}
$('[data-tab="handover"]')?.addEventListener('click',()=>void refresh());
$('[data-handover-refresh]')?.addEventListener('click',()=>void refresh());
$('[data-handover-check]')?.addEventListener('click',()=>void runAutoCheck());
$('[data-handover-save]')?.addEventListener('click',()=>void save());
$('[data-handover-export]')?.addEventListener('click',()=>void exportOwnerData());
$('[data-handover-practice]')?.addEventListener('click',choosePractice);
$('[data-handover-real]')?.addEventListener('click',chooseReal);
$('[data-handover-practice-email]')?.addEventListener('input',event=>{
 if(!practice)return;
 practiceEmail=String(event.target.value||'').trim().slice(0,254);
 const note=$('[data-handover-practice-email-note]');
 note.textContent=!practiceEmail?'You can leave this blank. No email or password is needed.':
 /^[^\s@<>]+@[^\s@<>]+\.[a-zA-Z]{2,}$/.test(practiceEmail)?
 'Looks like an email address. It has NOT been sent, registered, or saved.':
 'Please enter a valid email address. Never enter a password.';
});
function updateStep(id,value){
 if(!plan)return;
 const match=plan.steps.some(s=>s.id===id);
 if(!match||!options.some(([v])=>v===value))return;
 plan.progress={...plan.progress,[id]:value};draw();markChanged();
}
$('[data-handover-sale-model]')?.addEventListener('change',event=>{
 if(!plan)return;plan.saleModel=event.target.value;draw();markChanged();
});
$('[data-handover-simple]')?.addEventListener('change',event=>{
 const id=event.target?.dataset?.simpleStep;
 if(id){updateStep(id,event.target.value);return;}
 if(event.target?.dataset?.simpleSaleModel){
  if(!plan)return;plan.saleModel=event.target.value;draw();markChanged();
 }
});
$('[data-handover-list]')?.addEventListener('change',event=>{
 const id=event.target?.dataset?.handoverStep;
 if(id)updateStep(id,event.target.value);
});
$('[data-handover-simple]')?.addEventListener('click',event=>{
 if(practice)return;
 const tab=event.target?.closest?.('[data-simple-navigate]')?.dataset?.simpleNavigate;
 if(tab)$('[data-tab="'+tab+'"]')?.click();
});
$('[data-handover-list]')?.addEventListener('click',event=>{
 if(practice)return;
 const tab=event.target?.closest?.('[data-handover-navigate]')?.dataset?.handoverNavigate;
 if(tab&&tab!=='handover')$('[data-tab="'+tab+'"]')?.click();
});
window.addEventListener('beforeunload',event=>{
 if(changes&&!practice){event.preventDefault();event.returnValue='';}
});
