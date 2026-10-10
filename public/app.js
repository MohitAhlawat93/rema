import { site } from './data/site.js';
import { answerQuestion } from './lib/faq.js';
const $ = s => document.querySelector(s);
const menu = $('.menu-toggle'), nav = $('#navigation');
function setMenu(open) { nav.classList.toggle('open',open);menu.setAttribute('aria-expanded',String(open)); }
menu.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));
nav.addEventListener('click',()=>setMenu(false));
const launcher=$('#assistant-launch'),panel=$('#assistant-panel'),question=$('#question'),messages=$('#messages');
function setAssistant(open) { panel.hidden=!open;launcher.hidden=open;launcher.setAttribute('aria-expanded',String(open));(open?question:launcher).focus(); }
launcher.addEventListener('click',()=>setAssistant(true));$('#assistant-minimize').addEventListener('click',()=>setAssistant(false));
function bubble(text, user=false, href='') {const p=document.createElement('p');p.className='bubble'+(user?' user':'');p.textContent=text;if(href){const a=document.createElement('a');a.href=href;a.textContent='Explore this page ↗';p.append(a);}messages.append(p);while(messages.children.length>40)messages.firstElementChild.remove();messages.scrollTop=messages.scrollHeight;}
async function ask(text) {const clean=text.trim();if(!clean)return;bubble(clean,true);question.value='';question.disabled=true;try{const response=await fetch('/api/assistant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:clean})});if(!response.ok)throw new Error('Assistant unavailable');const answer=await response.json();bubble(answer.answer,false,answer.href);}catch{const answer=answerQuestion(clean,site.faqs);bubble(answer.answer,false,answer.href);}finally{question.disabled=false;question.focus();}}
$('#assistant-form').addEventListener('submit',e=>{e.preventDefault();void ask(question.value);});
document.querySelectorAll('[data-question]').forEach(b=>b.addEventListener('click',()=>ask(b.dataset.question)));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(menu.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus();}if(!panel.hidden)setAssistant(false);}});
// Adapted from witness_lema_'s gallery stepping/focus-return flow; native dialog adds focus containment.
const viewer=$('#photo-viewer');let index=0,returnFocus=null;
function visibleIndices(){return [...document.querySelectorAll('[data-photo]')].filter(b=>!b.closest('figure').hidden).map(b=>Number(b.dataset.photo));}
function renderPhoto(){const im=site.images[index];$('#photo-image').src=im.src;$('#photo-image').alt=im.alt;const visible=visibleIndices();$('#photo-caption').textContent=`${im.title} · ${visible.indexOf(index)+1} / ${visible.length}`;}
function stepPhoto(delta){const visible=visibleIndices();index=visible[(visible.indexOf(index)+delta+visible.length)%visible.length];renderPhoto();}
document.querySelectorAll('[data-photo]').forEach(b=>b.addEventListener('click',()=>{index=Number(b.dataset.photo);returnFocus=b;renderPhoto();viewer.showModal();$('#photo-close').focus();}));
$('#photo-close').addEventListener('click',()=>viewer.close());viewer.addEventListener('close',()=>returnFocus?.focus());$('#photo-prev').addEventListener('click',()=>stepPhoto(-1));$('#photo-next').addEventListener('click',()=>stepPhoto(1));viewer.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')stepPhoto(-1);if(e.key==='ArrowRight')stepPhoto(1);});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});document.querySelectorAll('[data-photo]').forEach(x=>{x.closest('figure').hidden=b.dataset.filter!=='All'&&site.images[Number(x.dataset.photo)].category!==b.dataset.filter;});$('[data-gallery-status]').textContent=`Showing ${visibleIndices().length} images`;}));
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
