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
function ask(text) {if(!text.trim())return;bubble(text,true);const answer=answerQuestion(text,site.faqs);bubble(answer.answer,false,answer.href);question.value='';}
$('#assistant-form').addEventListener('submit',e=>{e.preventDefault();ask(question.value);});
document.querySelectorAll('[data-question]').forEach(b=>b.addEventListener('click',()=>ask(b.dataset.question)));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(menu.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus();}if(!panel.hidden)setAssistant(false);}});
// Adapted from Rebecca's gallery stepping/focus-return flow; native dialog adds focus containment.
const viewer=$('#photo-viewer');let index=0,returnFocus=null;
function visibleIndices(){return [...document.querySelectorAll('[data-photo]')].filter(b=>!b.closest('figure').hidden).map(b=>Number(b.dataset.photo));}
function renderPhoto(){const im=site.images[index];$('#photo-image').src=im.src;$('#photo-image').alt=im.alt;const visible=visibleIndices();$('#photo-caption').textContent=`${im.title} · ${visible.indexOf(index)+1} / ${visible.length}`;}
function stepPhoto(delta){const visible=visibleIndices();index=visible[(visible.indexOf(index)+delta+visible.length)%visible.length];renderPhoto();}
document.querySelectorAll('[data-photo]').forEach(b=>b.addEventListener('click',()=>{index=Number(b.dataset.photo);returnFocus=b;renderPhoto();viewer.showModal();$('#photo-close').focus();}));
$('#photo-close').addEventListener('click',()=>viewer.close());viewer.addEventListener('close',()=>returnFocus?.focus());$('#photo-prev').addEventListener('click',()=>stepPhoto(-1));$('#photo-next').addEventListener('click',()=>stepPhoto(1));viewer.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')stepPhoto(-1);if(e.key==='ArrowRight')stepPhoto(1);});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});document.querySelectorAll('[data-photo]').forEach(x=>{x.closest('figure').hidden=b.dataset.filter!=='All'&&site.images[Number(x.dataset.photo)].category!==b.dataset.filter;});$('[data-gallery-status]').textContent=`Showing ${visibleIndices().length} studies`;}));
$('#enquiry')?.addEventListener('submit',async e=>{e.preventDefault();const d=new FormData(e.target);const text=`Hello Anora,\n\nName: ${d.get('name')}\nEmail: ${d.get('email')}\nProject: ${d.get('type')}\nPreferred date: ${d.get('date')||'Flexible'}\n\n${d.get('message')}`;try{await navigator.clipboard.writeText(text);$('#form-status').textContent='Enquiry copied. Nothing has been sent. Use a verified contact channel when one is available.';$('#copy-fallback').hidden=true;}catch{$('#copy-fallback').value=text;$('#copy-fallback').hidden=false;$('#copy-fallback').focus();$('#copy-fallback').select();$('#form-status').textContent='Your browser blocked automatic copying. Select and copy the prepared enquiry below. Nothing has been sent.';}});
