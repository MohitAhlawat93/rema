/**
 * Safe read-only readiness status; no credentials, private records or false
 * Google ranking data. Only allowed on the test environment.
 */
const reply=(body,status=200)=>Response.json(body,{status,headers:{
 'cache-control':'public, max-age=60, s-maxage=90',
 'x-content-type-options':'nosniff',
 'x-robots-tag':'noindex, nofollow'
}});
export async function onRequestGet({request,env}){
 if(env.GROWTH_LAB_MODE!=='test')return reply({error:'Not available outside test environment'},404);
 const host=new URL(request.url).hostname;
 const productionHost='test.witnesslema.com';
 const isNoindex=(env.SEO_INDEXING_ENABLED!=='true');
 const validOrigin=(env.SEO_SITE_ORIGIN==='https://'+productionHost);
 const checks=[
  {id:'seo',ok:isNoindex&&validOrigin,note:isNoindex&&validOrigin
   ? 'Noindex is enabled; the test canonical is configured.'
   : 'Verify test indexing remains disabled and canonical origin is correct.'}
 ];
 let connected=false,content=false;
 const endpoint=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 if(/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(endpoint)&&key.length>20&&
    !endpoint.includes('yebbfjemvvtenpzrrhno')&&
    endpoint.includes('qyydipskdsfbcqgqnjoi')){
  try{
   const r=await fetch(endpoint+'/rest/v1/witness_lema_published_site?id=eq.main&select=id&limit=1',{
    headers:{apikey:key,authorization:'Bearer '+key},
    signal:AbortSignal.timeout(5500)
   });
   connected=r.ok;
   if(connected){const rows=await r.json();content=Array.isArray(rows)&&rows.some(row=>row.id==='main');}
  }catch{}
 }
 checks.push({id:'database',ok:connected,note:connected
  ? 'Independent trial Supabase responded. No production database was queried.'
  : 'Separate trial database could not be verified.'});
 checks.push({id:'published_content',ok:content,note:content
  ? 'Approved trial-site record is accessible from the test environment.'
  : 'Published trial content is unavailable.'});
 return reply({mode:'test',checkedAt:new Date().toISOString(),domain:productionHost,
  googleSearchConsole:{status:'not_connected',realImpressionsAvailable:false},
  geographicRanks:{status:'not_enabled',paidRequests:0},checks});
}
