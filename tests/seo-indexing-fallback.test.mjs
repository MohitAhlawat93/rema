import test from 'node:test';
import assert from 'node:assert/strict';
import renderPublishedSeo from '../middleware.js';
import { onRequest as cloudflareSeo } from '../functions/_middleware.js';
import { SEO_ROUTES } from '../seo/live.mjs';

const destination='https://lema-transfer-trial.pages.dev';
const pages=Object.fromEntries(SEO_ROUTES.map(route=>[route,{
  title:'A clear and factual page title for this website',
  description:'An accurate, concise description of this website and the useful information available to visitors.',
  image:'/images/gallery/portrait-01.jpg',index:true,
  heading:'Additional information about this website',
  paragraphs:['This is a complete paragraph describing the published website and helping visitors find relevant information.'],
  links:[{href:route==='/about/'?'/contact/':'/about/',label:'Find additional information'}]
}]));
const template='<html><head><title>Outdated site</title>'+
  '<meta name="description" content="Old copy"><meta name="robots" content="index, follow">'+
  '<link rel="canonical" href="https://rema-ruby.vercel.app/">'+
  '<meta property="og:url" content="https://rema-ruby.vercel.app/">'+
  '</head><body><main><section class="seo-editorial" aria-label="Further information"></section></main></body></html>';
const assetFetch=async url=>{
  if(String(url).includes('/seo-defaults.json'))return Response.json({pages});
  return new Response(template,{headers:{'content-type':'text/html'}});
};

test('a staging site renders its own canonical and a noindex directive without a published DB row',async()=>{
  const response=await renderPublishedSeo(new Request(destination+'/'),{
    env:{SEO_SITE_ORIGIN:destination,SEO_INDEXING_ENABLED:'false'},
    assetFetch,hosting:'cloudflare'
  });
  const html=await response.text();
  assert.equal(response.status,200);
  assert.match(html,/rel="canonical" href="https:\/\/lema-transfer-trial\.pages\.dev\/"/);
  assert.doesNotMatch(html,/rel="canonical" href="https:\/\/rema-ruby\.vercel\.app\/"/);
  assert.match(html,/<meta name="robots" content="noindex, nofollow">/);
  assert.match(response.headers.get('x-robots-tag')||'',/noindex/);
});

test('staging sitemap stays empty if there is no published DB row',async()=>{
  const response=await renderPublishedSeo(new Request(destination+'/sitemap.xml'),{
    env:{SEO_SITE_ORIGIN:destination,SEO_INDEXING_ENABLED:'false'},
    assetFetch,hosting:'cloudflare'
  });
  const xml=await response.text();
  assert.equal(response.status,200);
  assert.doesNotMatch(xml,/<loc>/);
});

test('SEO middleware exception never exposes an indexable static staging page',async()=>{
  let fallbackCalled=false;
  const response=await cloudflareSeo({
    request:new Request(destination+'/about/'),
    env:{ASSETS:{fetch:async()=>{throw new Error('asset service unavailable');}},SEO_INDEXING_ENABLED:'false'},
    next:async()=>{fallbackCalled=true;return new Response('<html><meta name="robots" content="index"></html>',{status:200,headers:{'content-type':'text/html'}});}
  });
  assert.equal(fallbackCalled,true);
  assert.equal(response.status,200);
  assert.match(response.headers.get('x-robots-tag')||'',/noindex/);
});

test('missing SEO defaults also fail closed for indexing',async()=>{
  const response=await renderPublishedSeo(new Request(destination+'/'),{
    env:{SEO_SITE_ORIGIN:destination,SEO_INDEXING_ENABLED:'true'},
    assetFetch:async()=>new Response(template),hosting:'cloudflare'
  });
  assert.match(response.headers.get('x-robots-tag')||'',/noindex/);
});
