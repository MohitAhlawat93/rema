/**
 * Witness Lema staging SEO health monitor.
 * Cloudflare Worker, deliberately isolated from the website's request path.
 * No visitor identifiers, AI calls, paid search providers, or SEO claims.
 * The staging website must remain noindex until the owner domain is verified.
 */
const SITE='https://lema-website-staging.pages.dev';
const CONTENT=['/','/about/','/gallery/','/services/','/contact/','/reviews/'];
const ROUTES=[...CONTENT,'/privacy/','/admin','/robots.txt','/sitemap.xml'];
const RESPONSE_HEADERS={
  'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store',
  'x-robots-tag':'noindex, nofollow',
  'x-content-type-options':'nosniff'
};
const isNoindex=(body,headers)=>{
  const robots=String(headers.get('x-robots-tag')||'');
  const meta=[...body.matchAll(/<meta\b[^>]*>/gi)].find(x=>/\bname=["']robots["']/i.test(x[0]));
  return /\bnoindex\b/i.test(robots+' '+String(meta?.[0]||''));
};
async function check(path){
  const issues=[];
  try {
    const response=await fetch(SITE+path,{
      redirect:'manual',
      signal:AbortSignal.timeout(7000),
      headers:{'user-agent':'WitnessLemaStagingSearchHealth/1.0'}
    });
    const status=response.status;
    if(status!==200)issues.push('HTTP_'+status);
    const raw=status===200?await response.text():'';
    if(raw.length>500000)issues.push('RESPONSE_TOO_LARGE');
    const body=raw.slice(0,500000);
    const html=CONTENT.includes(path)||path==='/privacy/'||path==='/admin';
    if(html&&status===200){
      if(!isNoindex(body,response.headers))issues.push('STAGING_NOINDEX_MISSING');
      if(!/<title\b[^>]*>[^<]+<\/title>/i.test(body))issues.push('TITLE_MISSING');
      if(CONTENT.includes(path)){
        if(!/<meta\b[^>]*\bname=["']description["'][^>]*>/i.test(body))issues.push('DESCRIPTION_MISSING');
        if(!/<h1\b/i.test(body))issues.push('H1_MISSING');
      }
      const canonical=body.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/i)?.[0]||'';
      if(/vercel\.app/i.test(canonical))issues.push('OLD_VERCEL_CANONICAL');
    }
    if(path==='/sitemap.xml'&&status===200&&!/<(?:urlset|sitemapindex)\b/i.test(body))
      issues.push('SITEMAP_XML_INVALID');
    if(path==='/robots.txt'&&status===200&&!/User-agent:/i.test(body))
      issues.push('ROBOTS_FORMAT_UNEXPECTED');
    return {path,status,ok:issues.length===0,issues};
  } catch(e) {
    return {path,status:null,ok:false,issues:['FETCH_FAILED'],errorType:e?.name||'Error'};
  }
}
async function collect(){
  const checks=await Promise.all(ROUTES.map(path=>check(path)));
  const failing=checks.filter(x=>!x.ok);
  return {
    service:'witness-lema-staging-seo-health',
    source:'Cloudflare Pages staging',
    checkedAt:new Date().toISOString(),
    target:SITE,
    indexingExpected:false,
    googleIndexed:'unknown',
    searchConsoleConnected:'unverified',
    status:failing.length?'action_needed':'healthy',
    checked:checks.length,
    failures:failing.length,
    checks
  };
}
async function refresh(env){
  const report=await collect();
  await env.HEALTH_KV.put('latest',JSON.stringify(report));
  console.log(JSON.stringify({kind:'staging_seo_health',checked:report.checked,failures:report.failures,status:report.status}));
  return report;
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method!=='GET')return new Response('Method Not Allowed',{status:405,headers:RESPONSE_HEADERS});
    if(url.pathname!=='/'&&url.pathname!=='/status')return new Response('Not Found',{status:404,headers:RESPONSE_HEADERS});
    if(!env.HEALTH_KV)return Response.json({status:'unavailable',reason:'storage_not_configured'},{status:503,headers:RESPONSE_HEADERS});
    try{
      const stored=await env.HEALTH_KV.get('latest','json');
      const report=stored||await refresh(env);
      return Response.json(report,{headers:RESPONSE_HEADERS});
    }catch(e){
      console.error('health_report_unavailable',e?.name||'Error');
      return Response.json({status:'unavailable',reason:'health_check_failed'},{status:503,headers:RESPONSE_HEADERS});
    }
  },
  async scheduled(event,env,ctx){
    ctx.waitUntil(refresh(env).catch(e=>console.error('scheduled_health_failed',e?.name||'Error')));
  }
};