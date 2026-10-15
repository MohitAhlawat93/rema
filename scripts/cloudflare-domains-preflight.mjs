/**
 * Cloudflare domain pre-launch guard. No credentials, writes, publishing or
 * Google indexing claims. Exit nonzero if a domain cannot be verified.
 * Current mode is intentionally prelaunch: every domain must stay noindex.
 */
import {pathToFileURL} from 'node:url';
export const TARGETS=[
 {name:'main temporary',url:'https://witnesslema.com',kind:'public-prelaunch'},
 {name:'www temporary',url:'https://www.witnesslema.com',kind:'public-prelaunch'},
 {name:'testing',url:'https://test.witnesslema.com',kind:'test'},
 {name:'production candidate',url:'https://lema-website-production.pages.dev',kind:'candidate'}
];
export async function probe(target,fetchImpl=fetch){
 const issues=[];
 let data=null;
 for(let attempt=0;attempt<3;attempt++){
  try{
   const response=await fetchImpl(target.url+'/',{redirect:'follow',signal:AbortSignal.timeout(12000)});
   const html=(await response.text()).slice(0,1500000);
   const robots=(html.match(/<meta\s+name=["']robots["'][^>]*>/i)||[])[0]||'';
   const tag=response.headers.get('x-robots-tag')||'';
   const canonical=(html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)/i)||[])[1]||'';
   data={http:response.status,noindex:/\bnoindex\b/i.test(tag+' '+robots),canonical,finalUrl:response.url};
   if(response.status!==200){issues.push('HTTP_'+response.status);}
   else if(!data.noindex){issues.push('INDEXING_NOT_BLOCKED');}
   if(target.kind==='candidate'&&response.status===200&&canonical!=='https://witnesslema.com/')
     issues.push('CANDIDATE_CANONICAL_NOT_READY');
   if(response.status===200)break;
  }catch(e){data={http:0,error:e?.name||'FetchError'};issues.push('FETCH_FAILED');}
  if(attempt<2){issues.length=0;await new Promise(ok=>setTimeout(ok,1500));}
 }
 return {name:target.name,url:target.url,kind:target.kind,...data,issues,pass:issues.length===0};
}
export async function checkDomains(fetchImpl=fetch){
 const checks=[];
 for(const target of TARGETS)checks.push(await probe(target,fetchImpl));
 return {checkedAt:new Date().toISOString(),mode:'prelaunch_noindex',pass:checks.every(x=>x.pass),checks};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=await checkDomains();
 console.log(JSON.stringify(report,null,2));
 if(!report.pass)process.exitCode=1;
}
