import { callAdminBackend } from '../lib/admin-backend.js';
import { consumeRateLimit } from '../lib/rate-limit.js';
const send=(res,status,data)=>{res.statusCode=status;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');res.end(JSON.stringify(data));};
const privatePattern=/(?:\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|https?:\/\/|www\.|(?:\+?\d[\d()\s.-]{7,}\d)|@[a-z0-9_]{3,})/i;
export default async function handler(req,res){
  if(req.method!=='POST')return send(res,405,{error:'Use POST.'});
  const raw=typeof req.body==='string'?(()=>{try{return JSON.parse(req.body)}catch{return {}}})():req.body||{};
  if(raw.consent!==true)return send(res,400,{error:'Consent is required.'});
  const question=String(raw.question||'').trim(),language=['en','hi','auto'].includes(raw.language)?raw.language:'auto';
  if(question.length<12||question.length>300||privatePattern.test(question))return send(res,422,{error:'Only short questions without contact details may be shared.'});
  try{
    const limit=await consumeRateLimit(req,'chat-learning',5,3600);
    if(!limit.allowed)return send(res,429,{error:'Too many submitted questions.'});
    const result=await callAdminBackend('learning-submit',{body:{question,language,consent:true}});
    return send(res,200,result);
  }catch{return send(res,503,{error:'Question sharing is currently unavailable.'});}
}
