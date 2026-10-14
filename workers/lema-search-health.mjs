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

const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
function humanReport(report){
  const stale=!Number.isFinite(Date.parse(report.checkedAt))||
    Date.now()-Date.parse(report.checkedAt)>36*3600*1000;
  const status=stale?'Results are outdated':report.status==='healthy'?'All checks passed':'Attention needed';
  const rows=Array.isArray(report.checks)?report.checks.map(r=>'<tr><td><code>'+
    escapeHTML(r.path)+'</code></td><td>'+escapeHTML(r.status??'Unavailable')+
    '</td><td class="'+(r.ok?'ok':'bad')+'">'+(r.ok?'PASS':'ISSUE')+
    '</td><td>'+escapeHTML((r.issues||[]).join(', ')||'—')+'</td></tr>').join(''):'';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<meta name="robots" content="noindex,nofollow">'+
    '<title>Witness Lema — Cloudflare staging health</title>'+
    '<style>body{font:16px system-ui,sans-serif;color:#e9eaf0;background:#121820;max-width:940px;margin:0 auto;padding:32px 18px}'+
    'h1{font-size:clamp(24px,4vw,40px);margin-bottom:8px}p{color:#bac7d4;line-height:1.6}'+
    '.panel{background:#1d2632;padding:20px;border:1px solid #364354;border-radius:16px;margin-top:22px}'+
    '.ok{color:#9ee9ae;font-weight:700}.bad{color:#ffb5a4;font-weight:700}'+
    'table{width:100%;border-collapse:collapse;text-align:left;font-size:14px}th,td{border-bottom:1px solid #364354;padding:12px 9px;vertical-align:top}'+
    'a{color:#b7d4ff}code{font-size:13px}small{color:#aebdcc}.scroll{overflow-x:auto}'+
    '</style></head><body><h1>Website health</h1>'+
    '<p>Cloudflare staging · Technical checks only, not Google ranking data</p>'+
    '<section class="panel"><h2 class="'+(report.status==='healthy'&&!stale?'ok':'bad')+'">'+
    escapeHTML(status)+'</h2><p>Last checked: '+escapeHTML(report.checkedAt)+
    ' · '+escapeHTML(report.checked)+' pages and resources checked · '+
    escapeHTML(report.failures)+' issues</p>'+
    '<p>Google indexing: Not enabled on staging. Search Console: Not yet verified for the final domain.</p></section>'+
    '<section class="panel"><h2>Checks by page</h2><div class="scroll"><table><thead><tr>'+
    '<th>Route</th><th>HTTP</th><th>Result</th><th>Findings</th></tr></thead><tbody>'+
    rows+'</tbody></table></div></section>'+
    '<p><small>Updates daily at 11:30 AM India time. Issues are not automatically corrected.'+
    ' <a href="/status">View machine-readable status</a></small></p></body></html>';
}

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method!=='GET')return new Response('Method Not Allowed',{status:405,headers:RESPONSE_HEADERS});
    if(!['/','/status','/dashboard'].includes(url.pathname))return new Response('Not Found',{status:404,headers:RESPONSE_HEADERS});
    if(!env.HEALTH_KV)return Response.json({status:'unavailable',reason:'storage_not_configured'},{status:503,headers:RESPONSE_HEADERS});
    try{
      const stored=await env.HEALTH_KV.get('latest','json');
      const report=stored||await refresh(env);
      if(url.pathname==='/dashboard')return new Response(humanReport(report),{headers:{...RESPONSE_HEADERS,'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"}});
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