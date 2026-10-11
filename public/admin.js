const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
let state=null,knowledge=[],liveReviews=[],knowledgeDirty=false,dirty=false,seoDefaults=null,seoCurrent='/',savedDraftSnapshot='',savingDraft=null;
const hasUnsavedDraft=()=>Boolean(state)&&(dirty||JSON.stringify(state.draft)!==savedDraftSnapshot);
const clone=value=>JSON.parse(JSON.stringify(value));
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notice=(text,type='')=>{const el=$('[data-notice]');if(!el)return;el.textContent=text;el.className='notice '+type;};
async function api(path,options={}){const response=await fetch('/api/admin/'+path,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Request failed.');return data;}
const getPath=(object,path)=>path.split('.').reduce((value,key)=>value?.[key],object);
const setPath=(object,path,value)=>{const keys=path.split('.');let target=object;keys.slice(0,-1).forEach(key=>target=target[key]??={});target[keys.at(-1)]=value;};
function setDirty(value=true){dirty=value;notice(value?'Unpublished changes in this browser. Choose Save draft when ready.':'Draft is saved privately.',value?'':'success');}
function showLogin(message=''){ $('[data-login]').hidden=false;$('[data-dashboard]').hidden=true;$('[data-login-message]').textContent=message; }
function showDashboard(){ $('[data-login]').hidden=true;$('[data-dashboard]').hidden=false; }
function switchTab(name){$$('[data-tab]').forEach(button=>button.classList.toggle('active',button.dataset.tab===name));$$('[data-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.panel===name));}
function initializeBusiness(){
 if(!state?.draft)return;
 if(!state.draft.business&&seoDefaults?.business)state.draft.business=clone(seoDefaults.business);
}
function renderBusiness(){
 const b=state?.draft?.business;
 const warn=$('[data-business-warning]');
 if(warn)warn.hidden=Boolean(b);
 $$('[data-business-field]').forEach(input=>{
   input.disabled=!b;
   if(!b)return;
   input.value=b[input.dataset.businessField]??'';
   input.oninput=()=>{b[input.dataset.businessField]=input.value;setDirty();updateSeoPreview();};
 });
}
function validateBusinessDraft(){
 const b=state?.draft?.business;
 if(!b)return; // Older drafts remain backward compatible if defaults could not load.
 for(const [key,min,max] of [['name',2,80],['wordmark',2,70],['tagline',0,90],['city',2,90]]){
  if(typeof b[key]!=='string'||b[key].trim().length<min||b[key].length>max)
    throw new Error('Business identity: check '+key+'.');
 }
 if(typeof b.email!=='string'||b.email.length>254||
   (b.email!==''&&!/^[^\\s@<>]+@[^\\s@<>]+\\.[a-zA-Z]{2,}$/.test(b.email)))
  throw new Error('Business identity: enter a valid email address.');
 if(!((b.logoUrl==='/assets/mark.svg')||
   (/^\\/images\\/[a-z0-9/_-]+\\.(?:png|jpe?g|webp)$/i.test(b.logoUrl)&&!b.logoUrl.includes('..'))||
   /^https:\\/\\/[^\\s<>"']+\\/storage\\/v1\\/object\\/public\\/witness-lema-gallery\\//.test(b.logoUrl)))
  throw new Error('Business identity: use an existing local image or approved uploaded logo URL.');
 if(typeof b.requestedDomain!=='string'||(b.requestedDomain&&!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/i.test(b.requestedDomain)))
  throw new Error('Business identity: enter a domain only (example.com), without https://.');
}
function populateProfile(){$$('[data-path]').forEach(input=>{input.value=getPath(state.draft,input.dataset.path)||'';input.oninput=()=>{setPath(state.draft,input.dataset.path,input.value);setDirty();};});}
function serviceCard(service,index){return `<article class="repeat-card"><span class="number">${String(index+1).padStart(2,'0')}</span><div class="repeat-fields"><label>Title<input data-service-field="title" data-index="${index}" value="${esc(service.title)}"></label><label>Price / label<input data-service-field="tag" data-index="${index}" value="${esc(service.tag)}"></label><label class="wide">Description<textarea rows="3" data-service-field="text" data-index="${index}">${esc(service.text)}</textarea></label><label class="wide">Image path or URL<input data-service-field="image" data-index="${index}" value="${esc(service.image)}"></label></div><div class="card-actions"><button data-service-move="-1" data-index="${index}" aria-label="Move up">↑</button><button data-service-move="1" data-index="${index}" aria-label="Move down">↓</button><button class="danger" data-service-remove data-index="${index}" aria-label="Remove">×</button></div></article>`;}
function renderServices(){const holder=$('[data-services]');holder.innerHTML=(state.draft.services||[]).map(serviceCard).join('')||'<p>No services yet.</p>';holder.querySelectorAll('[data-service-field]').forEach(input=>input.oninput=()=>{state.draft.services[+input.dataset.index][input.dataset.serviceField]=input.value;setDirty();});holder.querySelectorAll('[data-service-move]').forEach(button=>button.onclick=()=>{const i=+button.dataset.index,j=i+(+button.dataset.serviceMove);if(j<0||j>=state.draft.services.length)return;[state.draft.services[i],state.draft.services[j]]=[state.draft.services[j],state.draft.services[i]];renderServices();setDirty();});holder.querySelectorAll('[data-service-remove]').forEach(button=>button.onclick=()=>{state.draft.services.splice(+button.dataset.index,1);renderServices();setDirty();});}
function photoCard(image,index){const about=(state.draft.aboutImages||[]).includes(image.src);return `<article class="photo-card"><img src="${esc(image.src)}" alt=""><label>Title<input data-photo-field="title" data-index="${index}" value="${esc(image.title)}"></label><label>Alt text<input data-photo-field="alt" data-index="${index}" value="${esc(image.alt)}"></label><label>Category<input data-photo-field="category" data-index="${index}" value="${esc(image.category)}"></label><div class="checks"><label><input type="checkbox" data-photo-hero data-index="${index}" ${image.hero?'checked':''}> Home hero</label><label><input type="checkbox" data-photo-about data-index="${index}" ${about?'checked':''}> About</label></div><button data-photo-remove data-index="${index}">Remove from draft</button></article>`;}
function renderPhotos(){const holder=$('[data-photos]');holder.innerHTML=(state.draft.images||[]).map(photoCard).join('');holder.querySelectorAll('[data-photo-field]').forEach(input=>input.oninput=()=>{state.draft.images[+input.dataset.index][input.dataset.photoField]=input.value;setDirty();});holder.querySelectorAll('[data-photo-hero]').forEach(input=>input.onchange=()=>{state.draft.images[+input.dataset.index].hero=input.checked;setDirty();});holder.querySelectorAll('[data-photo-about]').forEach(input=>input.onchange=()=>{const src=state.draft.images[+input.dataset.index].src;state.draft.aboutImages=(state.draft.aboutImages||[]).filter(item=>item!==src);if(input.checked)state.draft.aboutImages.push(src);renderPhotos();setDirty();});holder.querySelectorAll('[data-photo-remove]').forEach(button=>button.onclick=()=>{const image=state.draft.images[+button.dataset.index];if(!confirm('Remove this photograph from the draft? The stored file will remain available.'))return;state.draft.images.splice(+button.dataset.index,1);state.draft.aboutImages=(state.draft.aboutImages||[]).filter(src=>src!==image.src);renderPhotos();setDirty();});}
function answerCard(item,index){return `<article class="repeat-card"><span class="number">${String(index+1).padStart(2,'0')}</span><div class="repeat-fields"><label class="wide">Question<input data-answer-field="question" data-index="${index}" value="${esc(item.question)}"></label><label class="wide">Answer<textarea rows="4" data-answer-field="answer" data-index="${index}">${esc(item.answer)}</textarea></label><label>Keywords, separated by commas<input data-answer-field="keywords" data-index="${index}" value="${esc((item.keywords||[]).join(', '))}"></label><label>Related page<input data-answer-field="href" data-index="${index}" value="${esc(item.href)}"></label></div><div class="card-actions"><button class="danger" data-answer-remove data-index="${index}" aria-label="Remove">×</button></div></article>`;}
function renderAnswers(){const holder=$('[data-answers]');holder.innerHTML=knowledge.map(answerCard).join('');holder.querySelectorAll('[data-answer-field]').forEach(input=>input.oninput=()=>{const value=input.dataset.answerField==='keywords'?input.value.split(',').map(x=>x.trim()).filter(Boolean):input.value;knowledge[+input.dataset.index][input.dataset.answerField]=value;knowledgeDirty=true;notice('Assistant changes are not saved yet. Choose Save answers.','');});holder.querySelectorAll('[data-answer-remove]').forEach(button=>button.onclick=()=>{knowledge.splice(+button.dataset.index,1);renderAnswers();});}
function renderHistory(){const holder=$('[data-history]');holder.innerHTML=(state.history||[]).slice().reverse().map(item=>`<article><span>Version ${item.version} · ${new Date(item.publishedAt).toLocaleString()}</span><button class="secondary" data-restore="${item.version}">Restore to draft</button></article>`).join('')||'<p>No earlier published versions yet.</p>';holder.querySelectorAll('[data-restore]').forEach(button=>button.onclick=()=>restoreVersion(+button.dataset.restore));}
const seoNames={'/':'Home','/about/':'About','/gallery/':'Gallery','/services/':'Services','/contact/':'Contact','/reviews/':'Reviews'};
function initializeSeo(){
  if(!seoDefaults?.pages||!state?.draft)return;
  if(!state.draft.seo||typeof state.draft.seo!=='object')state.draft.seo={pages:{}};
  if(!state.draft.seo.pages||typeof state.draft.seo.pages!=='object')state.draft.seo.pages={};
  for(const [route,values] of Object.entries(seoDefaults.pages)){
    if(!state.draft.seo.pages[route])state.draft.seo.pages[route]=clone(values);
  }
}
function seoEntry(){return state?.draft?.seo?.pages?.[seoCurrent];}
function updateSeoPreview(){
  const e=seoEntry();if(!e)return;
  $('[data-seo-preview-title]').textContent=e.title||'(Title needed)';
  $('[data-seo-preview-description]').textContent=e.description||'(Description needed)';
  $('[data-seo-preview-url]').textContent=(window.location?.host||'Current website')+seoCurrent;
  const photo=$('[data-seo-preview-image]');
  if(photo){photo.src=e.image||'';photo.hidden=!e.image;}
  $('[data-seo-count="title"]').textContent=String((e.title||'').length)+'/70';
  $('[data-seo-count="description"]').textContent=String((e.description||'').length)+'/170';
}
function renderSeoEditor(){
  if(!seoDefaults?.pages)return;
  initializeSeo();
  const e=seoEntry();if(!e)return;
  $('[data-seo-page]').value=seoCurrent;
  $$('[data-seo-field]').forEach(input=>{
    if(input.dataset.seoField==='image')return;
    input.value=e[input.dataset.seoField]||'';
    input.oninput=()=>{e[input.dataset.seoField]=input.value;setDirty();updateSeoPreview();};
  });
  $$('[data-seo-paragraph]').forEach(input=>{
    const index=Number(input.dataset.seoParagraph);
    input.value=e.paragraphs?.[index]||'';
    input.oninput=()=>{
      if(!Array.isArray(e.paragraphs))e.paragraphs=['',''];
      e.paragraphs[index]=input.value;
      setDirty();updateSeoPreview();
    };
  });
  const image=$('[data-seo-images]'),pictures=state.draft.images||[];
  const opts=[...new Map(pictures.filter(im=>im&&im.src).map((im,i)=>[im.src,im.title||'Photo '+(i+1)])).entries()];
  if(e.image&&!opts.some(([src])=>src===e.image))opts.unshift([e.image,'Current sharing image']);
  image.innerHTML=opts.map(([src,name])=>'<option value="'+esc(src)+'">'+esc(name)+'</option>').join('');
  image.value=e.image||opts[0]?.[0]||'';
  image.onchange=()=>{e.image=image.value;setDirty();updateSeoPreview();};
  const indexer=$('[data-seo-index]');indexer.checked=e.index!==false;
  indexer.onchange=()=>{e.index=indexer.checked;setDirty();updateSeoPreview();};
  const related=$('[data-seo-related]');
  related.innerHTML=Object.entries(seoNames).filter(([r])=>r!==seoCurrent).map(([route,name])=>
    '<label><input type="checkbox" data-seo-link="'+esc(route)+'" '+((e.links||[]).some(x=>x.href===route)?'checked':'')+'>'+esc(name)+'</label>').join('');
  related.querySelectorAll('[data-seo-link]').forEach(input=>input.onchange=()=>{
    e.links=[...related.querySelectorAll('[data-seo-link]:checked')].map(node=>({href:node.dataset.seoLink,label:'Explore '+seoNames[node.dataset.seoLink]}));
    setDirty();updateSeoPreview();
  });
  updateSeoPreview();
}
function validateSeoDraft(){
  if(!state?.draft?.seo)return;
  for(const [route,e] of Object.entries(state.draft.seo.pages||{})){
    if(!seoNames[route])throw new Error('Unknown SEO page.');
    if(!e.title||e.title.trim().length<10||e.title.length>70)throw new Error('SEO title for '+seoNames[route]+' must be 10–70 characters.');
    if(!e.description||e.description.trim().length<40||e.description.length>170)throw new Error('SEO description for '+seoNames[route]+' must be 40–170 characters.');
    if(!e.heading||e.heading.trim().length<12||e.heading.length>110)throw new Error('SEO section heading for '+seoNames[route]+' must be 12–110 characters.');
    if(!Array.isArray(e.paragraphs)||e.paragraphs.length<1||e.paragraphs.length>4||!e.paragraphs.every(p=>typeof p==='string'&&p.trim().length>=60&&p.length<=850))throw new Error('Write 2 helpful paragraphs of at least 60 characters on '+seoNames[route]+'.');
    if(!Array.isArray(e.links)||e.links.length<1||e.links.length>4)throw new Error('Choose at least one related page on '+seoNames[route]+'.');
  }
}
function editableLinks(type) { return type === 'afterhours' ? state.draft.afterhours.links : state.draft.contactLinks; }
function initializeEditableSections(){
  if(!state.draft.afterhours || typeof state.draft.afterhours!=='object')state.draft.afterhours={
    enabled:true,title:'Lema Afterhours',intro:'A thoughtful way to stay in touch and discover official updates.',
    links:Object.entries(state.draft.social||{}).filter(([,url])=>url).map(([label,url])=>({label:label[0].toUpperCase()+label.slice(1),url}))
  };
  if(!Array.isArray(state.draft.afterhours.links))state.draft.afterhours.links=[];
  if(!Array.isArray(state.draft.contactLinks))state.draft.contactLinks=Object.entries(state.draft.social||{}).filter(([,url])=>url).map(([label,url])=>({label:label[0].toUpperCase()+label.slice(1),url}));
  if(!Array.isArray(state.draft.reviews))state.draft.reviews=[];
}
function renderLinks(){
  const config=state.draft.afterhours;
  $('[data-afterhours-enabled]').checked=config.enabled!==false;
  $('[data-afterhours-enabled]').onchange=e=>{config.enabled=e.target.checked;setDirty();};
  $$('[data-afterhours-field]').forEach(input=>{
    input.value=config[input.dataset.afterhoursField]||'';
    input.oninput=()=>{config[input.dataset.afterhoursField]=input.value;setDirty();};
  });
  $$('[data-links-editor]').forEach(holder=>{
    const type=holder.dataset.linksEditor,links=editableLinks(type);
    holder.innerHTML=links.map((link,index)=>'<div class="link-edit-row"><label>App / channel name<input maxlength="60" data-link-field="label" data-index="'+index+'" value="'+esc(link.label)+'" placeholder="WhatsApp, Telegram, YouTube…"></label><label>HTTPS link<input type="url" maxlength="2048" data-link-field="url" data-index="'+index+'" value="'+esc(link.url)+'" placeholder="https://…"></label><button type="button" class="danger" data-link-remove="'+index+'" aria-label="Remove link">×</button></div>').join('')||'<p class="fine">No channels. Add one when you are ready.</p>';
    holder.querySelectorAll('[data-link-field]').forEach(input=>input.oninput=()=>{links[+input.dataset.index][input.dataset.linkField]=input.value;setDirty();});
    holder.querySelectorAll('[data-link-remove]').forEach(button=>button.onclick=()=>{links.splice(+button.dataset.linkRemove,1);renderLinks();setDirty();});
  });
}
function renderReviews(){
  const holder=$('[data-reviews-editor]');
  if(!holder)return;
  holder.innerHTML=liveReviews.length?liveReviews.map(item=>
    '<article class="repeat-card"><div class="repeat-fields"><p class="fine">'+
      esc(item.language==='hi'?'Hindi · हिंदी':'English')+
      ' · '+esc(item.source==='owner'?'Added by owner':'Visitor review')+'</p>'+
      '<p class="review-pending-body">'+esc(item.text)+'</p><p>— '+esc(item.author)+'</p></div>'+
      '<div class="card-actions"><button type="button" class="danger" data-review-delete="'+
       Number(item.id)+'">Delete review</button></div></article>'
  ).join(''):'<p class="fine">No published reviews yet. Visitors can leave their own review on the Reviews page.</p>';
  holder.querySelectorAll('[data-review-delete]').forEach(button=>button.onclick=async()=>{
    const id=Number(button.dataset.reviewDelete);
    if(!confirm('Delete this published review from the website?'))return;
    button.disabled=true;
    try{
      const response=await api('review-inbox',{method:'DELETE',body:JSON.stringify({id})});
      if(response.ok!==true)throw new Error('Could not delete review.');
      liveReviews=liveReviews.filter(item=>Number(item.id)!==id);
      renderReviews();notice('Review deleted from the live website.','success');
    }catch(error){button.disabled=false;notice(error.message||'Could not delete review.','error');}
  });
}
async function loadLiveReviews(){
  try{
    const response=await api('review-inbox');
    liveReviews=Array.isArray(response.items)?response.items:[];
    renderReviews();
  }catch(error){const holder=$('[data-reviews-editor]');if(holder)holder.textContent='Could not load published reviews. Try Refresh reviews.';}
}
async function addLiveReview(event){
  event.preventDefault();
  const form=event.currentTarget;
  if(!form.reportValidity())return;
  const data=new FormData(form);
  const button=form.querySelector('button[type="submit"]');
  button.disabled=true;
  try{
    const result=await api('review-inbox',{method:'POST',body:JSON.stringify({
      action:'add',author:data.get('author'),text:data.get('text'),
      language:data.get('language'),consent:data.get('consent')==='yes'
    })});
    if(result.ok!==true)throw new Error('Could not publish review.');
    form.reset();form.hidden=true;
    await loadLiveReviews();
    notice('Review published immediately. Visitors can see it now.','success');
  }catch(error){notice(error.message||'Could not publish review.','error');}
  finally{button.disabled=false;}
}
function validateEditorialControls(){
  for(const type of ['afterhours','contactLinks'])for(const link of editableLinks(type)){
    if(!link.label?.trim()||link.label.length>60||!/^https:\/\/[^\s]+$/i.test(link.url||''))throw new Error('Every social channel needs a name and valid HTTPS link.');
  }
  if(state.draft.reviews.length>40)throw new Error('Keep at most 40 reviews.');
  for(const item of state.draft.reviews){
    if(!item.author?.trim()||(!item.textEn?.trim()&&!item.textHi?.trim()))throw new Error('Each review needs a reviewer-approved name and text in English or Hindi.');
    if(item.published&&!item.consent)throw new Error('Before publishing a review, confirm the reviewer gave permission.');
  }
}
function renderAll(){renderBusiness();renderLinks();renderReviews();populateProfile();renderServices();renderPhotos();renderAnswers();renderHistory();renderSeoEditor();$('[data-version]').textContent=state.version;$('[data-published-version]').textContent=state.publishedVersion;$('[data-photo-count]').textContent=state.draft.images?.length||0;$('[data-answer-count]').textContent=knowledge.length;}
async function loadAiStatus(){try{const status=await api('ai-status');$('[data-ai-status]').textContent=status.configured?status.provider+' connected':'Knowledge-only mode';$('[data-ai-detail]').textContent=status.configured?`${status.model} · API key is stored securely on the server.`:'Add a server-side Groq or xAI key to enable conversational answers.';}catch{$('[data-ai-status]').textContent='Status unavailable';}}
async function loadWorkspace(){
  const session=await api('session');
  if(!session?.state?.draft)throw new Error('Your private workspace is unavailable.');
  state=session.state;
  dirty=false;
  savedDraftSnapshot=JSON.stringify(state.draft);
  initializeEditableSections();
  showDashboard();
  // Neither optional assistant knowledge nor SEO defaults should prevent
  // the entire owner dashboard from opening if one request fails.
  const [answers,defaults]=await Promise.allSettled([
    api('knowledge'),
    fetch('/seo-defaults.json',{cache:'no-store'}).then(response=>{
      if(!response.ok)throw new Error('Search settings are unavailable.');
      return response.json();
    })
  ]);
  knowledge=answers.status==='fulfilled'?(answers.value.items||[]):[];
  knowledgeDirty=false;
  seoDefaults=defaults.status==='fulfilled'&&defaults.value?.pages?defaults.value:null;
  initializeSeo();
  initializeBusiness();
  renderAll();
  const seoWarning=$('[data-seo-loading-error]');
  if(seoWarning)seoWarning.hidden=Boolean(seoDefaults);
  void loadAiStatus();
  void loadLiveReviews();
  dirty=hasUnsavedDraft();
  if(!seoDefaults||answers.status!=='fulfilled'){
    notice('Dashboard ready. Some optional settings did not load; refresh before editing those sections.','');
  }else{
    notice(dirty?'Workspace ready. Save draft to keep newly initialized settings.':'Private workspace connected. Live website version '+state.publishedVersion+'.',dirty?'':'success');
  }
}
function validateDraft(){validateBusinessDraft();validateSeoDraft();validateEditorialControls();if(!(state.draft.images||[]).some(image=>image.hero))throw new Error('Choose at least one Home hero photograph.');if((state.draft.aboutImages||[]).length!==3)throw new Error('Choose exactly three About photographs.');if(!(state.draft.services||[]).every(item=>item.title&&item.text))throw new Error('Every service needs a title and description.');if(!state.draft.assistant?.name?.trim())throw new Error('The assistant needs a public name.');if(!state.draft.assistant?.greeting?.trim())throw new Error('The assistant needs a welcome message.');}
async function saveDraft(){
  if(savingDraft)return savingDraft;
  savingDraft=(async()=>{
    try{
      notice('Saving private draft…');
      const snapshot=JSON.stringify(state.draft);
      const stored=await api('state',{method:'PUT',body:JSON.stringify({state:JSON.parse(snapshot),expectedVersion:state.version})});
      const laterEdits=JSON.stringify(state.draft)!==snapshot;
      const latestDraft=state.draft;
      state=stored;
      savedDraftSnapshot=JSON.stringify(stored.draft);
      if(laterEdits)state.draft=latestDraft;
      dirty=laterEdits;
      renderAll();
      notice(laterEdits?'Earlier changes saved. Save again to keep the latest edits.':'Draft saved privately. Nothing was published.',laterEdits?'':'success');
      return !laterEdits;
    }catch(error){
      if(/SEO |search|related page/i.test(error.message))switchTab('seo');
      notice(error.message||'Could not save draft. Your edits remain in this browser.','error');
      return false;
    }
  })();
  try{return await savingDraft;}finally{savingDraft=null;}
}
async function publish(){
  if(hasUnsavedDraft()&&!(await saveDraft()))return;
  try{
    validateDraft();
    if(!confirm('Publish the saved draft to the live website now?'))return;
    notice('Publishing website…');
    state=await api('state',{method:'POST',body:JSON.stringify({action:'publish',expectedVersion:state.version})});
    savedDraftSnapshot=JSON.stringify(state.draft);
    dirty=false;
    renderAll();
    notice('Published successfully. Visitors now see version '+state.publishedVersion+'.','success');
  }catch(error){
    const message=error.message||'Could not publish.';
    if(/SEO |paragraph|related page|search/i.test(message))switchTab('seo');
    else if(/photo|hero|image/i.test(message))switchTab('photos');
    else if(/service/i.test(message))switchTab('services');
    else if(/review|permission/i.test(message))switchTab('reviews');
    else if(/social|channel|Afterhours|contact link/i.test(message))switchTab('links');
    else if(/assistant/i.test(message))switchTab('assistant');
     else if(/business|logo path|domain only/i.test(message))switchTab('business');
    notice(message,'error');
  }
}
async function restoreVersion(version){try{if(!confirm('Restore version '+version+' to Draft? The live website will stay unchanged.'))return;state=await api('state',{method:'POST',body:JSON.stringify({action:'restore',version})});savedDraftSnapshot=JSON.stringify(state.draft);dirty=false;initializeEditableSections();initializeSeo();initializeBusiness();dirty=hasUnsavedDraft();renderAll();notice('Older version restored to Draft. Save draft to keep any missing default settings.','success');}catch(error){notice(error.message,'error');}}
async function saveAnswers(){
  try{
    const incomplete=knowledge.findIndex(item=>!item.question?.trim()||!item.answer?.trim());
    if(incomplete!==-1)throw new Error('Question '+(incomplete+1)+' needs both a question and an answer. Complete it or remove it before saving.');
    if(knowledge.length>250)throw new Error('Keep at most 250 assistant answers.');
    notice('Saving assistant answers…');
    const result=await api('knowledge',{method:'PUT',body:JSON.stringify({items:knowledge})});
    knowledgeDirty=false;
    notice('Saved '+result.saved+' assistant answers. They are live now.','success');
  }catch(error){notice(error.message||'Could not save assistant answers.','error');}
}
async function optimise(file){const image=await createImageBitmap(file);const max=1600,scale=Math.min(1,max/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close();return canvas.toDataURL('image/jpeg',.86);}
async function uploadPhoto(){const input=$('[data-photo-file]'),status=$('[data-upload-status]'),file=input.files?.[0];if(!file)return status.textContent='Choose a photograph first.';try{status.textContent='Optimising and uploading…';const dataUrl=await optimise(file);const result=await api('upload',{method:'POST',body:JSON.stringify({name:file.name,dataUrl})});state.draft.images.push({src:result.url,storagePath:result.path,alt:'Portrait of witness_lema_',title:file.name.replace(/\.[^.]+$/,''),category:'Portrait',hero:false,reference:false});renderPhotos();setDirty();status.textContent='Uploaded and added to Draft. Save the draft when ready.';input.value='';}catch(error){status.textContent=error.message;notice(error.message,'error');}}
$('[data-login-form]').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;const data=new FormData(form);const message=$('[data-login-message]');message.textContent='Signing in…';try{await api('login',{method:'POST',body:JSON.stringify({loginId:data.get('loginId'),password:data.get('password')})});form.reset();await loadWorkspace();}catch(error){message.textContent=error.message;}});
$('[data-password-toggle]').onclick=()=>{const input=$('[name="password"]'),show=input.type==='password';input.type=show?'text':'password';$('[data-password-toggle]').textContent=show?'Hide':'Show';$('[data-password-toggle]').setAttribute('aria-label',show?'Hide password':'Show password');input.focus();};
$$('[data-tab]').forEach(button=>button.onclick=()=>switchTab(button.dataset.tab));
$$('[data-go-tab]').forEach(button=>button.onclick=()=>{switchTab(button.dataset.goTab);document.querySelector('.workspace')?.scrollTo?.({top:0,behavior:'smooth'});});
$('[data-seo-page]').onchange=event=>{seoCurrent=event.target.value;renderSeoEditor();};
$('[data-publish-seo]').onclick=publish;
$$('[data-save]').forEach(button=>button.onclick=saveDraft);
$('[data-publish]').onclick=publish;
$('[data-preview]').onclick=()=>{
  if(hasUnsavedDraft()){notice('Save draft before previewing. Your changes are still in this browser.','error');return;}
  window.open('/?admin_preview=1','_blank','noopener');
};
$('[data-refresh]').onclick=async()=>{if((hasUnsavedDraft()||knowledgeDirty)&&!confirm('Discard unsaved draft and assistant-answer changes and reload the workspace?'))return;try{await loadWorkspace();}catch(error){notice(error.message,'error');}};
$$('[data-add-link]').forEach(button=>button.onclick=()=>{editableLinks(button.dataset.addLink).push({label:'',url:''});renderLinks();setDirty();});
$('[data-review-refresh]').onclick=loadLiveReviews;
$('[data-add-review]').onclick=()=>{const form=$('[data-admin-review-form]');form.hidden=!form.hidden;if(!form.hidden)form.querySelector('[name="author"]').focus();};
$('[data-review-cancel]').onclick=()=>{$('[data-admin-review-form]').hidden=true;};
$('[data-admin-review-form]').addEventListener('submit',addLiveReview);
$('[data-add-service]').onclick=()=>{state.draft.services.push({number:String(state.draft.services.length+1).padStart(2,'0'),title:'New service',text:'Add a refined description.',tag:'By arrangement',image:state.draft.images?.[0]?.src||''});renderServices();setDirty();};
$('[data-add-answer]').onclick=()=>{knowledge.unshift({question:'',answer:'',keywords:[],href:'/contact/',published:true});knowledgeDirty=true;renderAnswers();notice('Finish both fields, then choose Save answers.');};
$('[data-save-answers]').onclick=saveAnswers;
$('[data-upload]').onclick=uploadPhoto;
$('[data-logout]').onclick=async()=>{await api('logout',{method:'POST',body:'{}'});state=null;showLogin('You have been signed out.');};
window.addEventListener('beforeunload',event=>{if(hasUnsavedDraft()||knowledgeDirty){event.preventDefault();event.returnValue='';}});
loadWorkspace().catch(()=>showLogin());
