// Tenant-scoped hybrid RAG. Only trusted server callers possessing the tenant
// credential may query or reindex; the browser never receives that credential.
// Requires pgvector tables/functions from the rag_* SQL migrations.
const url = Deno.env.get('SUPABASE_URL') || '';
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const modelName = 'gte-small-v1';
const session = new Supabase.ai.Session('gte-small');
const headers = { apikey: serviceKey, authorization: 'Bearer '+serviceKey, 'content-type': 'application/json' };
const reply = (value: unknown, status=200) => new Response(JSON.stringify(value), {status, headers:{
  'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'x-content-type-options':'nosniff'
}});
const sha256 = async (value:string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))))
  .map(v=>v.toString(16).padStart(2,'0')).join('');
async function rpc<T>(fn:string,body:unknown):Promise<T>{
 const r=await fetch(url+'/rest/v1/rpc/'+fn,{method:'POST',headers,body:JSON.stringify(body),
   signal:AbortSignal.timeout(3800)});
 if(!r.ok)throw new Error('Database error: '+r.status);
 return await r.json() as T;
}
type Item={id:number;title:string;content:string;keywords:string[];content_hash:string};
const safeContent=(v:string)=>String(v||'').replace(/<[^>]+>/g,' ').slice(0,1700);
// Maintain vectors automatically for owner-published records. Never index drafts.
async function indexBatch(tenant:string,limit=12){
 const r=await fetch(url+'/rest/v1/rag_chunks?tenant_id=eq.'+encodeURIComponent(tenant)+
  '&published=eq.true&embedding=is.null&select=id,title,content,keywords,content_hash&limit='+(limit+1),{
   headers,signal:AbortSignal.timeout(3500)});
 if(!r.ok)throw new Error('Index load failed');
 const items=await r.json() as Item[];
 const batch=items.slice(0,limit);
 let indexed=0;
 for(const item of batch){
  try{
   const input=[item.title,...(item.keywords||[]).slice(0,16),safeContent(item.content)].join(' ').slice(0,1850);
   const embed=await session.run(input,{mean_pool:true,normalize:true});
   const values=Array.from(embed as ArrayLike<number>);
   if(values.length!==384||values.some(x=>!Number.isFinite(x)))continue;
   const update=await fetch(url+'/rest/v1/rag_chunks?id=eq.'+item.id+
     '&tenant_id=eq.'+encodeURIComponent(tenant)+
     '&content_hash=eq.'+encodeURIComponent(item.content_hash)+'&embedding=is.null',{
     method:'PATCH',headers:{...headers,Prefer:'return=minimal'},
     body:JSON.stringify({embedding:values,embedding_model:modelName,updated_at:new Date().toISOString()}),
     signal:AbortSignal.timeout(3200)
   });
   if(update.ok)indexed++;
  }catch{/* A partial batch remains pending and will be retried later. */}
 }
 return {indexed,attempted:batch.length,more:items.length>limit||indexed<batch.length};
}
Deno.serve(async req=>{
 if(req.method!=='POST')return reply({error:'POST required'},405);
 if(Number(req.headers.get('content-length')||0)>64000)return reply({error:'Payload too large'},413);
 let data:Record<string,unknown>;
 try{data=await req.json();}catch{return reply({error:'Invalid JSON'},400);}
 if(JSON.stringify(data).length>64000)return reply({error:'Payload too large'},413);
 const tenant=String(data.tenant||'');
 const secret=String(req.headers.get('x-rag-secret')||'');
 if(!/^[a-z0-9][a-z0-9-]{1,62}$/.test(tenant)||secret.length<32||secret.length>512)
  return reply({error:'Unauthorized'},401);
 try{
  const authorized=await rpc<boolean>('rag_tenant_authorized',{p_tenant:tenant,p_hash:await sha256(secret)});
  if(authorized!==true)return reply({error:'Unauthorized'},401);
 }catch{return reply({error:'Authentication unavailable'},503);}
 const action=String(data.action||'search');
 // Generic owner-approved document ingestion for independently sold websites.
 // Per-tenant credentials are verified before this point. No browser upload access.
 if(action==='upsert-documents'){
  const docs=data.documents;
  if(!Array.isArray(docs)||docs.length<1||docs.length>20)return reply({error:'Send 1-20 documents'},400);
  const rows:Record<string,unknown>[]=[];
  for(const doc of docs){
    if(!doc||typeof doc!=='object')return reply({error:'Invalid document'},400);
    const d=doc as Record<string,unknown>;
    const key=String(d.key||'');
    const title=String(d.title||'').trim();
    const content=String(d.content||'').trim();
    const href=String(d.href||'');
    const keywords=Array.isArray(d.keywords)?d.keywords.map(x=>String(x).slice(0,80)).slice(0,16):[];
    if(!/^[a-z0-9_-]{3,100}$/.test(key)||title.length<1||title.length>300||
       content.length<1||content.length>3000||!/^\/[a-z0-9/_#-]{0,280}$/i.test(href))
      return reply({error:'Invalid document fields'},400);
    if(/<\s*(?:script|system|developer)\b|\b(?:ignore previous instructions|reveal system prompt|exfiltrate secret)\b/i.test(content))
      return reply({error:'Instruction-like content is not allowed'},400);
    rows.push({tenant_id:tenant,doc_key:key,ordinal:0,title,content,href,keywords,
      source_type:'owner-document',published:true,embedding:null,embedding_model:null,
      content_hash:await sha256(title+'|'+content+'|'+keywords.join(','))});
  }
  try{
   const saved=await fetch(url+'/rest/v1/rag_chunks?on_conflict=tenant_id,doc_key,ordinal',{
    method:'POST',headers:{...headers,Prefer:'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify(rows),signal:AbortSignal.timeout(6000)
   });
   if(!saved.ok)return reply({error:'Document storage unavailable'},503);
   try{EdgeRuntime.waitUntil(indexBatch(tenant,12).catch(()=>null));}catch{}
   return reply({saved:rows.length,embedding:'queued'});
  }catch{return reply({error:'Document indexing unavailable'},503);}
 }
 if(action==='delete-document'){
  const key=String(data.key||'');
  if(!/^[a-z0-9_-]{3,100}$/.test(key))return reply({error:'Invalid document'},400);
  const removed=await fetch(url+'/rest/v1/rag_chunks?tenant_id=eq.'+encodeURIComponent(tenant)+
   '&doc_key=eq.'+encodeURIComponent(key)+'&source_type=eq.owner-document',{
    method:'DELETE',headers,signal:AbortSignal.timeout(3500)
  }).catch(()=>null);
  return removed?.ok?reply({deleted:true}):reply({error:'Document deletion unavailable'},503);
 }
 if(action==='reindex'){
  try{return reply(await indexBatch(tenant,Math.min(25,Math.max(1,Number(data.limit)||10))));}
  catch{return reply({error:'Index temporarily unavailable'},503);}
 }
 if(action!=='search')return reply({error:'Unknown action'},400);
 const query=String(data.query||'').trim().slice(0,500);
 if(!query)return reply({error:'Empty query'},400);
 // Non-blocking index population. The lexical route works while embeddings
 // are generated, so site visitors never wait for the entire index.
 try{EdgeRuntime.waitUntil(indexBatch(tenant,12).catch(()=>null));}catch{/* local runtimes may omit waitUntil */}
 let embedding:number[]|null=null;
 try{
  // gte-small is English-centric. Hybrid lexical search remains available for
  // Hindi, Hinglish and other languages until a multilingual provider is enabled.
  const vector=await session.run(query,{mean_pool:true,normalize:true});
  const values=Array.from(vector as ArrayLike<number>);
  if(values.length===384&&values.every(Number.isFinite))embedding=values;
 }catch{/* Retrieval continues via full text without vector. */}
 try{
  const rows=await rpc<Array<Record<string,unknown>>>('rag_hybrid_match',{
   p_tenant:tenant,p_query:query,p_embedding:embedding,p_limit:6
  });
  return reply({rows:Array.isArray(rows)?rows:[],mode:embedding?'hybrid':'lexical',model:embedding?modelName:null});
 }catch{return reply({rows:[],mode:'unavailable'});}
});
