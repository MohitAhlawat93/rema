import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PUBLIC_PATHS,trustedOrigin,runAutomaticSetupChecks} from '../lib/setup-automation.js';

const publish={
 business:{requestedDomain:'lema.example'},
 images:[{src:'/images/gallery/portrait-01.jpg',hero:true}],
 services:[{title:'Demo',text:'Example'}]
};
const response=(body,status=200)=>({status,text:async()=>typeof body==='string'?body:JSON.stringify(body),
 json:async()=>typeof body==='string'?JSON.parse(body):body});
test('site checker only uses its server-configured approved origin, and GETs only public paths',async()=>{
 const calls=[];
 const fetchImpl=async(url,options)=>{
  calls.push({url,method:options.method,redirect:options.redirect});
  const u=new URL(url);
  if(u.pathname==='/sitemap.xml')return response('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  if(u.pathname==='/robots.txt')return response('User-agent: *\nAllow: /\n');
  if(u.pathname==='/api/site-content')return response({payload:publish});
  return response('<!doctype html><title>Live</title>');
 };
 const env={SUPABASE_URL:'https://rhwefssbnhmsypnjdfcl.supabase.co',
  SUPABASE_PUBLISHABLE_KEY:'p',GROQ_API_KEY:'secret',
  SEO_SITE_ORIGIN:'https://live.example'};
 const result=await runAutomaticSetupChecks({env,fetchImpl});
 assert.equal(calls.length,9);
 assert.deepEqual(calls.map(c=>new URL(c.url).pathname),[...PUBLIC_PATHS,'/sitemap.xml','/robots.txt','/api/site-content']);
 assert.ok(calls.every(x=>x.method==='GET'&&!x.url.includes('lema.example')&&x.redirect==='manual'));
 assert.ok(calls.every(x=>x.url.startsWith('https://live.example/')));
 assert.equal(result.mode,'read_only');
 for(const id of ['pages','sitemap','robots','content','photos'])assert.equal(result.checks.find(x=>x.id===id).status,'passed');
 assert.equal(result.checks.find(x=>x.id==='client-database').status,'developer_action');
 assert.equal(result.checks.find(x=>x.id==='google').status,'owner_action');
 assert.equal(result.checks.find(x=>x.id==='ai').status,'configured');
 assert.match(result.limitations,/not proof/);
 const serialized=JSON.stringify(result);
 assert.doesNotMatch(serialized,/secret|SUPABASE_PUBLISHABLE_KEY/);
});
test('invalid or untrusted owner request URLs cannot change public origin',()=>{
 assert.equal(trustedOrigin({}),'https://rema-ruby.vercel.app');
 for(const value of ['http://example.com','https://localhost','https://127.0.0.1','https://example.com/a',
  'https://example.com?b=1','https://user:pass@example.com','garbage']){
   assert.equal(trustedOrigin({SEO_SITE_ORIGIN:value}),'https://rema-ruby.vercel.app');
 }
});
test('page/API outages remain visible; failures are not silently marked ready',async()=>{
 const report=await runAutomaticSetupChecks({
  env:{},fetchImpl:async(url)=>{
   if(url.endsWith('/robots.txt'))return response('User-agent: *\nDisallow: /\n');
   if(url.endsWith('/api/site-content'))return response({error:'not available'},503);
   if(url.endsWith('/sitemap.xml'))return response('No sitemap',404);
   if(url.endsWith('/gallery/'))throw new Error('Not reachable');
   return response('<html></html>',200);
  }
 });
 assert.equal(report.checks.find(x=>x.id==='pages').status,'attention');
 assert.equal(report.checks.find(x=>x.id==='robots').status,'attention');
 assert.equal(report.checks.find(x=>x.id==='sitemap').status,'attention');
 assert.equal(report.checks.find(x=>x.id==='content').status,'attention');
 assert.equal(report.checks.find(x=>x.id==='photos').status,'attention');
 assert.equal(report.checks.find(x=>x.id==='domain').status,'owner_action');
 assert.equal(report.checks.find(x=>x.id==='client-database').status,'developer_action');
});
test('owner-only route is read-only and follows session protection',async()=>{
 const route=await readFile(new URL('../api/admin/[route].js',import.meta.url),'utf8');
 const html=await readFile(new URL('../public/admin.html',import.meta.url),'utf8');
 const ui=await readFile(new URL('../public/handover.js',import.meta.url),'utf8');
 assert.ok(route.indexOf("if(route==='setup-check')")>route.indexOf('if(!protectedRoute(req,res))return;'));
 assert.match(route,/if\(req.method!=='GET'\)return send\(res,405,\{error:'Use GET.'\}\)/);
 assert.match(route,/runAutomaticSetupChecks\(\)/);
 assert.match(html,/data-handover-check/);
 assert.match(ui,/if\(practice\)\{drawScan\(null\);return;\}/);
 assert.match(ui,/const result=await request\('setup-check'\)/);
 assert.doesNotMatch(ui,/fetch\(.*SEO_SITE_ORIGIN/);
});
