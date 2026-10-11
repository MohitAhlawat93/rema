import {
  ADMIN_COOKIE_NAME, adminAuthConfigured, constantTimeTextEqual, createSessionToken,
  getAdminSession, getClientIp, makeExpiredSessionCookie, makeSessionCookie,
  parseCookies, verifyPasswordHash
} from '../../lib/admin-auth.js';
import { validateOwnerWriteOrigin } from '../../lib/admin-origin-guard.js';
import { callAdminBackend } from '../../lib/admin-backend.js';

const attempts = globalThis.__WL_ADMIN_ATTEMPTS__ || (globalThis.__WL_ADMIN_ATTEMPTS__ = new Map());
const readBody = req => typeof req.body === 'string' ? (()=>{try{return JSON.parse(req.body)}catch{return {}}})() : (req.body || {});
const send = (res,status,data) => { res.statusCode=status;res.setHeader('content-type','application/json; charset=utf-8');res.end(JSON.stringify(data)); };
const protectedRoute = (req,res) => {
  const session=getAdminSession(req);
  if(!session){send(res,401,{authenticated:false,error:'Your owner session has expired.'});return null;}
  return session;
};

export default async function handler(req,res){
  res.setHeader('cache-control','private, no-store, max-age=0');
  res.setHeader('x-robots-tag','noindex, nofollow, noarchive');
  const route=Array.isArray(req.query?.route)?req.query.route[0]:String(req.query?.route||'');
  const origin=validateOwnerWriteOrigin(req);
  if(!origin.allowed)return send(res,403,{error:origin.reason});
  try{
    if(route==='login'){
      if(req.method!=='POST')return send(res,405,{error:'Use POST.'});
      if(!adminAuthConfigured())return send(res,503,{error:'Owner access is not configured.'});
      const ip=getClientIp(req),now=Date.now(),old=attempts.get(ip);
      const bucket=!old||now>=old.resetAt?{count:0,resetAt:now+15*60*1000}:old;
      bucket.count+=1;attempts.set(ip,bucket);
      if(bucket.count>5){res.setHeader('retry-after',String(Math.ceil((bucket.resetAt-now)/1000)));return send(res,429,{error:'Too many attempts. Try again later.'});}
      const body=readBody(req);
      const login=String(body.loginId||'').trim().slice(0,120),password=String(body.password||'').slice(0,256);
      const expected=String(process.env.SIGNATURE_ADMIN_LOGIN_ID||'').trim();
      if(!constantTimeTextEqual(login,expected)||!verifyPasswordHash(password,process.env.SIGNATURE_ADMIN_PASSWORD_HASH||''))return send(res,401,{error:'That owner ID or password is not correct.'});
      attempts.delete(ip);res.setHeader('set-cookie',makeSessionCookie(createSessionToken(expected)));
      return send(res,200,{ok:true});
    }
    if(route==='logout'){
      if(req.method!=='POST')return send(res,405,{error:'Use POST.'});
      res.setHeader('set-cookie',makeExpiredSessionCookie());return send(res,200,{ok:true});
    }
    if(route==='session'){
      if(req.method!=='GET')return send(res,405,{error:'Use GET.'});
      if(!adminAuthConfigured())return send(res,503,{authenticated:false,configured:false});
      if(!parseCookies(req)[ADMIN_COOKIE_NAME]||!getAdminSession(req))return send(res,401,{authenticated:false,configured:true});
      const state=await callAdminBackend('read');
      return send(res,200,{authenticated:true,owner:{name:'witness_lema_',role:'Owner'},state});
    }
    if(!protectedRoute(req,res))return;
    if(route==='ai-status'){
      if(req.method!=='GET')return send(res,405,{error:'Use GET.'});
      const groq=Boolean(process.env.GROQ_API_KEY),xai=Boolean(process.env.XAI_API_KEY);
      return send(res,200,{configured:groq||xai,provider:groq?'Groq':'xAI Grok',model:process.env.AI_MODEL||(groq?'llama-3.3-70b-versatile':'grok-4.7')});
    }
    if(route==='state'){
      if(req.method==='GET')return send(res,200,await callAdminBackend('read'));
      if(req.method==='PUT')return send(res,200,await callAdminBackend('save',{body:readBody(req).state}));
      if(req.method==='POST'){
        const body=readBody(req),action=body.action;
        if(!['publish','restore'].includes(action))return send(res,400,{error:'Unknown state action.'});
        return send(res,200,await callAdminBackend(action,{body:action==='restore'?{version:Number(body.version)}:{}}));
      }
      return send(res,405,{error:'Unsupported method.'});
    }
    if(route==='knowledge'){
      if(req.method==='GET')return send(res,200,await callAdminBackend('knowledge-read'));
      if(req.method==='PUT')return send(res,200,await callAdminBackend('knowledge-save',{body:readBody(req).items}));
      return send(res,405,{error:'Unsupported method.'});
    }
    if(route==='upload'){
      if(req.method==='POST'){
        const body=readBody(req);return send(res,200,await callAdminBackend('upload',{dataUrl:body.dataUrl,name:body.name}));
      }
      if(req.method==='DELETE'){
        const body=readBody(req);return send(res,200,await callAdminBackend('remove-upload',{path:body.path}));
      }
      return send(res,405,{error:'Unsupported method.'});
    }
    return send(res,404,{error:'Unknown admin route.'});
  }catch(error){return send(res,500,{error:error instanceof Error?error.message:'Request failed.'});}
}
