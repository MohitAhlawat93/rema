// Strictly server-side tenant RAG gateway; do not accept tenant IDs from visitors.
const timeout = value=>AbortSignal.timeout(value);
export async function queryTenantRag(query,{action='search',limit=10,documents=[],key=''}={}){
 const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
 const tenant=String(process.env.RAG_TENANT_ID||'witness-lema');
 const credential=String(process.env.RAG_TENANT_SECRET||process.env.WITNESS_LEMA_INTERNAL_SECRET||'');
 if(!url||!credential||credential.length<32||!/^[a-z0-9][a-z0-9-]{1,62}$/.test(tenant))return null;
 const response=await fetch(url+'/functions/v1/tenant-hybrid-rag',{
  method:'POST',headers:{'content-type':'application/json','x-rag-secret':credential},
  body:JSON.stringify({tenant,action,query:String(query||'').slice(0,500),limit:Math.max(1,Math.min(25,limit)),
    ...(action==='upsert-documents'?{documents:documents.slice(0,20)}:{}),
    ...(action==='delete-document'?{key:String(key).slice(0,100)}:{})}),
  signal:timeout(action==='reindex'?24000:3000)
 });
 if(!response.ok)throw new Error('RAG_UNAVAILABLE');
 const data=await response.json();
 if(!data||typeof data!=='object')return null;
 if(action==='upsert-documents')return {saved:Math.max(0,Number(data.saved)||0)};
 if(action==='delete-document')return {deleted:data.deleted===true};
 if(action==='reindex')return {indexed:Math.max(0,Number(data.indexed)||0),more:Boolean(data.more),attempted:Math.max(0,Number(data.attempted)||0)};
 return {mode:data.mode==='hybrid'?'hybrid':'lexical',
  rows:Array.isArray(data.rows)?data.rows.slice(0,8)
   .filter(x=>x&&typeof x.question==='string'&&typeof x.answer==='string')
   .map(x=>({question:x.question.slice(0,300),answer:x.answer.slice(0,3000),
    href:/^\/(?:about|services|contact|gallery|reviews)?\/?$/.test(x.href||'')?x.href:'',
    keywords:Array.isArray(x.keywords)?x.keywords.slice(0,16):[],
    score:Number(x.score)||0,similarity:Number(x.similarity)||0,source_type:String(x.source_type||'faq').slice(0,40)})):[]
 };
}
