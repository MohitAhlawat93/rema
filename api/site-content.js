import { getAdminSession } from '../lib/admin-auth.js';
import { callAdminBackend } from '../lib/admin-backend.js';

const send=(res,status,data,cache)=>{res.statusCode=status;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control',cache);res.end(JSON.stringify(data));};
export default async function handler(req,res){
  if(req.method!=='GET')return send(res,405,{error:'Use GET.'},'no-store');
  try{
    if(String(req.query?.preview||'')==='1'){
      if(!getAdminSession(req))return send(res,401,{error:'Owner sign-in required.'},'no-store');
      const state=await callAdminBackend('read');
      return send(res,200,{payload:state.draft,version:state.version,preview:true},'private, no-store');
    }
    const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
    const key=String(process.env.SUPABASE_PUBLISHABLE_KEY||'');
    const response=await fetch(url+'/rest/v1/witness_lema_published_site?id=eq.main&select=payload,version,updated_at',{
      headers:{apikey:key,authorization:'Bearer '+key},signal:AbortSignal.timeout(5000)
    });
    if(!response.ok)throw new Error('Published content is unavailable.');
    const row=(await response.json())[0];
    if(!row)throw new Error('Published content is unavailable.');
    return send(res,200,row,'public, s-maxage=60, stale-while-revalidate=300');
  }catch(error){return send(res,503,{error:error instanceof Error?error.message:'Content unavailable.'},'no-store');}
}
