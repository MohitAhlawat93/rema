import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {SEO_ROUTES,CONTENT_ROUTES,renderLivePage} from '../seo/live.mjs';
const url='https://rema-ruby.vercel.app', supa='https://example.supabase.co';
const seo={title:'Owner updated website page title',description:'Owner updated search description containing a realistic explanation of the current website page.',heading:'A useful heading edited by the owner',paragraphs:['A descriptive first paragraph that explains the subject and provides useful information for visitors.'],links:[{href:'/',label:'Back to the homepage'}],image:'/images/gallery/portrait-01.jpg',index:true};
const payload={
 hero:{eyebrow:'NEW TAGLINE',title:'Fresh headline',intro:'Updated homepage introduction'},
 about:{title:'New About title',heading:'New About heading',text:'Updated biography for About visitors'},
 servicesIntro:'Current owner-managed introduction',
 services:[{number:'01',title:'Updated service title',text:'Current service details',tag:'Current label',image:'/images/gallery/portrait-01.jpg'}],
 images:[{src:'/images/gallery/portrait-01.jpg',title:'Updated gallery photo',alt:'A photo',category:'Portraits',hero:true}],
 aboutImages:['/images/gallery/portrait-01.jpg'],
 social:{whatsapp:'https://wa.me/911234567890'},
 contactLinks:[{label:'Updated contact',url:'https://wa.me/911234567890'}],
 afterhours:{enabled:false,title:'Updated Afterhours',intro:'Updated Afterhours introduction',links:[{label:'Owner channel',url:'https://example.org/updates'}]},
 assistant:{name:'Updated Concierge',greeting:'Updated welcome message'},
 reviews:[{author:'Consenting visitor',textEn:'An independently submitted and approved guest review.',textHi:'',consent:true,published:true}]
};
const shell='<title>Old page title</title><meta name="description" content="old"><meta name="robots" content="noindex">'+
 '<div class="social-links"><a href="https://outdated.example">Outdated</a></div>'+
 '<div class="contact-social"><a href="https://outdated.example">Outdated</a></div>'+
 '<button id="afterhours-launch"></button>'+
 '<h2 id="afterhours-title">Old Afterhours</h2><p id="afterhours-intro">Old intro</p>'+
 '<div class="afterhours-links" data-afterhours-links></div>'+
 '<div class="assistant-head"><div><strong>Old Assistant</strong></div></div>'+
 '<div id="messages"><p class="bubble">Old greeting</p></div>';
