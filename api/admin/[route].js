import { runAutomaticSetupChecks } from '../../lib/setup-automation.js';
import { uploadR2Photo } from '../../lib/r2-media.js';
import { workersAiAnswer } from '../../lib/workers-ai-fallback.js';
import {allowedStagingSelfTest,runStagingSelfTest} from '../../lib/staging-self-test.js';
import { HANDOVER_STEPS, blankProgress, handoverIndicators, validateHandoverUpdate } from '../../lib/handover.js';
import {
  ADMIN_COOKIE_NAME, adminAuthConfigured, constantTimeTextEqual, createSessionToken,
  getAdminSession, makeExpiredSessionCookie, makeSessionCookie,
  parseCookies, verifyPasswordHash
} from '../../lib/admin-auth.js';
import { validateOwnerWriteOrigin } from '../../lib/admin-origin-guard.js';
import { callAdminBackend } from '../../lib/admin-backend.js';
import { reviewInbox } from '../../lib/review-inbox.js';
import { consumeRateLimit } from '../../lib/rate-limit.js';
import { queryTenantRag } from '../../lib/tenant-rag.js';
import assistantHandler from '../assistant.js';

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
      const limit=await consumeRateLimit(req,'login',5,900);
      if(!limit.allowed){res.setHeader('retry-after',String(limit.retryAfterSeconds));return send(res,429,{error:'Too many attempts. Try again later.'});}
      const body=readBody(req);
      const login=String(body.loginId||'').trim().slice(0,120),password=String(body.password||'').slice(0,256);
      const expected=String(process.env.SIGNATURE_ADMIN_LOGIN_ID||'').trim();
      if(!constantTimeTextEqual(login,expected)||!verifyPasswordHash(password,process.env.SIGNATURE_ADMIN_PASSWORD_HASH||''))return send(res,401,{error:'That owner ID or password is not correct.'});
      res.setHeader('set-cookie',makeSessionCookie(createSessionToken(expected),req));
      return send(res,200,{ok:true});
    }
    if(route==='logout'){
      if(req.method!=='POST')return send(res,405,{error:'Use POST.'});
      res.setHeader('set-cookie',makeExpiredSessionCookie(req));return send(res,200,{ok:true});
    }
    if(route==='session'){
      if(req.method!=='GET')return send(res,405,{error:'Use GET.'});
      if(!adminAuthConfigured())return send(res,503,{authenticated:false,configured:false});
      if(!parseCookies(req)[ADMIN_COOKIE_NAME]||!getAdminSession(req))return send(res,401,{authenticated:false,configured:true});
      const state=await callAdminBackend('read');
      return send(res,200,{authenticated:true,owner:{name:'witness_lema_',role:'Owner'},state});
    }
    if(!protectedRoute(req,res))return;
    if(route==='staging-self-test'){
      if(req.method!=='POST')return send(res,405,{error:'Use POST.'});
      if(!allowedStagingSelfTest(req))return send(res,404,{error:'Not available on this website.'});
      const result=await runStagingSelfTest(req);
      return send(res,200,result);
    }
    if(route==='assistant-evaluate'){
      if(req.method!=='POST')return send(res,405,{error:'Use POST.'});
      const input=readBody(req);
      const question=String(input.question||'').trim();
      if(!question||question.length>400)return send(res,400,{error:'Enter a question up to 400 characters.'});
      // The owner uses exactly the public answer path, with no privileged RAG bypass.
      let output=null,code=200;
      const clock=Date.now();
      const capture={statusCode:200,setHeader(){},end(v){code=this.statusCode;try{output=JSON.parse(v);}catch{output=null;}}};
      await assistantHandler({
        method:'POST',body:{question,language:'en',history:Array.isArray(input.history)?input.history.slice(-4):[]},
        headers:req.headers,socket:req.socket,cloudflareAI:req.cloudflareAI
      },capture);
      if(!output)return send(res,503,{error:'Assistant test did not complete.'});
      return send(res,code,{answer:output.answer||'',source:output.source||'unknown',
        intent:output.intent||'',topic:output.topic||'',rag:output.rag||'none',
        topMatch:output.topMatch||null,needsReview:Boolean(output.needsReview),
        elapsedMs:Date.now()-clock,error:output.error||''});
    }
    if(route==='ai-status'){
      if(req.method!=='GET')return send(res,405,{error:'Use GET.'});
      const groq=Boolean(process.env.GROQ_API_KEY),xai=Boolean(process.env.XAI_API_KEY),cf=Boolean(req.cloudflareAI?.run);
      return send(res,200,{configured:groq||xai||cf,provider:groq?'Groq':xai?'xAI Grok':cf?'Cloudflare Workers AI':'Not configured',
        model:groq?(process.env.GROQ_MODEL||'openai/gpt-oss-120b'):xai?(process.env.XAI_MODEL||'grok-4'):cf?'@cf/zai-org/glm-4.7-flash':''});
    }
    if(route==='ai-test'){
      if(req.method!=='POST')return send(res,405,{error:'Use POST.'});
      // Owner-initiated tiny inference proves credentials and the configured model actually work.
      const groq=Boolean(process.env.GROQ_API_KEY),xai=Boolean(process.env.XAI_API_KEY);
      if(!groq&&!xai){
        if(!req.cloudflareAI?.run)return send(res,200,{status:'missing',message:'No AI provider is configured for this website.'});
        const started=Date.now(),model='@cf/zai-org/glm-4.7-flash';
        try{
          const answer=await workersAiAnswer(req.cloudflareAI,
            'Answer the next general-knowledge question in one short English sentence.',
            'Why is the sky blue?',{maxTokens:120});
          return send(res,200,{status:answer?'ready':'failed',provider:'Cloudflare Workers AI',model,
            elapsedMs:Date.now()-started});
        }catch(error){
          return send(res,200,{status:error?.name==='TimeoutError'||error?.name==='AbortError'?'timeout':'failed',
            provider:'Cloudflare Workers AI',model,elapsedMs:Date.now()-started});
        }
      }
      const choice=String(process.env.ASSISTANT_AI_PROVIDER||'').toLowerCase();
      const provider=choice==='xai'&&xai?'xai':choice==='groq'&&groq?'groq':groq?'groq':'xai';
      const model=provider==='groq'?(process.env.GROQ_MODEL||'openai/gpt-oss-120b'):(process.env.XAI_MODEL||'grok-4');
      const started=Date.now();
      try{
        const r=await fetch(provider==='groq'?'https://api.groq.com/openai/v1/chat/completions':'https://api.x.ai/v1/responses',{
          method:'POST',
          signal:AbortSignal.timeout(5000),
          headers:{authorization:'Bearer '+(provider==='groq'?process.env.GROQ_API_KEY:process.env.XAI_API_KEY),'content-type':'application/json'},
          body:JSON.stringify(provider==='groq'?{
            model,messages:[{role:'user',content:'Reply only OK.'}],max_completion_tokens:20,temperature:0
          }:{model,store:false,max_output_tokens:20,input:'Reply only OK.'})
        });
        const body=await r.json().catch(()=>({}));
        const answer=provider==='groq'?body.choices?.[0]?.message?.content:
          body.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join(' ');
        return send(res,200,{status:r.ok&&Boolean(String(answer||'').trim())?'ready':'failed',provider,model,
          httpStatus:r.status,elapsedMs:Date.now()-started});
      }catch(error){return send(res,200,{status:error?.name==='TimeoutError'||error?.name==='AbortError'?'timeout':'failed',provider,model,
        elapsedMs:Date.now()-started});}
    }
    if(route==='rag-documents'){
      if(req.method==='PUT'){
        const body=readBody(req);
        if(!Array.isArray(body.documents)||body.documents.length<1||body.documents.length>20)
          return send(res,400,{error:'Supply 1 to 20 approved documents.'});
        if(JSON.stringify(body.documents).length>60000)return send(res,413,{error:'Documents are too large.'});
        const result=await queryTenantRag('',{action:'upsert-documents',documents:body.documents});
        return result?send(res,200,result):send(res,503,{error:'RAG is not configured.'});
      }
      if(req.method==='DELETE'){
        const key=String(readBody(req).key||'');
        if(!/^[a-z0-9_-]{3,100}$/.test(key))return send(res,400,{error:'Invalid document key.'});
        const result=await queryTenantRag('',{action:'delete-document',key});
        return result?send(res,200,result):send(res,503,{error:'RAG is not configured.'});
      }
      return send(res,405,{error:'Use PUT or DELETE.'});
    }
    if(route==='rag-index'){
      if(req.method!=='POST')return send(res,405,{error:'Use POST.'});
      const outcome=await queryTenantRag('',{action:'reindex',limit:12});
      if(!outcome)return send(res,503,{error:'RAG is not configured for this tenant.'});
      return send(res,200,outcome);
    }
    // Owner-only read-only checks; do not accept browser-supplied URLs or credentials.
    if(route==='setup-check'){
      if(req.method!=='GET')return send(res,405,{error:'Use GET.'});
      const report=await runAutomaticSetupChecks({workersAiAvailable:Boolean(req.cloudflareAI?.run)});
      return send(res,200,report);
    }
    // Private owner handover progress. A submitted task is NOT provider-verified.
    if(route==='handover'){
      if(req.method==='GET'){
        const saved=await callAdminBackend('handover-read');
        return send(res,200,{...saved,steps:HANDOVER_STEPS,indicators:handoverIndicators(process.env),
          message:'Progress is self-reported; external provider ownership and client consent have not been verified.'});
      }
      if(req.method==='PUT'){
        const update=readBody(req),failure=validateHandoverUpdate(update);
        if(failure)return send(res,400,{error:failure});
        return send(res,200,await callAdminBackend('handover-save',update));
      }
      return send(res,405,{error:'Use GET or PUT.'});
    }
    if(route==='handover-export'){
      if(req.method!=='GET')return send(res,405,{error:'Use GET.'});
      const [site,answers,reviews,handover]=await Promise.all([
        callAdminBackend('read'),callAdminBackend('knowledge-read'),reviewInbox('list'),callAdminBackend('handover-read')
      ]);
      const data={
        format:'lema-owner-content-export-v1',generatedAt:new Date().toISOString(),
        scope:'Authenticated owner content export. Not a full database backup, storage archive, source-code transfer or proof of provider ownership.',
        site:{draft:site.draft,published:site.published,version:site.version,publishedVersion:site.publishedVersion,
          history:site.history||[]},
        assistantKnowledge:answers.items||[],
        visitorReviews:reviews.items||[],
        handover:{saleModel:handover.saleModel,progress:handover.progress},
        mediaNotice:'Image URLs in site content must be downloaded and backed up separately. AI embeddings and provider configurations are not included.'
      };
      res.setHeader('content-disposition','attachment; filename="lema-owner-content-export.json"');
      return send(res,200,data);
    }
    if(route==='state'){
      if(req.method==='GET')return send(res,200,await callAdminBackend('read'));
      if(req.method==='PUT')return send(res,200,await callAdminBackend('save',{draft:readBody(req).state,expectedVersion:readBody(req).expectedVersion}));
      if(req.method==='POST'){
        const body=readBody(req),action=body.action;
        if(!['publish','restore'].includes(action))return send(res,400,{error:'Unknown state action.'});
        return send(res,200,await callAdminBackend(action,{body:action==='restore'?{version:Number(body.version)}:{expectedVersion:body.expectedVersion}}));
      }
      return send(res,405,{error:'Unsupported method.'});
    }
    if(route==='review-inbox'){
      if(req.method==='GET')return send(res,200,await reviewInbox('list'));
      if(req.method==='POST'){
        const body=readBody(req);
        if(body.action!=='add'||typeof body.author!=='string'||typeof body.text!=='string'||
           body.author.trim().length<2||body.author.trim().length>90||
           body.text.trim().length<20||body.text.trim().length>1400||
           !['en','hi'].includes(body.language)||body.consent!==true)
          return send(res,400,{error:'Add a reviewer-approved name, review of at least 20 characters, and consent.'});
        return send(res,201,await reviewInbox('submit',{
          author:body.author,text:body.text,language:body.language,consent:true,source:'owner'
        }));
      }
      if(req.method==='DELETE'){
        const id=Number(readBody(req).id);
        if(!Number.isSafeInteger(id)||id<1)return send(res,400,{error:'Invalid review ID.'});
        const deleted=await reviewInbox('delete',{id});
        return send(res,deleted.ok?200:404,deleted.ok?{ok:true}:{error:'Review not found.'});
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
        const body=readBody(req);
        if(req.cloudflareMediaBucket)return send(res,200,await uploadR2Photo(req.cloudflareMediaBucket,body.dataUrl));
        return send(res,200,await callAdminBackend('upload',{dataUrl:body.dataUrl,name:body.name}));
      }
      if(req.method==='DELETE'){
        const body=readBody(req);
        if(String(body.path||'').startsWith('r2:'))
          return send(res,409,{error:'Remove the image from your draft; deleting stored R2 files requires a separate safety check.'});
        return send(res,200,await callAdminBackend('remove-upload',{path:body.path}));
      }
      return send(res,405,{error:'Unsupported method.'});
    }
    return send(res,404,{error:'Unknown admin route.'});
  }catch(error){const status=[400,409,413].includes(error?.statusCode)?error.statusCode:500;return send(res,status,{error:status===500?'Request could not be completed. Please refresh and retry.':error.message});}
}
