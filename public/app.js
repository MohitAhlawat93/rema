import { site } from './data/site.js';
// Live chat stays helpful without falling back to an unrelated FAQ match.
const $ = s => document.querySelector(s);
const html = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const previewMode=new URLSearchParams(location.search).get('admin_preview')==='1';
let previewAuthorized=false;
try{
  const response=await fetch('/api/site-content'+(previewMode?'?preview=1':''));
  if(response.ok){const data=await response.json();Object.assign(site,data.payload||{});if(data.preview){previewAuthorized=true;document.documentElement.classList.add('admin-preview');}}
}catch{/* Bundled content remains a reliable fallback. */}
function serviceMarkup(item,index){return `<article class="service-card">${item.image?`<img src="${html(item.image)}" alt="" width="900" height="1100" loading="lazy" decoding="async">`:''}<div class="service-card-copy"><span class="index">${html(item.number||String(index+1).padStart(2,'0'))}</span><h2>${html(item.title)}</h2><p>${html(item.text)}</p><span class="tag">${html(item.tag||'')}</span></div></article>`;}
function tileMarkup(image,index){return `<figure class="gallery-tile"><button class="photo" data-photo="${index}" aria-label="View ${html(image.title)}"><img src="${html(image.src)}" alt="${html(image.alt)}" width="900" height="1100" loading="lazy" decoding="async"></button><figcaption><span>${html(image.title)}</span><span class="caption-kind">${html(image.category)}</span></figcaption></figure>`;}
function permittedUrl(value){try{const u=new URL(String(value));return u.protocol==='https:'?u.href:'';}catch{return '';}}
function linkItems(items){
  if(Array.isArray(items))return items.filter(item=>item&&item.label&&permittedUrl(item.url)).map(item=>({label:String(item.label).slice(0,60),url:permittedUrl(item.url)}));
  return Object.entries(items||{}).filter(([,url])=>permittedUrl(url)).map(([label,url])=>({label:label[0].toUpperCase()+label.slice(1),url:permittedUrl(url)}));
}
function socialMarkup(){return linkItems(Array.isArray(site.contactLinks)?site.contactLinks:site.social).map(({label,url})=>`<a href="${html(url)}" target="_blank" rel="noopener noreferrer">${html(label)} <span aria-hidden="true">↗</span></a>`).join('');}
function hydrateAfterhours(){
  const config=site.afterhours||{};
  const launch=$('#afterhours-launch');
  launch.hidden=config.enabled===false;
  $('#afterhours-title').textContent=config.title||'Lema Afterhours';
  $('#afterhours-intro').textContent=config.intro||'Stay close through the official channels.';
  const links=linkItems(Array.isArray(config.links)?config.links:(site.contactLinks?.length?site.contactLinks:site.social));
  $('[data-afterhours-links]').innerHTML=links.map(({label,url})=>`<a href="${html(url)}" target="_blank" rel="noopener noreferrer"><span>${html(label)}</span><span aria-hidden="true">↗</span></a>`).join('')||'<p>No channels are listed at the moment. Please visit Contact for updates.</p>';
}
function hydrateReviews(){
  const holders=[...document.querySelectorAll('[data-public-reviews]')];if(!holders.length)return;
  const reviews=(Array.isArray(site.reviews)?site.reviews:[]).filter(item=>item&&item.published===true&&item.consent===true&&(item.textEn||item.textHi)).slice(0,40);
  if(!reviews.length){
    holders.forEach(holder=>{const section=holder.closest('.reviews-section');if(section&&!section.classList.contains('reviews-page'))section.hidden=true;else holder.innerHTML='<p class="review-empty">No reviews published yet.</p>';});
    return;
  }
  holders.forEach(holder=>{const section=holder.closest('.reviews-section');if(section)section.hidden=false;holder.innerHTML=reviews.map(item=>`<article class="review-quote"><span class="review-language">Guest feedback · अतिथि के शब्द</span>${item.textEn?`<blockquote lang="en">${html(item.textEn)}</blockquote>`:''}${item.textHi?`<blockquote lang="hi">${html(item.textHi)}</blockquote>`:''}<p>— ${html(item.author||'Guest')}</p></article>`).join('');});
}
function hydratePublishedContent(){
  document.querySelectorAll('.social-links').forEach(el=>el.innerHTML=socialMarkup());
  hydrateAfterhours();
  hydrateReviews();
  const assistant=site.assistant||{};
  if($('.assistant-head strong'))$('.assistant-head strong').textContent=assistant.name||'Website assistant';
  if($('#messages .bubble'))$('#messages .bubble').textContent=assistant.greeting||'Welcome. I can help you explore the website.';
  const suggestionButtons=[...document.querySelectorAll('.suggestions [data-question]')];
  if(suggestionButtons[0]){suggestionButtons[0].textContent=assistant.suggestionOneLabel||'Get in touch';suggestionButtons[0].dataset.question=assistant.suggestionOne||'How can I get in touch?';}
  if(suggestionButtons[1]){suggestionButtons[1].textContent=assistant.suggestionTwoLabel||'Services';suggestionButtons[1].dataset.question=assistant.suggestionTwo||'Which services are available?';}
  const heroImages=(site.images||[]).filter(image=>image.hero);
  if($('.hero-background')&&heroImages.length)$('.hero-background').innerHTML=heroImages.map((image,index)=>`<img src="${html(image.src)}" alt="" width="900" height="1100" decoding="async" class="hero-slide ${index?'':'active'}" ${index?'loading="lazy" fetchpriority="low"':'loading="eager" fetchpriority="high"'}>`).join('');
  if($('.hero-copy .eyebrow'))$('.hero-copy .eyebrow').textContent=site.hero?.eyebrow||'';
  if($('.hero-copy h1'))$('.hero-copy h1').innerHTML=html(site.hero?.title||'').replaceAll('\n','<br>');
  if($('.hero-copy .intro'))$('.hero-copy .intro').textContent=site.hero?.intro||'';
  if(location.pathname==='/about/'||location.pathname==='/about'){
    const title=$('.page-heading h1');if(title)title.innerHTML=html(site.about?.title||'').replaceAll('\n','<br>');
    const heading=$('.about-layout .editorial h2');if(heading)heading.textContent=site.about?.heading||'';
    const biography=$('.about-layout .editorial .intro');if(biography)biography.textContent=site.about?.text||'';
    const rotator=$('.about-rotator');if(rotator)rotator.innerHTML=(site.aboutImages||[]).slice(0,3).map((src,index)=>`<img class="about-slide ${index?'':'active'}" src="${html(src)}" alt="Portrait of witness_lema_" width="900" height="1100" aria-hidden="${index?'true':'false'}">`).join('');
  }
  const serviceGrid=$('.service-grid');if(serviceGrid)serviceGrid.innerHTML=(site.services||[]).map(serviceMarkup).join('');
  if((location.pathname==='/services/'||location.pathname==='/services')&&$('.page-heading .intro'))$('.page-heading .intro').textContent=site.servicesIntro||'';
  const fullGallery=$('.full-gallery');
  if(fullGallery){
    fullGallery.innerHTML=(site.images||[]).map(tileMarkup).join('');
    const categories=[...new Set((site.images||[]).map(image=>image.category).filter(Boolean))];
    const filters=$('.filters');if(filters)filters.innerHTML=`<button class="active" data-filter="All" aria-pressed="true">All images</button>${categories.map(category=>`<button data-filter="${html(category)}" aria-pressed="false">${html(category)}</button>`).join('')}`;
    if($('[data-gallery-status]'))$('[data-gallery-status]').textContent=`Showing ${site.images.length} images`;
  }
  const selected=$('.editorial-gallery');if(selected&&site.images?.length)selected.innerHTML=[site.images.at(-4),site.images.at(-2)].filter(Boolean).map(image=>tileMarkup(image,site.images.indexOf(image))).join('');
  const mainPortrait=$('.portrait-main img'),insetPortrait=$('.portrait-inset img');if(mainPortrait&&site.images?.[5])mainPortrait.src=site.images[5].src;if(insetPortrait&&site.images?.[8])insetPortrait.src=site.images[8].src;
  if(previewMode&&document.documentElement.classList.contains('admin-preview'))document.body.insertAdjacentHTML('afterbegin','<div class="admin-preview-bar">Private Draft Preview · <a href="/admin">Return to Control</a></div>');
}
hydratePublishedContent();
// A private preview must remain a private preview when navigating from Home
// to About, Services, Gallery, Reviews or Contact. Never leak preview data to
// unauthenticated browsers, and never modify external/contact links.
function previewHref(raw){
  if(!previewAuthorized||!raw||raw.startsWith('#'))return null;
  try{
    const destination=new URL(raw,location.href);
    if(destination.origin!==location.origin||/^\/(?:admin|api)(?:\/|$)/.test(destination.pathname))return null;
    destination.searchParams.set('admin_preview','1');
    return destination.pathname+destination.search+destination.hash;
  }catch{return null;}
}
if(previewMode){
  if(previewAuthorized){
    document.querySelectorAll('a[href]').forEach(a=>{
      const href=previewHref(a.getAttribute('href'));
      if(href)a.setAttribute('href',href);
    });
    // Also handle navigation added dynamically after initial hydration.
    document.addEventListener('click',event=>{
      const a=event.target?.closest?.('a[href]');
      if(!a)return;
      const href=previewHref(a.getAttribute('href'));
      if(href)a.setAttribute('href',href);
    },true);
  }else{
    document.body.insertAdjacentHTML('afterbegin','<div class="admin-preview-bar">Private preview unavailable. <a href="/admin">Sign in to view your saved draft</a>.</div>');
  }
}
const menu = $('.menu-toggle'), nav = $('#navigation');
function setMenu(open) { nav.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open)); }
menu.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));
nav.addEventListener('click',()=>setMenu(false));
const launcher=$('#assistant-launch'),panel=$('#assistant-panel'),question=$('#question'),messages=$('#messages');
const chatHistory=[];
function setAssistant(open,focus=true){panel.hidden=!open;launcher.hidden=open;launcher.setAttribute('aria-expanded',String(open));panel.setAttribute('aria-hidden',String(!open));panel.classList.toggle('open',open);if(focus)(open?question:launcher).focus();}
const autoChatKey='lema-concierge-first-visit-v2';
const chatSeen=()=>{try{return sessionStorage.getItem(autoChatKey)==='1';}catch{return false;}};
const markChatSeen=()=>{try{sessionStorage.setItem(autoChatKey,'1');}catch{}};
launcher.addEventListener('click',()=>{markChatSeen();setAssistant(true);});
// Open once per browser session after the visitor can see the page; avoid
// re-opening after dismissal and avoid stealing keyboard focus automatically.
if(!chatSeen())window.setTimeout(()=>{
  if(!panel.hidden||document.hidden||!$('#afterhours-backdrop').hidden)return;
  markChatSeen();setAssistant(true,false);
},1600);
$('#assistant-minimize').addEventListener('click',()=>setAssistant(false));
$('#assistant-expand').addEventListener('click',()=>{const expanded=panel.classList.toggle('expanded');$('#assistant-expand').setAttribute('aria-pressed',String(expanded));$('#assistant-expand').setAttribute('aria-label',expanded?'Shrink chat':'Expand chat');question.focus();});
function bubble(text,user=false,href=''){const p=document.createElement('p');p.className='bubble'+(user?' user':'');p.textContent=String(text||'');if(href&&/^\/(?:[\w/-]*)$/.test(href)){const a=document.createElement('a');a.href=href;a.textContent='Explore this page ↗';p.append(a);}messages.append(p);while(messages.children.length>40)messages.firstElementChild.remove();messages.scrollTop=messages.scrollHeight;return p;}
async function ask(text){
  const clean=String(text||'').trim();if(!clean||question.disabled)return;
  setAssistant(true);
  const history=chatHistory.slice(-6);
  bubble(clean,true);chatHistory.push({role:'user',content:clean});
  question.value='';question.disabled=true;
  const pending=bubble('Lema Concierge is composing a reply…');
  try{
    const response=await fetch('/api/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:clean,language:$('#assistant-language').value,history}),signal:AbortSignal.timeout(17000)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Assistant temporarily unavailable.');
    pending.remove();bubble(data.answer||'Please ask again in a different way.',false,data.href);
    chatHistory.push({role:'assistant',content:data.answer||''});
  }catch(error){
    pending.remove();
    const message='Sorry, the chat connection is having a moment. Please try again, or ask in another way. You can also reach Lema from the Contact page.';
    bubble(message,false,'/contact/');
    chatHistory.push({role:'assistant',content:message});
  }finally{question.disabled=false;question.focus();}
}
$('#assistant-form').addEventListener('submit',e=>{e.preventDefault();void ask(question.value);});
document.querySelectorAll('[data-question]').forEach(b=>b.addEventListener('click',()=>ask(b.dataset.question)));
const afterhoursLaunch=$('#afterhours-launch'),afterhoursBackdrop=$('#afterhours-backdrop'),afterhoursClose=$('#afterhours-close');
function setAfterhours(open){if(open&&afterhoursLaunch.hidden)return;afterhoursBackdrop.hidden=!open;afterhoursLaunch.setAttribute('aria-expanded',String(open));document.body.classList.toggle('afterhours-visible',open);(open?afterhoursClose:afterhoursLaunch).focus();}
afterhoursLaunch.addEventListener('click',()=>setAfterhours(true));
afterhoursClose.addEventListener('click',()=>setAfterhours(false));
afterhoursBackdrop.addEventListener('click',event=>{if(event.target===afterhoursBackdrop)setAfterhours(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(menu.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus();}if(!panel.hidden)setAssistant(false);if(!afterhoursBackdrop.hidden)setAfterhours(false);}});
// Adapted from witness_lema_'s gallery stepping/focus-return flow; native dialog adds focus containment.
const viewer=$('#photo-viewer');let index=0,returnFocus=null;
function visibleIndices(){return [...document.querySelectorAll('[data-photo]')].filter(b=>!b.closest('figure').hidden).map(b=>Number(b.dataset.photo));}
function renderPhoto(){const im=site.images[index];$('#photo-image').src=im.src;$('#photo-image').alt=im.alt;const visible=visibleIndices();$('#photo-caption').textContent=`${im.title} · ${visible.indexOf(index)+1} / ${visible.length}`;}
function stepPhoto(delta){const visible=visibleIndices();index=visible[(visible.indexOf(index)+delta+visible.length)%visible.length];renderPhoto();}
document.querySelectorAll('[data-photo]').forEach(b=>b.addEventListener('click',()=>{index=Number(b.dataset.photo);returnFocus=b;renderPhoto();viewer.showModal();$('#photo-close').focus();}));
$('#photo-close').addEventListener('click',()=>viewer.close());viewer.addEventListener('close',()=>returnFocus?.focus());$('#photo-prev').addEventListener('click',()=>stepPhoto(-1));$('#photo-next').addEventListener('click',()=>stepPhoto(1));viewer.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')stepPhoto(-1);if(e.key==='ArrowRight')stepPhoto(1);});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});document.querySelectorAll('[data-photo]').forEach(x=>{x.closest('figure').hidden=b.dataset.filter!=='All'&&site.images[Number(x.dataset.photo)].category!==b.dataset.filter;});$('[data-gallery-status]').textContent=`Showing ${visibleIndices().length} images`;}));
$('#review-form')?.addEventListener('submit',async event=>{
  event.preventDefault();
  const form=event.currentTarget;
  if(!form.reportValidity())return;
  const submit=form.querySelector('button[type="submit"]');
  const status=$('#review-form-status');
  const data=new FormData(form);
  submit.disabled=true;
  status.textContent='Sending your review…';
  try{
    const response=await fetch('/api/reviews',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({author:data.get('author'),text:data.get('text'),language:data.get('language'),consent:data.get('consent')==='yes',website:data.get('website')}),signal:AbortSignal.timeout(12000)});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||'Could not send the review. Please try again.');
    form.reset();
    status.textContent='Thank you! Your review was submitted for approval. It will not appear publicly until approved.';
  }catch(error){status.textContent=error.message||'Could not submit the review.';}
  finally{submit.disabled=false;}
});
$('#enquiry')?.addEventListener('submit',async e=>{e.preventDefault();const d=new FormData(e.target);const text=`Hello witness_lema_,\n\nName: ${d.get('name')}\nEmail: ${d.get('email')}\nProject: ${d.get('type')}\nPreferred date: ${d.get('date')||'Flexible'}\n\n${d.get('message')}`;try{await navigator.clipboard.writeText(text);$('#form-status').textContent='Enquiry copied. Nothing has been sent. Paste it into WhatsApp or your preferred contact channel.';$('#copy-fallback').hidden=true;}catch{$('#copy-fallback').value=text;$('#copy-fallback').hidden=false;$('#copy-fallback').focus();$('#copy-fallback').select();$('#form-status').textContent='Your browser blocked automatic copying. Select and copy the prepared enquiry below. Nothing has been sent.';}});
// Hero rotation pauses on request, hidden tabs, focus, hover and reduced motion.
const slides=[...document.querySelectorAll('.hero-slide')];
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
let activeSlide=0,paused=reduced.matches,hovered=false,focused=false,heroTimer=null;
const motionButton=$('#motion-toggle');
function showSlide(index){activeSlide=index;slides.forEach((slide,i)=>slide.classList.toggle('active',i===index));document.querySelectorAll('[data-slide]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.slide)===index)));if($('#slide-number'))$('#slide-number').textContent=`0${index+1} / 0${slides.length}`;}
function scheduleSlides(){clearInterval(heroTimer);document.body.classList.toggle('motion-paused',paused||reduced.matches);if(motionButton){motionButton.hidden=reduced.matches;motionButton.querySelector('span').textContent=paused?'▷':'Ⅱ';motionButton.setAttribute('aria-label',paused?'Play slideshow':'Pause slideshow');motionButton.setAttribute('aria-pressed',String(paused));}if(slides.length>1&&!paused&&!hovered&&!focused&&!document.hidden&&!reduced.matches)heroTimer=setInterval(()=>showSlide((activeSlide+1)%slides.length),6000);}
motionButton?.addEventListener('click',()=>{paused=!paused;scheduleSlides();});
document.querySelectorAll('[data-slide]').forEach(b=>b.addEventListener('click',()=>{showSlide(Number(b.dataset.slide));paused=true;scheduleSlides();}));
const hero=$('.cinematic-hero');
$('.slide-controls')?.addEventListener('mouseenter',()=>{hovered=true;scheduleSlides();});$('.slide-controls')?.addEventListener('mouseleave',()=>{hovered=false;scheduleSlides();});
hero?.addEventListener('focusin',()=>{focused=true;scheduleSlides();});hero?.addEventListener('focusout',e=>{focused=hero.contains(e.relatedTarget);scheduleSlides();});
document.addEventListener('visibilitychange',scheduleSlides);reduced.addEventListener('change',()=>{paused=reduced.matches;scheduleSlides();});scheduleSlides();
// About portraits rotate automatically, while respecting reduced-motion preferences.
const aboutSlides=[...document.querySelectorAll('.about-slide')];let aboutIndex=0;
function showAboutSlide(next){aboutIndex=next;aboutSlides.forEach((slide,i)=>{const active=i===next;slide.classList.toggle('active',active);slide.setAttribute('aria-hidden',String(!active));});}
if(aboutSlides.length>1&&!reduced.matches)setInterval(()=>{if(!document.hidden)showAboutSlide((aboutIndex+1)%aboutSlides.length);},4500);
document.querySelectorAll('[data-open-assistant]').forEach(b=>b.addEventListener('click',()=>setAssistant(true)));
if('IntersectionObserver' in window&&!reduced.matches){const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('in-view');observer.unobserve(entry.target);}});},{threshold:.08});document.querySelectorAll('.intro-editorial,.section-head,.work-row,.statement-band p').forEach(el=>{el.classList.add('reveal-ready');observer.observe(el);});}
const backTop=document.createElement('button');backTop.className='back-top';backTop.textContent='↑';backTop.setAttribute('aria-label','Back to top');backTop.hidden=true;document.body.append(backTop);window.addEventListener('scroll',()=>{backTop.hidden=window.scrollY<700;},{passive:true});backTop.addEventListener('click',()=>window.scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'}));
