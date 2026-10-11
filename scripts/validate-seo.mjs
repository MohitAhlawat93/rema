import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import config from '../seo/site.config.mjs';

const root=path.resolve('dist');
const origin=new URL(config.origin).origin;
const sitemap=await readFile(path.join(root,'sitemap.xml'),'utf8');
const images=await readFile(path.join(root,'image-sitemap.xml'),'utf8');
const robots=await readFile(path.join(root,'robots.txt'),'utf8');
const canonicals=new Set();
let indexed=0;
for(const [route,page] of Object.entries(config.pages)){
  const file=route==='/404/'?'404.html':route==='/'?'index.html':route.slice(1)+'index.html';
  const html=await readFile(path.join(root,file),'utf8');
  const canonical=origin+route;
  const expectedIndex=config.indexingEnabled && page.index;
  assert.match(html,/<title>[^<]{10,70}<\/title>/i,route+' title');
  assert.match(html,/<meta name="description" content="[^"]{40,170}">/i,route+' description');
  assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'),route+' canonical');
  assert.ok(html.includes('<meta property="og:url" content="'+canonical+'">'),route+' Open Graph URL');
  assert.ok(html.includes('<meta property="og:image"'),route+' social image');
  assert.ok(html.includes('<meta name="twitter:card"'),route+' Twitter card');
  assert.ok(html.includes('<script type="application/ld+json">'),route+' JSON-LD');
  const h1=html.split('<h1').length-1;
  assert.equal(h1,1,route+' must have one primary heading');
  if(page.index){
    assert.ok(html.includes('class="seo-editorial"'),route+' must offer useful, visible supporting content');
    assert.ok(html.includes('class="seo-editorial-links"'),route+' must have related internal links');
    assert.ok(html.includes('aria-label="Related pages"'),route+' must link to related pages');
  }
  const encoded=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(encoded,route+' JSON-LD block');
  const ld=JSON.parse(encoded[1]);
  assert.equal(ld['@context'],'https://schema.org');
  if(route==='/'||route==='/about/'){
    assert.ok(ld['@graph'].some(x=>x['@type']==='Person'&&x.name==='Witness Lema'),route+' identity schema');
  }
  // Never add anonymous ratings or fabricated endorsements to the SEO schema.
  assert.ok(!ld['@graph'].some(x=>['Review','AggregateRating'].includes(x['@type'])),route+' must not fabricate reviews');
  const robotsTag=html.match(/<meta name="robots" content="([^"]+)">/i)?.[1]||'';
  if(expectedIndex){
    indexed++;
    assert.match(robotsTag,/^index, follow/,route+' must be indexable');
    assert.ok(sitemap.includes('<loc>'+canonical+'</loc>'),route+' sitemap');
  }else {
    assert.match(robotsTag,/noindex/,route+' must stay blocked');
    assert.ok(!sitemap.includes('<loc>'+canonical+'</loc>'),route+' must not be in sitemap');
  }
  assert.ok(!canonicals.has(canonical),'Duplicate canonical: '+canonical);
  canonicals.add(canonical);
}
const adminHtml=await readFile(path.join(root,'admin.html'),'utf8');
assert.match(adminHtml,/noindex,nofollow/);
const home=await readFile(path.join(root,'index.html'),'utf8');
assert.ok(home.includes('<link rel="preload" as="image"'), 'Homepage primary hero preload');
assert.ok(home.includes('fetchpriority="low"'), 'Secondary hero images should use low priority');
assert.ok(home.includes('decoding="async"'), 'Gallery should decode images asynchronously');
if(config.indexingEnabled){
  assert.equal(indexed,5);
  assert.match(robots,/Sitemap: .*\/sitemap\.xml/);
  assert.match(images,/<image:image>/);
  assert.doesNotMatch(robots,/Disallow: \/$/m);
}else {
  assert.match(robots,/Disallow: \/$/m);
  assert.doesNotMatch(sitemap,/<loc>/);
}
const vercel=JSON.parse(await readFile('vercel.json','utf8'));
assert.ok(!vercel.headers.find(x=>x.source==='/(.*)').headers.some(x=>x.key==='X-Robots-Tag'),'Global X-Robots-Tag must not block indexing');
console.log('SEO validation passed ('+indexed+' indexable public pages, indexing '+(config.indexingEnabled?'on':'off')+').');
