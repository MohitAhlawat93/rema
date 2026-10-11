import crypto from 'node:crypto';

// The Supabase RPC is callable only with a credential checked against the
// private owner's secret hash. That secret never reaches the browser.
export async function reviewInbox(action,payload={}){
  const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=String(process.env.SUPABASE_PUBLISHABLE_KEY||'');
  const secret=String(process.env.WITNESS_LEMA_INTERNAL_SECRET||'');
  if(!url||!key||secret.length<32)throw new Error('Review storage is not configured.');
  const response=await fetch(url+'/rest/v1/rpc/witness_lema_review_inbox',{
    method:'POST',signal:AbortSignal.timeout(9000),
    headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json'},
    body:JSON.stringify({p_secret_sha256:crypto.createHash('sha256').update(secret).digest('hex'),
      p_action:action,p_payload:payload})
  });
  if(!response.ok)throw new Error('Review storage unavailable.');
  return response.json();
}
