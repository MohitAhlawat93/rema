import { reviewInbox } from '../lib/review-inbox.js';
import { consumeRateLimit } from '../lib/rate-limit.js';
const send=(res,status,data)=>{res.statusCode=status;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.setHeader('x-robots-tag','noindex, nofollow');res.end(JSON.stringify(data));};
const readBody=req=>typeof req.body==='string'?(()=>{try{return JSON.parse(req.body)}catch{return {}}})():req.body||{};
export default async function handler(req,res){
  if(req.method==='GET'){
    try{
      const url=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
      const key=String(process.env.SUPABASE_PUBLISHABLE_KEY||'');
      if(!url||!key)throw new Error('Reviews not configured');
      const result=await fetch(url+'/rest/v1/witness_lema_public_reviews?select=id,author,review_text,language,created_at&order=created_at.desc,id.desc&limit=100',{
        headers:{apikey:key,authorization:'Bearer '+key},signal:AbortSignal.timeout(6000),cache:'no-store'
      });
      if(!result.ok)throw new Error('Could not load reviews');
      const rows=await result.json();
      return send(res,200,{items:rows.map(r=>({
        id:r.id,author:r.author,textEn:r.language==='en'?r.review_text:'',
        textHi:r.language==='hi'?r.review_text:'',consent:true,published:true,
        createdAt:r.created_at
      }))});
    }catch{return send(res,503,{error:'Reviews are temporarily unavailable.'});}
  }
  if(req.method!=='POST')return send(res,405,{error:'Use GET or POST.'});
  const raw=readBody(req);
  // Honeypot: do not disclose which anti-spam signal was triggered.
  if(String(raw.website||'').trim())return send(res,200,{ok:true});
  const author=String(raw.author||'').trim(),text=String(raw.text||'').trim(),language=raw.language;
  if(author.length<2||author.length>90||text.length<20||text.length>1400||
    !['en','hi'].includes(language)||raw.consent!==true)
    return send(res,400,{error:'Enter a name, review of at least 20 characters, and permission to publish your own review.'});
  try{
    const limit=await consumeRateLimit(req,'review-submit',3,3600);
    if(!limit.allowed){
      res.setHeader('retry-after',String(limit.retryAfterSeconds||3600));
      return send(res,429,{error:'Too many reviews submitted. Please try again later.'});
    }
    const published=await reviewInbox('submit',{author,text,language,consent:true,source:'visitor'});
    if(published.ok!==true)throw new Error('Review could not be published');
    return send(res,201,{ok:true,message:'Review published.',id:published.id});
  }catch{return send(res,503,{error:'Unable to publish your review right now. Please try again later.'});}
}
