// Handover progress is stored in private service-only storage, never the public site draft.
// Provider ownership is NOT validated by owner-selected progress statuses.
const $=selector=>document.querySelector(selector);
let plan=null,changes=false;
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const report=(message,error=false)=>{const el=$('[data-handover-message]');if(el){el.textContent=message;el.className=error?'notice error':'notice success';}};
async function request(path,options={}){
 const response=await fetch('/api/admin/'+path,{...options,cache:'no-store',headers:{'content-type':'application/json',...(options.headers||{})}});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(body.error||'The handover service is not available.');
 return body;
}
const options=[['todo','Not started'],['in_progress','In progress'],['submitted','Submitted for review (not verified)']];
function draw(){
 if(!plan)return;
 $('[data-handover-sale-model]').value=plan.saleModel||'undecided';
 const steps=plan.steps||[],progress=plan.progress||{};
 const n=steps.filter(s=>progress[s.id]==='submitted').length;
 $('[data-handover-count]').textContent=n+'/'+steps.length+' submitted for review — 0 provider ownership transfers verified here';
 $('[data-handover-list]').innerHTML=steps.map((step,index)=>
   '<article class="handover-step"><p class="fine">Step '+(index+1)+'</p>'+
   '<h3>'+escapeHtml(step.title)+'</h3><p>'+escapeHtml(step.description)+'</p>'+
   '<label>Owner-reported progress<select data-handover-step="'+escapeHtml(step.id)+'">'+
   options.map(([v,label])=>'<option value="'+v+'" '+((progress[step.id]||'todo')===v?'selected':'')+'>'+escapeHtml(label)+'</option>').join('')+
   '</select></label><button type="button" class="secondary" data-handover-navigate="'+escapeHtml(step.tab)+'">Open relevant admin section →</button></article>'
 ).join('');
 const indicators=plan.indicators||[];
 $('[data-handover-indicators]').innerHTML=indicators.map(x=>
   '<li><strong>'+escapeHtml(x.configured?'Configured':'Not configured')+'</strong> — '+escapeHtml(x.label)+'</li>').join('');
}
async function refresh(){
 if(changes&&!confirm('Discard unsaved handover progress?'))return;
 report('Loading private handover plan…');
 try{plan=await request('handover');changes=false;draw();report('Plan loaded privately. External ownership remains unverified.');}
 catch(error){report(error.message||'Could not load the handover plan.',true);}
}
async function save(){
 if(!plan)return;
 const button=$('[data-handover-save]');
 button.disabled=true;
 report('Saving private handover progress…');
 try{
  const updated=await request('handover',{method:'PUT',body:JSON.stringify({
   expectedVersion:plan.version,saleModel:plan.saleModel,progress:plan.progress
  })});
  plan.version=updated.version;plan.updatedAt=updated.updatedAt;changes=false;
  report('Saved. Submitted steps are awaiting independent evidence verification.');
 }catch(error){report(error.message||'Could not save the plan.',true);}
 finally{button.disabled=false;}
}
async function exportOwnerData(){
 const button=$('[data-handover-export]');button.disabled=true;
 report('Preparing authenticated owner content export…');
 try{
  const data=await request('handover-export');
  const content=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const uri=URL.createObjectURL(content);
  const a=document.createElement('a');a.href=uri;a.download='lema-owner-content-export.json';
  document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(uri);
  report('Content export prepared. This is NOT a database or media backup.');
 }catch(error){report(error.message||'Export failed.',true);}
 finally{button.disabled=false;}
}
const nav=$('[data-tab="handover"]');
nav?.addEventListener('click',()=>void refresh());
$('[data-handover-refresh]')?.addEventListener('click',()=>void refresh());
$('[data-handover-save]')?.addEventListener('click',()=>void save());
$('[data-handover-export]')?.addEventListener('click',()=>void exportOwnerData());
$('[data-handover-sale-model]')?.addEventListener('change',event=>{
 if(!plan)return;plan.saleModel=event.target.value;changes=true;report('Unsaved handover changes.');
});
$('[data-handover-list]')?.addEventListener('change',event=>{
 const id=event.target?.dataset?.handoverStep;
 if(!id||!plan)return;
 plan.progress={...plan.progress,[id]:event.target.value};changes=true;draw();
 report('Unsaved handover changes. Review each step before submitting.');
});
$('[data-handover-list]')?.addEventListener('click',event=>{
 const tab=event.target?.closest?.('[data-handover-navigate]')?.dataset?.handoverNavigate;
 if(tab&&tab!=='handover')$('[data-tab="'+tab+'"]')?.click();
});
window.addEventListener('beforeunload',event=>{if(changes){event.preventDefault();event.returnValue='';}});
