import test from 'node:test';
import assert from 'node:assert/strict';
import {auditSite,PUBLIC_ROUTES} from '../scripts/audit-live-search.mjs';

const origin='https://example.com';
const page=(route,{noindex=false,canonical=origin+route}={})=>
  '<html><head><title>Example service page</title>'+
  '<meta name="description" content="A useful description of an approved page">'+
  '<meta name="robots" content="'+(noindex?'noindex, nofollow':'index, follow')+'">'+
  '<link rel="canonical" href="'+canonical+'"></head>'+
  '<body><h1>Verified information</h1></body></html>';

function fixture(overrides={}){
  const pages=Object.fromEntries(PUBLIC_ROUTES.map(route=>[route,page(route)]));
  pages['/privacy/']=page('/privacy/',{noindex:true});
  pages['/admin']=page('/admin',{noindex:true});
  pages['/sitemap.xml']='<urlset>'+PUBLIC_ROUTES.map(route=>
    '<url><loc>'+origin+route+'</loc></url>').join('')+'</urlset>';
  pages['/robots.txt']='User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml';
  Object.assign(pages,overrides);
  return async url=>{
    const body=pages[new URL(url).pathname];
    return new Response(body??'Not found',{
      status:body===undefined?404:200,
      headers:{'content-type':'text/html'}
    });
  };
}
const codes=report=>report.findings.map(f=>f.code);
test('all pages and metadata pass on a verified launch fixture',async()=>{
  const report=await auditSite({origin,fetchImpl:fixture(),expectIndexable:true});
  assert.equal(report.pass,true);
  assert.equal(report.checkedRoutes,8);
  assert.equal(report.googleIndexed,'unknown');
  assert.equal(report.searchConsoleVerified,false);
});
test('noindex and sitemap conflict is reported',async()=>{
  const report=await auditSite({origin,fetchImpl:fixture({'/about/':page('/about/',{noindex:true})}),expectIndexable:true});
  assert.ok(codes(report).includes('SITEMAP_NOINDEX_CONFLICT'));
  assert.ok(codes(report).includes('NOINDEX_ON_LAUNCH'));
});
test('detects an old canonical domain after handover',async()=>{
  const report=await auditSite({origin,fetchImpl:fixture({'/contact/':page('/contact/',{canonical:'https://old.test/contact/'})})});
  assert.ok(codes(report).includes('CANONICAL_MISMATCH'));
});
test('admin page must remain noindex',async()=>{
  const report=await auditSite({origin,fetchImpl:fixture({'/admin':page('/admin')})});
  assert.ok(codes(report).includes('PRIVATE_PAGE_INDEXABLE'));
});
test('unavailable sitemap and robots are separately detected',async()=>{
  const report=await auditSite({origin,fetchImpl:fixture({'/sitemap.xml':undefined,'/robots.txt':undefined})});
  assert.ok(codes(report).includes('SITEMAP_UNAVAILABLE'));
  assert.ok(codes(report).includes('ROBOTS_UNAVAILABLE'));
});
test('refuses non-HTTPS and path-based targets',async()=>{
  await assert.rejects(auditSite({origin:'http://example.com',fetchImpl:fixture()}));
  await assert.rejects(auditSite({origin:'https://example.com/private',fetchImpl:fixture()}));
});
