import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../seo/site.config.mjs';
import editorial from '../seo/editorial.config.mjs';
import {SEO_ROUTES,cleanSEOPage,renderLivePage,xmlSitemap,imageSitemap,validImage} from '../seo/live.mjs';

const origin='https://rema-ruby.vercel.app';
const defaults=Object.fromEntries(SEO_ROUTES.map(route=>[route,{
  ...config.pages[route],heading:editorial[route].heading,paragraphs:editorial[route].paragraphs,links:editorial[route].links
}]));

test('SEO editor defaults cover exactly five meaningful public pages',()=>{
 assert.equal(SEO_ROUTES.length,5);
 for(const route of SEO_ROUTES){
  const p=cleanSEOPage(null,route,defaults[route]);
  assert.equal(p.title,config.pages[route].title);
  assert.ok(p.paragraphs.length>=1);
  assert.ok(p.links.every(x=>x.href!==route));
 }
});

test('SEO input falls back safely and rejects dangerous images',()=>{
 assert.ok(validImage('/images/gallery/portrait-01.jpg'));
 assert.ok(!validImage('javascript:alert(1)'));
 assert.ok(!validImage('//evil.example/x.jpg'));
 assert.ok(!validImage('/images/../secrets.txt'));
 const p=cleanSEOPage({
  title:'Short',description:'Bad',image:'javascript:alert(1)',index:false,
  heading:'Bad',paragraphs:['short'],links:[{href:'https://evil.example/',label:'External'}]
 },'/',defaults['/']);
 assert.equal(p.title,defaults['/'].title);
 assert.equal(p.image,defaults['/'].image);
 assert.equal(p.heading,defaults['/'].heading);
 assert.equal(p.index,false);
 assert.deepEqual(p.links,defaults['/'].links);
});

test('Published SEO reaches HTTP head and visible editorial without JavaScript',()=>{
 const template='<!doctype html><html><head><title>Old</title>'+
 '<meta name="description" content="old"><meta name="robots" content="noindex, nofollow">'+
 '<meta property="og:title" content="old"><meta property="og:description" content="old">'+
 '<meta property="og:image" content="old"><meta name="twitter:title" content="old">'+
 '<meta name="twitter:description" content="old"><meta name="twitter:image" content="old">'+
 '<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'WebPage',name:'Old',description:'old'}]})+'</script>'+
 '</head><body><main><section class="seo-editorial" aria-label="Further information"><h2>Old</h2></section></main></body></html>';
 const page={...defaults['/'],title:'A helpful, accurate page title for Lema',description:'Clear, factual information that helps visitors find and understand the real Witness Lema website.',
 heading:'Learn more about the owner',paragraphs:['This is a useful and complete first paragraph about visiting this actual page and how it works.'],
 links:[{href:'/about/',label:'Learn about Lema'}]};
 const result=renderLivePage(template,'/',page,{},origin);
 assert.match(result,/<title>A helpful, accurate page title for Lema<\/title>/);
 assert.match(result,/content="index, follow/);
 assert.match(result,/Learn more about the owner/);
 assert.match(result,/Learn about Lema/);
 assert.match(result,/"description":"Clear, factual information/);
 const unsafe={...page,title:'A title with <script>alert("x")</script> text',heading:'Read <script>alert(1)</script> about us'};
 const out=renderLivePage(template,'/',unsafe,{},origin);
 assert.ok(!out.includes('<script>alert'));
 assert.match(out,/&lt;script&gt;/);
 const preview=renderLivePage(template,'/',page,{},origin,false);
 assert.match(preview,/noindex, nofollow/);
});

test('Dynamic sitemaps reflect published index choices',()=>{
 const pages=Object.fromEntries(SEO_ROUTES.map(route=>[route,{index:route!=='/gallery/'}]));
 const sitemap=xmlSitemap(pages,origin);
 assert.match(sitemap,/<loc>https:\/\/rema-ruby.vercel.app\/<\/loc>/);
 assert.ok(!sitemap.includes('/gallery/'));
 assert.ok(!xmlSitemap(pages,origin,false).includes('<loc>'));
 const photos=[{src:'/images/gallery/portrait-01.jpg',hero:true},{src:'/images/gallery/portrait-02.jpg',hero:false}];
 const images=imageSitemap(pages,{images:photos,aboutImages:[photos[0].src]},origin);
 assert.ok(images.includes('portrait-01.jpg'));
 assert.ok(!images.includes('/gallery/</loc>'));
});
