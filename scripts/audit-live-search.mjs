/**
 * Read-only launch audit of actual HTML responses, canonical URLs, sitemap and robots.
 * No credentials, AI calls, database writes or ranking claims.
 * Usage: node scripts/audit-live-search.mjs --origin=https://example.com [--expect-indexable]
 */
import { pathToFileURL } from 'node:url';

export const PUBLIC_ROUTES=['/','/about/','/gallery/','/services/','/contact/','/reviews/'];
const OTHER_ROUTES=['/privacy/','/admin'];
const MAX_BYTES=3_000_000;
const issue=(code,route,detail)=>({code,route,detail,severity:'error'});
function attr(tag,name){
  const matches=[...tag.matchAll(/([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)];
  return matches.find(m=>m[1].toLowerCase()===name)?.[2]||matches.find(m=>m[1].toLowerCase()===name)?.[3]||'';
}
function meta(html,name){
  for(const m of html.matchAll(/<meta\b[^>]*>/gi))
    if(attr(m[0],'name').toLowerCase()===name)return attr(m[0],'content');
  return '';
}
function canonical(html){
  for(const m of html.matchAll(/<link\b[^>]*>/gi))
    if(attr(m[0],'rel').toLowerCase().split(/\s+/).includes('canonical'))return attr(m[0],'href');
  return '';
}
const locations=xml=>new Set([...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m=>m[1].replaceAll('&amp;','&')));
async function probe(fetchImpl,url){
  try{
    const r=await fetchImpl(url,{redirect:'manual',signal:AbortSignal.timeout(7000)});
    if(Number(r.headers?.get('content-length')||0)>MAX_BYTES)return {status:r.status,error:'Response too large'};
    const body=await r.text();
    if(body.length>MAX_BYTES)return {status:r.status,error:'Response too large'};
    return {status:r.status,body,headers:r.headers};
  }catch(e){return {status:0,error:e instanceof Error?e.message:String(e)};}
}
export async function auditSite({origin,fetchImpl=fetch,expectIndexable=false}={}){
  if(typeof origin!=='string')throw Error('HTTPS origin is required');
  const u=new URL(origin);
  if(u.protocol!=='https:'||u.pathname!=='/'||u.search||u.hash||u.username||u.password||
     /^(localhost|127\.|0\.0\.0\.0$)/i.test(u.hostname))
    throw Error('Use the HTTPS origin of a public website, without a path');
  const base=u.origin;
  const routes=[...PUBLIC_ROUTES,...OTHER_ROUTES];
  const targets=[...routes,'/sitemap.xml','/robots.txt'];
  const pairs=await Promise.all(targets.map(async route=>[route,await probe(fetchImpl,base+route)]));
  const results=Object.fromEntries(pairs);
  const sitemap=results['/sitemap.xml'],robots=results['/robots.txt'];
  const indexedUrls=sitemap.status===200?locations(sitemap.body||''):new Set();
  const findings=[];
  for(const route of routes){
    const r=results[route];
    if(r.status!==200||r.error){
      findings.push(issue('PAGE_UNAVAILABLE',route,r.error||'HTTP '+r.status));
      continue;
    }
    const page=r.body;
    const publicPage=PUBLIC_ROUTES.includes(route);
    if(!/<title\b[^>]*>[^<]+<\/title>/i.test(page))
      findings.push(issue('MISSING_TITLE',route,'Initial response has no page title'));
    if(publicPage&&!meta(page,'description'))
      findings.push(issue('MISSING_DESCRIPTION',route,'Initial response has no description'));
    if(publicPage&&!/<h1\b/i.test(page))
      findings.push(issue('MISSING_H1',route,'Initial response has no heading'));
    const blocked=/\bnoindex\b/i.test(meta(page,'robots')+' '+(r.headers?.get('x-robots-tag')||''));
    if(!publicPage&&!blocked)
      findings.push(issue('PRIVATE_PAGE_INDEXABLE',route,'Admin/privacy must be noindex'));
    if(publicPage){
      const desired=base+route,actual=canonical(page);
      if(actual!==desired)
        findings.push(issue('CANONICAL_MISMATCH',route,'Expected '+desired+', got '+(actual||'(missing)')));
      if(blocked&&indexedUrls.has(desired))
        findings.push(issue('SITEMAP_NOINDEX_CONFLICT',route,'Noindex page is included in sitemap'));
      if(expectIndexable&&blocked)
        findings.push(issue('NOINDEX_ON_LAUNCH',route,'Public launch page is noindex'));
      if(expectIndexable&&!indexedUrls.has(desired))
        findings.push(issue('SITEMAP_PAGE_MISSING',route,'Launch page is missing from sitemap'));
    }
  }
  if(sitemap.status!==200||sitemap.error)
    findings.push(issue('SITEMAP_UNAVAILABLE','/sitemap.xml',sitemap.error||'HTTP '+sitemap.status));
  else if(!/<(?:urlset|sitemapindex)\b/i.test(sitemap.body))
    findings.push(issue('SITEMAP_INVALID','/sitemap.xml','Missing sitemap XML root'));
  if(robots.status!==200||robots.error)
    findings.push(issue('ROBOTS_UNAVAILABLE','/robots.txt',robots.error||'HTTP '+robots.status));
  else if(expectIndexable&&/^\s*Disallow:\s*\/\s*$/mi.test(robots.body))
    findings.push(issue('ROBOTS_BLOCK_ALL','/robots.txt','robots.txt blocks the entire site'));
  return {
    checkedAt:new Date().toISOString(),origin:base,expectIndexable,
    checkedRoutes:routes.length,errors:findings.length,pass:findings.length===0,
    searchConsoleVerified:false,googleIndexed:'unknown',findings
  };
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const origin=process.argv.find(s=>s.startsWith('--origin='))?.slice(9)||process.env.SEO_SITE_ORIGIN;
  if(!origin){console.error('Usage: node scripts/audit-live-search.mjs --origin=https://example.com [--expect-indexable]');process.exitCode=2;}
  else{
    try{
      const report=await auditSite({origin,expectIndexable:process.argv.includes('--expect-indexable')});
      console.log(JSON.stringify(report,null,2));
      if(!report.pass)process.exitCode=1;
    }catch(e){console.error(e.message);process.exitCode=2;}
  }
}
