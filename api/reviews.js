import { reviewInbox } from '../lib/review-inbox.js';
import { consumeRateLimit } from '../lib/rate-limit.js';
const send=(res,status,data)=>{res.statusCode=status;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.setHeader('x-robots-tag','noindex, nofollow');res.end(JSON.stringify(data));};
const readBody=req=>typeof req.body==='string'?(()=>{try{return JSON.parse(req.body)}catch{return {}}})():req.body||{};
export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Use POST.'});
  const raw=readBody(req);
  // Honeypot: do not disclose which anti-spam signal was triggered.
  if(String(raw.website||'').trim())return send(res,200,{ok:true});
  const author=String(raw.author||'').trim();
  const text=String(raw.text||'').trim();
  const language=raw.language;
  if(author.length<2||author.length>90||text.length<20||text.length>1400||
    !['en','hi'].includes(language)||raw.consent!==true)
    return send(res,400,{error:'Enter a display name, review of at least 20 characters, and publication permission.'});
  try{
    const limit=await consumeRateLimit(req,'review-submit',3,3600);
    if(!limit.allowed){
      res.setHeader('retry-after',String(limit.retryAfterSeconds||3600));
      return send(res,429,{error:'Too many reviews submitted. Please try again later.'});
    }
    await reviewInbox('submit',{author,text,language,consent:true});
    return send(res,202,{ok:true,message:'Review received for approval.'});
  }catch{return send(res,503,{error:'Unable to submit your review right now. Please try again later.'});}
}