test('private preview follows internal page links but never external, admin, or API links',async()=>{
 const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const start=app.indexOf('function previewHref(raw){'),end=app.indexOf('\nif(previewMode){',start);
 assert.ok(start>0&&end>start,'missing production preview navigation helper');
 const source=app.slice(start,end);
 const context=vm.createContext({URL,location:new URL(url+'/?admin_preview=1'),previewAuthorized:true});
 const fn=new vm.Script(source+'\npreviewHref').runInContext(context);
 for(const route of [...CONTENT_ROUTES,'/gallery/?category=Portraits#photos']){
  const expected=new URL(route,url);expected.searchParams.set('admin_preview','1');
  assert.equal(fn(route),expected.pathname+expected.search+expected.hash,route);
 }
 assert.equal(fn('/admin'),null);
 assert.equal(fn('/api/site-content'),null);
 assert.equal(fn('https://external.example/about/'),null);
 assert.equal(fn('#contact'),null);
 assert.match(app,/document\.addEventListener\('click',event=>/);
});
test('all editable public routes read one published content model',()=>{
 assert.deepEqual(CONTENT_ROUTES,[...SEO_ROUTES,'/privacy/']);
 for(const route of CONTENT_ROUTES){
  const out=renderLivePage(shell,route,SEO_ROUTES.includes(route)?seo:null,payload,url,true,supa);
  assert.match(out,/Updated contact/,'contact links missing on '+route);
  assert.doesNotMatch(out,/Outdated/,'old links on '+route);
  assert.match(out,/Updated Afterhours/,'afterhours missing on '+route);
  assert.match(out,/Updated Concierge/,'assistant missing on '+route);
  assert.match(out,/Updated welcome message/,'assistant greeting missing on '+route);
  assert.match(out,/id="afterhours-launch"[^>]*hidden|hidden id="afterhours-launch"/,'disabled launcher visible on '+route);
 }
});
test('owner page-specific edits render on Home About Services Gallery and Reviews',()=>{
 const home=shell+'<div class="hero-background" aria-hidden="true"><img src="/old.jpg"></div>'+
  '<div class="hero-copy"><p class="eyebrow">Old</p><h1>Old</h1><p class="intro">Old</p></div>';
 const outHome=renderLivePage(home,'/',seo,payload,url,true,supa);
 assert.match(outHome,/Fresh headline/);assert.match(outHome,/NEW TAGLINE/);
 assert.match(outHome,/src="\/images\/gallery\/portrait-01.jpg"/);
 const about=shell+'<section class="page-heading"><h1>Old title</h1></section>'+
  '<figure class="about-rotator"><img src="/old.jpg"></figure>'+
  '<div class="editorial"><h2>Old</h2><p class="intro">Old bio</p></div>';
 const outAbout=renderLivePage(about,'/about/',seo,payload,url,true,supa);
 for(const word of ['New About title','New About heading','Updated biography','about-slide'])assert.ok(outAbout.includes(word),word);
 const services=shell+'<section class="page-heading"><p class="intro">Old</p></section>'+
  '<section class="work-page service-grid"><p>Old services</p></section>';
 const outServices=renderLivePage(services,'/services/',seo,payload,url,true,supa);
 assert.match(outServices,/Updated service title/);assert.match(outServices,/Current owner-managed introduction/);assert.doesNotMatch(outServices,/Old services/);
 const gallery=shell+'<div class="filters" role="group" aria-label="Filter gallery"><button>Old</button></div>'+
  '<div class="gallery-grid full-gallery"><figure>Old</figure></div>'+
  '<p class="fine" data-gallery-status>Old</p>';
 const outGallery=renderLivePage(gallery,'/gallery/',seo,payload,url,true,supa);
 assert.match(outGallery,/Updated gallery photo/);assert.match(outGallery,/Portraits/);assert.match(outGallery,/Showing 1 images/);
 const reviews=shell+'<div class="review-grid" data-public-reviews><p class="review-empty">No reviews published yet.</p></div>';
 const outReviews=renderLivePage(reviews,'/reviews/',null,payload,url,true,supa);
 assert.match(outReviews,/Consenting visitor/);assert.match(outReviews,/independently submitted/);assert.doesNotMatch(outReviews,/No reviews published yet/);
});
test('server rendering escapes malicious text, invalid links, and unapproved reviews',()=>{
 const dangerous={...payload,contactLinks:[{label:'Bad',url:'javascript:alert(1)'}],
  reviews:[{author:'Injected',textEn:'Wrong',consent:false,published:true},{author:'<img src=x onerror=1>',textEn:'<script>unsafe</script>',consent:true,published:true}],
  hero:{title:'<script>unsafe</script>'}
 };
 const html=renderLivePage(shell+'<div class="hero-copy"><h1>Old</h1></div><div class="review-grid" data-public-reviews></div>','/reviews/',null,dangerous,url,true,supa);
 assert.doesNotMatch(html,/javascript:alert/);
 assert.doesNotMatch(html,/Injected/);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>unsafe<\/script>/);
});
test('templates include all content routes without broadening indexable SEO pages',async()=>{
 const [middleware,builder,siteAPI]=await Promise.all([
  readFile(new URL('../middleware.js',import.meta.url),'utf8'),
  readFile(new URL('../scripts/render-seo.mjs',import.meta.url),'utf8'),
  readFile(new URL('../api/site-content.js',import.meta.url),'utf8')
 ]);
 assert.match(middleware,/CONTENT_ROUTES/);
 assert.match(middleware,/reviews\/.*privacy\//);
 assert.match(builder,/for\(const route of \['\/privacy\/'\]\)/);
 assert.match(siteAPI,/'no-store'/);
 assert.match(middleware,/cache-control':'no-store'/);
});
