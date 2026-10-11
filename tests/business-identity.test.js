import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DEFAULT_BUSINESS,businessErrors,resolveBusiness,seoIdentityText} from '../seo/business.mjs';
import {renderLivePage} from '../seo/live.mjs';

const origin='https://final-domain.example';
const about={
 title:'About Witness Lema | Official Website',
 description:'Information about Witness Lema, her work, how to get in touch and what visitors can expect from this website.',
 image:'/images/gallery/portrait-01.jpg',index:true,
 heading:'A genuine introduction to the owner of this website',
 paragraphs:['A complete introduction to the website, its history and the type of public information visitors can find here.'],
 links:[{href:'/contact/',label:'Contact the website owner'}]
};
const template=`<!doctype html><html><head><title>Previous website</title>
 <meta name="description" content="old"><meta name="robots" content="noindex">
 <link rel="canonical" href="https://old-website.invalid/about/">
 <link rel="icon" data-business-icon href="/assets/mark.svg">
 <meta property="og:title" content="old"><meta property="og:description" content="old">
 <meta property="og:site_name" content="previous brand"><meta property="og:url" content="https://old-website.invalid/about/">
 <meta property="og:image" content="old"><meta property="og:image:alt" content="previous">
 <meta name="twitter:title" content="old"><meta name="twitter:description" content="old"><meta name="twitter:image" content="old">
 <script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':[
  {'@type':'WebSite',name:'previous',url:'https://old-website.invalid/'},
  {'@type':'WebPage',name:'old',description:'old'},
  {'@type':'Person',name:'previous'}
 ]})}</script></head><body>
 <header><a class="wordmark" href="/" data-business-home-link aria-label="old home"><img class="brand-symbol" data-business-logo src="/assets/mark.svg" alt=""><span class="brand-name" data-business-wordmark>old<small data-business-tagline>old tagline</small></span></a></header>
 <main><div data-business-email-slot></div><section class="seo-editorial" aria-label="Further information"></section></main>
 <footer><span class="brand-name" data-business-wordmark>old<small data-business-tagline>old tagline</small></span><span class="fine" data-business-copyright>© 2025 · Old</span></footer>
 </body></html>`;
test('business identity defaults are safe and keep legacy published versions working',()=>{
 assert.equal(resolveBusiness(null).name,DEFAULT_BUSINESS.name);
 assert.deepEqual(businessErrors(DEFAULT_BUSINESS),[]);
 assert.equal(resolveBusiness({name:'Bad<script>'}).name,DEFAULT_BUSINESS.name);
 assert.equal(seoIdentityText('About Witness Lema',DEFAULT_BUSINESS),'About Witness Lema');
});
test('bad domains, emails and logo URLs cannot be published',()=>{
 for(const values of [
  {requestedDomain:'https://evil.example'},
  {requestedDomain:'example.com/attack'},
  {requestedDomain:'sub..example.com'},
  {logoUrl:'javascript:alert(1)'},
  {logoUrl:'//other.example/logo.svg'},
  {logoUrl:'/images/../secrets.svg'},
  {email:'x<script>@a.test'}
 ]){
  const input={...DEFAULT_BUSINESS,...values};
  assert.ok(businessErrors(input).length>0,JSON.stringify(values));
 }
 assert.deepEqual(businessErrors({...DEFAULT_BUSINESS,requestedDomain:'my-business.example'}),[]);
});
test('identity changes reach server HTML, schema, metadata and links; requested domain does not become canonical',()=>{
 const b={...DEFAULT_BUSINESS,name:'Example Studios',wordmark:'EXAMPLE_',tagline:'A fresh look',city:'Mumbai',
  logoUrl:'/images/gallery/portrait-01.jpg',email:'hello@example.test',requestedDomain:'unverified.example'};
 const output=renderLivePage(template,'/about/',about,{business:b},origin,true);
 assert.match(output,/class="brand-name" data-business-wordmark>EXAMPLE_<small data-business-tagline>A fresh look/);
 assert.match(output,/data-business-home-link aria-label="Example Studios home"/);
 assert.match(output,/data-business-logo src="\/images\/gallery\/portrait-01.jpg"/);
 assert.match(output,/data-business-icon href="\/images\/gallery\/portrait-01.jpg"/);
 assert.match(output,/mailto:hello@example.test/);
 assert.match(output,/© \d{4} · Example Studios/);
 assert.match(output,/<title>About Example Studios \| Official Website<\/title>/);
 assert.match(output,/property="og:site_name" content="Example Studios"/);
 assert.match(output,/rel="canonical" href="https:\/\/final-domain.example\/about\/"/);
 assert.doesNotMatch(output,/unverified.example/);
 const ld=JSON.parse(output.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(ld['@graph'].find(x=>x['@type']==='Person').name,'Example Studios');
 assert.equal(ld['@graph'].find(x=>x['@type']==='WebSite').name,'Example Studios');
 assert.equal(ld['@graph'].find(x=>x['@type']==='WebPage').url,origin+'/about/');
});
test('metadata and business fields are escaped, invalid published business falls back',()=>{
 const b={...DEFAULT_BUSINESS,name:'Client & Co <Trusted>',wordmark:'Client & Co',city:'Mumbai'};
 const out=renderLivePage(template,'/about/',about,{business:b},origin);
 assert.ok(!out.includes('>Client & Co <Trusted>'));
 assert.match(out,/Client &amp; Co &lt;Trusted&gt;/);
 const bad=renderLivePage(template,'/about/',about,{business:{...b,logoUrl:'javascript:bad'}},origin);
 assert.match(bad,/data-business-wordmark>witness_lema_/);
});
test('admin section is wired to safe draft workflow and SSR tags',async()=>{
 const [html,admin,edge,build]=await Promise.all([
  readFile(new URL('../public/admin.html',import.meta.url),'utf8'),
  readFile(new URL('../public/admin.js',import.meta.url),'utf8'),
  readFile(new URL('../supabase/functions/witness-lema-admin/index.ts',import.meta.url),'utf8'),
  readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8')
 ]);
 assert.match(html,/data-tab="business"/);
 assert.match(html,/data-panel="business"/);
 for(const field of ['name','wordmark','tagline','city','email','logoUrl','requestedDomain'])assert.match(html,new RegExp('data-business-field="'+field+'"'));
 assert.match(admin,/initializeBusiness\(\)/);
 assert.match(admin,/validateBusinessDraft\(\)/);
 assert.match(edge,/if\(payload\.business!==undefined\)/);
 assert.match(build,/data-business-wordmark/);
 assert.match(html,/Entering a domain does not activate it/);
});
