const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
let state=null,knowledge=[],pendingReviews=[],dirty=false,seoDefaults=null,seoCurrent='/';
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
function populateProfile(){$$('[data-path]').forEach(input=>{input.value=getPath(state.draft,input.dataset.path)||'';input.oninput=()=>{setPath(state.draft,input.dataset.path,input.value);setDirty();};});}
function serviceCard(service,index){return `<article class="repeat-card"><span class="number">${String(index+1).padStart(2,'0')}</span><div class="repeat-fields"><label>Title<input data-service-field="title" data-index="${index}" value="${esc(service.title)}"></label><label>Price / label<input data-service-field="tag" data-index="${index}" value="${esc(service.tag)}"></label><label class="wide">Description<textarea rows="3" data-service-field="text" data-index="${index}">${esc(service.text)}</textarea></label><label class="wide">Image path or URL<input data-service-field="image" data-index="${index}" value="${esc(service.image)}"></label></div><div class="card-actions"><button data-service-move="-1" data-index="${index}" aria-label="Move up">↑</button><button data-service-move="1" data-index="${index}" aria-label="Move down">↓</button><button class="danger" data-service-remove data-index="${index}" aria-label="Remove">×</button></div></article>`;}
function renderServices(){const holder=$('[data-services]');holder.innerHTML=(state.draft.services||[]).map(serviceCard).join('')||'<p>No services yet.</p>';holder.querySelectorAll('[data-service-field]').forEach(input=>input.oninput=()=>{state.draft.services[+input.dataset.index][input.dataset.serviceField]=input.value;setDirty();});holder.querySelectorAll('[data-service-move]').forEach(button=>button.onclick=()=>{const i=+button.dataset.index,j=i+(+button.dataset.serviceMove);if(j<0||j>=state.draft.services.length)return;[state.draft.services[i],state.draft.services[j]]=[state.draft.services[j],state.draft.services[i]];renderServices();setDirty();});holder.querySelectorAll('[data-service-remove]').forEach(button=>button.onclick=()=>{state.draft.services.splice(+button.dataset.index,1);renderServices();setDirty();});}
function photoCard(image,index){const about=(state.draft.aboutImages||[]).includes(image.src);return `<article class="photo-card"><img src="${esc(image.src)}" alt=""><label>Title<input data-photo-field="title" data-index="${index}" value="${esc(image.title)}"></label><label>Alt text<input data-photo-field="alt" data-index="${index}" value="${esc(image.alt)}"></label><label>Category<input data-photo-field="category" data-index="${index}" value="${esc(image.category)}"></label><div class="checks"><label><input type="checkbox" data-photo-hero data-index="${index}" ${image.hero?'checked':''}> Home hero</label><label><input type="checkbox" data-photo-about data-index="${index}" ${about?'checked':''}> About</label></div><button data-photo-remove data-index="${index}">Remove from draft</button></article>`;}
function renderPhotos(){const holder=$('[data-photos]');holder.innerHTML=(state.draft.images||[]).map(photoCard).join('');holder.querySelectorAll('[data-photo-field]').forEach(input=>input.oninput=()=>{state.draft.images[+input.dataset.index][input.dataset.photoField]=input.value;setDirty();});holder.querySelectorAll('[data-photo-hero]').forEach(input=>input.onchange=()=>{state.draft.images[+input.dataset.index].hero=input.checked;setDirty();});holder.querySelectorAll('[data-photo-about]').forEach(input=>input.onchange=()=>{const src=state.draft.images[+input.dataset.index].src;state.draft.aboutImages=(state.draft.aboutImages||[]).filter(item=>item!==src);if(input.checked)state.draft.aboutImages.push(src);renderPhotos();setDirty();});holder.querySelectorAll('[data-photo-remove]').forEach(button=>button.onclick=()=>{const image=state.draft.images[+button.dataset.index];if(!confirm('Remove this photograph from the draft? The stored file will remain available.'))return;state.draft.images.splice(+button.dataset.index,1);state.draft.aboutImages=(state.draft.aboutImages||[]).filter(src=>src!==image.src);renderPhotos();setDirty();});}
function answerCard(item,index){return `<article class="repeat-card"><span class="number">${String(index+1).padStart(2,'0')}</span><div class="repeat-fields"><label class="wide">Question<input data-answer-field="question" data-index="${index}" value="${esc(item.question)}"></label><label class="wide">Answer<textarea rows="4" data-answer-field="answer" data-index="${index}">${esc(item.answer)}</textarea></label><label>Keywords, separated by commas<input data-answer-field="keywords" data-index="${index}" value="${esc((item.keywords||[]).join(', '))}"></label><label>Related page<input data-answer-field="href" data-index="${index}" value="${esc(item.href)}"></label></div><div class="card-actions"><button class="danger" data-answer-remove data-index="${index}" aria-label="Remove">×</button></div></article>`;}
function renderAnswers(){const holder=$('[data-answers]');holder.innerHTML=knowledge.map(answerCard).join('');holder.querySelectorAll('[data-answer-field]').forEach(input=>input.oninput=()=>{const value=input.dataset.answerField==='keywords'?input.value.split(',').map(x=>x.trim()).filter(Boolean):input.value;knowledge[+input.dataset.index][input.dataset.answerField]=value;notice('Assistant changes are not saved yet.','');});holder.querySelectorAll('[data-answer-remove]').forEach(button=>button.onclick=()=>{knowledge.splice(+button.dataset.index,1);renderAnswers();});}
function renderHistory(){const holder=$('[data-history]');holder.innerHTML=(state.history||[]).slice().reverse().map(item=>`<article><span>Version ${item.version} · ${new Date(item.publishedAt).toLocaleString()}</span><button class="secondary" data-restore="${item.version}">Restore to draft</button></article>`).join('')||'<p>No earlier published versions yet.</p>';holder.querySelectorAll('[data-restore]').forEach(button=>button.onclick=()=>restoreVersion(+button.dataset.restore));}
const seoNames={'/':'Home','/about/':'About','/gallery/':'Gallery','/services/':'Services','/contact/':'Contact'};
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
  $('[data-seo-preview-url]').textContent='rema-ruby.vercel.app'+seoCurrent;
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
function reviewCard(item,index){
  return '<article class="repeat-card review-editor"><span class="number">'+String(index+1).padStart(2,'0')+'</span><div class="repeat-fields"><label>Reviewer-approved name or alias<input data-review-field="author" data-index="'+index+'" maxlength="90" value="'+esc(item.author||'')+'" placeholder="Guest-approved display name"></label><label>Review in English<textarea rows="3" data-review-field="textEn" data-index="'+index+'" maxlength="1400">'+esc(item.textEn||'')+'</textarea></label><label>Review in Hindi / हिंदी<textarea rows="3" data-review-field="textHi" data-index="'+index+'" maxlength="1400">'+esc(item.textHi||'')+'</textarea></label><div class="review-options wide"><label><input type="checkbox" data-review-consent="'+index+'" '+(item.consent?'checked':'')+'> Reviewer gave permission to publish this text and name</label><label><input type="checkbox" data-review-published="'+index+'" '+(item.published?'checked':'')+'> Show on website</label></div></div><div class="card-actions"><button type="button" class="danger" data-review-remove="'+index+'" aria-label="Delete review">×</button></div></article>';
}
function renderReviews(){
  const holder=$('[data-reviews-editor]');
  holder.innerHTML=(state.draft.reviews||[]).map(reviewCard).join('')||'<p>No reviews published yet. Review submissions will appear above.</p>';
  holder.querySelectorAll('[data-review-field]').forEach(input=>input.oninput=()=>{state.draft.reviews[+input.dataset.index][input.dataset.reviewField]=input.value;setDirty();});
  holder.querySelectorAll('[data-review-consent]').forEach(input=>input.onchange=()=>{state.draft.reviews[+input.dataset.reviewConsent].consent=input.checked;setDirty();});
  holder.querySelectorAll('[data-review-published]').forEach(input=>input.onchange=()=>{state.draft.reviews[+input.dataset.reviewPublished].published=input.checked;setDirty();});
  holder.querySelectorAll('[data-review-remove]').forEach(button=>button.onclick=()=>{if(!confirm('Delete this review from the draft?'))return;state.draft.reviews.splice(+button.dataset.reviewRemove,1);renderReviews();setDirty();});
}
function renderPendingReviews(){
  const holder=$('[data-review-submissions]');if(!holder)return;
  holder.innerHTML=pendingReviews.length?pendingReviews.map(item=>
    '<article class="repeat-card review-pending-card" data-review-submission="'+Number(item.id)+'">'+
    '<p class="review-pending-body">'+esc(item.text)+'</p><p class="fine">— '+esc(item.author)+' · '+(item.language==='hi'?'हिंदी':'English')+'</p>'+
    '<div class="review-pending-actions"><button class="primary" type="button" data-review-approve>Approve to draft</button>'+
    '<button class="secondary" type="button" data-review-reject>Reject</button></div></article>'
  ).join(''):'<p class="fine">No pending reviews to approve.</p>';
  holder.querySelectorAll('[data-review-approve]').forEach(button=>button.onclick=async()=>{
    const id=Number(button.closest('[data-review-submission]').dataset.reviewSubmission);
    const item=pendingReviews.find(x=>Number(x.id)===id);if(!item)return;
    const existing=(state.draft.reviews||[]).some(x=>x.author===item.author&&
      (x.textEn===item.text||x.textHi===item.text));
    if(!existing){
      if(state.draft.reviews.length>=40){notice('The website has reached its 40-review limit. Remove one before approving another.','error');return;}
      state.draft.reviews.push({author:item.author,textEn:item.language==='hi'?'':item.text,textHi:item.language==='hi'?item.text:'',consent:true,published:true});
      setDirty();
    }
    button.disabled=true;
    let saved=false;
    try{
      // Approval saves to a private draft; full validation happens on Publish.
      const updated=await api('state',{method:'PUT',body:JSON.stringify({state:state.draft,expectedVersion:state.version})});
      state=updated;dirty=false;saved=true;
      renderAll();
      const decision=await api('review-inbox',{method:'POST',body:JSON.stringify({action:'resolve',id,status:'approved'})});
      if(decision.ok!==true)throw new Error('Draft saved, but the review queue was not updated. Refresh and try again.');
      pendingReviews=pendingReviews.filter(x=>Number(x.id)!==id);renderPendingReviews();
      notice('Review added to the saved draft. Click Publish website to show it publicly.','success');
    }catch(error){
      if(!saved&&!existing){state.draft.reviews=state.draft.reviews.filter(x=>!(x.author===item.author&&(x.textEn===item.text||x.textHi===item.text)));renderReviews();}
      notice(error.message||'Could not approve review.','error');button.disabled=false;
    }
  });
  holder.querySelectorAll('[data-review-reject]').forEach(button=>button.onclick=async()=>{
    const id=Number(button.closest('[data-review-submission]').dataset.reviewSubmission);
    if(!confirm('Reject this submitted review?'))return;
    button.disabled=true;try{await api('review-inbox',{method:'POST',body:JSON.stringify({action:'resolve',id,status:'rejected'})});
      pendingReviews=pendingReviews.filter(x=>Number(x.id)!==id);renderPendingReviews();notice('Submission rejected.','success');
    }catch(error){notice(error.message||'Could not reject review.','error');button.disabled=false;}
  });
}
async function loadPendingReviews(){
  try{const result=await api('review-inbox');pendingReviews=Array.isArray(result.items)?result.items:[];renderPendingReviews();}
  catch{const holder=$('[data-review-submissions]');if(holder)holder.textContent='Could not load submissions. Please refresh.';}
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
function renderAll(){renderLinks();renderReviews();populateProfile();renderServices();renderPhotos();renderAnswers();renderHistory();renderSeoEditor();$('[data-version]').textContent=state.version;$('[data-published-version]').textContent=state.publishedVersion;$('[data-photo-count]').textContent=state.draft.images?.length||0;$('[data-answer-count]').textContent=knowledge.length;}
async function loadAiStatus(){try{const status=await api('ai-status');$('[data-ai-status]').textContent=status.configured?status.provider+' connected':'Knowledge-only mode';$('[data-ai-detail]').textContent=status.configured?`${status.model} · API key is stored securely on the server.`:'Add a server-side Groq or xAI key to enable conversational answers.';}catch{$('[data-ai-status]').textContent='Status unavailable';}}
async function loadWorkspace(){
  const session=await api('session');
  if(!session?.state?.draft)throw new Error('Your private workspace is unavailable.');
  state=session.state;
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
  seoDefaults=defaults.status==='fulfilled'&&defaults.value?.pages?defaults.value:null;
  initializeSeo();
  renderAll();
  const seoWarning=$('[data-seo-loading-error]');
  if(seoWarning)seoWarning.hidden=Boolean(seoDefaults);
  void loadAiStatus();
  void loadPendingReviews();
  dirty=false;
  if(!seoDefaults||answers.status!=='fulfilled'){
    notice('Dashboard ready. Some optional settings did not load; refresh before editing those sections.','');
  }else{
    notice('Private workspace connected. Live website version '+state.publishedVersion+'.','success');
  }
}
function validateDraft(){validateSeoDraft();validateEditorialControls();if(!(state.draft.images||[]).some(image=>image.hero))throw new Error('Choose at least one Home hero photograph.');if((state.draft.aboutImages||[]).length!==3)throw new Error('Choose exactly three About photographs.');if(!(state.draft.services||[]).every(item=>item.title&&item.text))throw new Error('Every service needs a title and description.');if(!state.draft.assistant?.name?.trim())throw new Error('The assistant needs a public name.');if(!state.draft.assistant?.greeting?.trim())throw new Error('The assistant needs a welcome message.');}
async function saveDraft(){try{notice('Saving private draft…');state=await api('state',{method:'PUT',body:JSON.stringify({state:state.draft,expectedVersion:state.version})});dirty=false;renderAll();notice('Draft saved privately. Nothing was published.','success');}catch(error){notice(error.message,'error');}}
async function publish(){try{if(dirty)await saveDraft();if(dirty)return;validateDraft();if(!confirm('Publish the saved draft to the live website now?'))return;notice('Publishing website…');state=await api('state',{method:'POST',body:JSON.stringify({action:'publish',expectedVersion:state.version})});renderAll();notice('Published successfully. Visitors now see version '+state.publishedVersion+'.','success');}catch(error){notice(error.message,'error');}}
async function restoreVersion(version){try{if(!confirm('Restore version '+version+' to Draft? The live website will stay unchanged.'))return;state=await api('state',{method:'POST',body:JSON.stringify({action:'restore',version})});renderAll();notice('Older version restored to Draft. Preview it before publishing.','success');}catch(error){notice(error.message,'error');}}
async function saveAnswers(){try{notice('Saving assistant answers…');const result=await api('knowledge',{method:'PUT',body:JSON.stringify({items:knowledge})});notice('Saved '+result.saved+' assistant answers. They are live now.','success');}catch(error){notice(error.message,'error');}}
async function optimise(file){const image=await createImageBitmap(file);const max=1600,scale=Math.min(1,max/Math.max(image.width,image.height));const canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close();return canvas.toDataURL('image/jpeg',.86);}
async function uploadPhoto(){const input=$('[data-photo-file]'),status=$('[data-upload-status]'),file=input.files?.[0];if(!file)return status.textContent='Choose a photograph first.';try{status.textContent='Optimising and uploading…';const dataUrl=await optimise(file);const result=await api('upload',{method:'POST',body:JSON.stringify({name:file.name,dataUrl})});state.draft.images.push({src:result.url,storagePath:result.path,alt:'Portrait of witness_lema_',title:file.name.replace(/\.[^.]+$/,''),category:'Portrait',hero:false,reference:false});renderPhotos();setDirty();status.textContent='Uploaded and added to Draft. Save the draft when ready.';input.value='';}catch(error){status.textContent=error.message;notice(error.message,'error');}}
$('[data-login-form]').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;const data=new FormData(form);const message=$('[data-login-message]');message.textContent='Signing in…';try{await api('login',{method:'POST',body:JSON.stringify({loginId:data.get('loginId'),password:data.get('password')})});form.reset();await loadWorkspace();}catch(error){message.textContent=error.message;}});
$('[data-password-toggle]').onclick=()=>{const input=$('[name="password"]'),show=input.type==='password';input.type=show?'text':'password';$('[data-password-toggle]').textContent=show?'Hide':'Show';$('[data-password-toggle]').setAttribute('aria-label',show?'Hide password':'Show password');input.focus();};
$$('[data-tab]').forEach(button=>button.onclick=()=>switchTab(button.dataset.tab));
$('[data-seo-page]').onchange=event=>{seoCurrent=event.target.value;renderSeoEditor();};
$('[data-publish-seo]').onclick=publish;
$$('[data-save]').forEach(button=>button.onclick=saveDraft);
$('[data-publish]').onclick=publish;
$('[data-preview]').onclick=()=>window.open('/?admin_preview=1','_blank','noopener');
$('[data-refresh]').onclick=async()=>{try{await loadWorkspace();}catch(error){notice(error.message,'error');}};
$$('[data-add-link]').forEach(button=>button.onclick=()=>{editableLinks(button.dataset.addLink).push({label:'',url:''});renderLinks();setDirty();});
$('[data-review-queue-refresh]').onclick=loadPendingReviews;
$('[data-add-review]').onclick=()=>{state.draft.reviews.unshift({author:'',textEn:'',textHi:'',consent:false,published:false});renderReviews();setDirty();};
$('[data-add-service]').onclick=()=>{state.draft.services.push({number:String(state.draft.services.length+1).padStart(2,'0'),title:'New service',text:'Add a refined description.',tag:'By arrangement',image:state.draft.images?.[0]?.src||''});renderServices();setDirty();};
$('[data-add-answer]').onclick=()=>{knowledge.unshift({question:'',answer:'',keywords:[],href:'/contact/',published:true});renderAnswers();};
$('[data-save-answers]').onclick=saveAnswers;
$('[data-upload]').onclick=uploadPhoto;
$('[data-logout]').onclick=async()=>{await api('logout',{method:'POST',body:'{}'});state=null;showLogin('You have been signed out.');};
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
loadWorkspace().catch(()=>showLogin());
