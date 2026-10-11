const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const sha256=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
async function rpc(name:string,body:unknown){
  const response=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:SERVICE_KEY,authorization:'Bearer '+SERVICE_KEY,'content-type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||'Database request failed');
  return data;
}
Deno.serve(async(req)=>{
  if(req.method!=='POST')return json({error:'Use POST.'},405);
  try{
    const secret=req.headers.get('x-admin-secret')||'';
    if(secret.length<32)return json({error:'Unauthorized'},401);
    const allowed=await rpc('witness_lema_admin_auth',{candidate_sha256:await sha256(secret)});
    if(allowed!==true)return json({error:'Unauthorized'},401);
    const input=await req.json();
    const action=String(input?.action||'');
    if(action==='rate-limit'){
      const scope=String(input.body?.scope||'');
      const subjectHash=String(input.body?.subjectHash||'');
      const maxAttempts=Number(input.body?.maxAttempts);
      const windowSeconds=Number(input.body?.windowSeconds);
      return json(await rpc('witness_lema_consume_rate_limit',{p_scope:scope,p_subject_hash:subjectHash,p_max_attempts:maxAttempts,p_window_seconds:windowSeconds}));
    }
    if(action==='upload'){
      const match=String(input.dataUrl||'').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if(!match)return json({error:'Use a JPEG, PNG or WebP image.'},400);
      const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
      if(bytes.length>3*1024*1024)return json({error:'Image must be under 3 MB after optimisation.'},413);
      const ext={ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp' }[match[1]];
      const clean=String(input.name||'portrait').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'portrait';
      const path='uploads/'+new Date().toISOString().slice(0,10)+'/'+crypto.randomUUID()+'-'+clean+'.'+ext;
      const uploaded=await fetch(SUPABASE_URL+'/storage/v1/object/witness-lema-gallery/'+path,{method:'POST',headers:{apikey:SERVICE_KEY,authorization:'Bearer '+SERVICE_KEY,'content-type':match[1],'x-upsert':'false'},body:bytes});
      if(!uploaded.ok)throw new Error((await uploaded.json().catch(()=>null))?.message||'Upload failed');
      return json({path,url:SUPABASE_URL+'/storage/v1/object/public/witness-lema-gallery/'+path});
    }
    if(action==='remove-upload'){
      const path=String(input.path||'');
      if(!/^uploads\/[a-z0-9_./-]+$/i.test(path))return json({error:'Invalid photo path.'},400);
      const removed=await fetch(SUPABASE_URL+'/storage/v1/object/witness-lema-gallery/'+path,{method:'DELETE',headers:{apikey:SERVICE_KEY,authorization:'Bearer '+SERVICE_KEY}});
      if(!removed.ok)throw new Error('Could not remove photo');
      return json({ok:true});
    }
    if(action==='save'){
      const payload=input.body?.draft??input.body;
      if(!payload||typeof payload!=='object'||Array.isArray(payload))return json({error:'Invalid draft'},400);
      const validLink=(value)=>typeof value==='string'&&value.length<=2048&&(value===''||/^https:\/\/[^\s]+$/i.test(value));
      const safePath=(value)=>typeof value==='string'&&value.length<=300&&/^\/(?:[a-z0-9/_-]*|)$/i.test(value);
      const s=payload.services;
      if(!Array.isArray(s)||s.length>40||!s.every(x=>x&&typeof x.title==='string'&&x.title.trim()&&x.title.length<=200&&typeof x.text==='string'&&x.text.trim()&&x.text.length<=3000))return json({error:'Invalid service data'},400);
      if(!Array.isArray(payload.images)||payload.images.length>250||!payload.images.some(x=>x.hero)||!Array.isArray(payload.aboutImages)||payload.aboutImages.length!==3)return json({error:'Invalid photo selection'},400);
      if(!payload.images.every(x=>x&&typeof x.src==='string'&&x.src.length<=2048&&(x.src.startsWith('/images/')||x.src.startsWith(SUPABASE_URL+'/storage/v1/object/public/witness-lema-gallery/'))))return json({error:'Invalid image source'},400);
      if(!payload.aboutImages.every(src=>payload.images.some(x=>x.src===src)))return json({error:'About photos must exist in gallery'},400);
      if(!payload.social||!Object.values(payload.social).every(validLink))return json({error:'Invalid social link'},400);
      const editableLinks=(links:unknown)=>Array.isArray(links)&&links.length<=24&&links.every(link=>link&&typeof link==='object'&&typeof link.label==='string'&&link.label.trim().length>0&&link.label.length<=60&&validLink(link.url)&&link.url.length>0);
      if(payload.contactLinks!==undefined&&!editableLinks(payload.contactLinks))return json({error:'Invalid contact channels'},400);
      if(payload.afterhours!==undefined){
        const config=payload.afterhours;
        if(!config||typeof config!=='object'||typeof config.enabled!=='boolean'||typeof config.title!=='string'||!config.title.trim()||config.title.length>90||typeof config.intro!=='string'||config.intro.length>450||!editableLinks(config.links))return json({error:'Invalid Afterhours settings'},400);
      }
      if(payload.reviews!==undefined){
        if(!Array.isArray(payload.reviews)||payload.reviews.length>40||!payload.reviews.every(item=>item&&typeof item==='object'&&typeof item.author==='string'&&item.author.trim().length>0&&item.author.length<=90&&typeof item.textEn==='string'&&typeof item.textHi==='string'&&item.textEn.length<=1400&&item.textHi.length<=1400&&(item.textEn.trim()||item.textHi.trim())&&typeof item.consent==='boolean'&&typeof item.published==='boolean'&&(!item.published||item.consent)))return json({error:'Reviews need authentic text, approved names and publishing permission'},400);
      }
      if(!payload.assistant||typeof payload.assistant.name!=='string'||!payload.assistant.name.trim()||typeof payload.assistant.greeting!=='string'||!payload.assistant.greeting.trim())return json({error:'Invalid assistant settings'},400);
      // Owner-edited SEO must have a known public route and safe, truthful data.
      if(payload.seo!==undefined){
        const pages=payload.seo?.pages;
        const routes=new Set(['/','/about/','/gallery/','/services/','/contact/']);
        if(!pages||typeof pages!=='object'||Array.isArray(pages)||Object.keys(pages).length!==5)return json({error:'SEO must contain the five public pages.'},400);
        const allowedImage=(image)=>typeof image==='string'&&image.length<=2048&&(
          (/^\/images\/[a-z0-9_./-]+\.(?:jpe?g|png|webp)$/i.test(image)&&!image.includes('..'))||
          image.startsWith(SUPABASE_URL+'/storage/v1/object/public/witness-lema-gallery/')
        );
        for(const [route,page] of Object.entries(pages)){
          if(!routes.has(route)||!page||typeof page!=='object'||Array.isArray(page)||
            typeof page.title!=='string'||page.title.trim().length<10||page.title.length>70||
            typeof page.description!=='string'||page.description.trim().length<40||page.description.length>170||
            typeof page.heading!=='string'||page.heading.trim().length<12||page.heading.length>110||
            !allowedImage(page.image)||typeof page.index!=='boolean'||
            !Array.isArray(page.paragraphs)||page.paragraphs.length<1||page.paragraphs.length>4||
            !page.paragraphs.every((s)=>typeof s==='string'&&s.trim().length>=60&&s.length<=850)||
            !Array.isArray(page.links)||page.links.length<1||page.links.length>5||
            !page.links.every((l)=>l&&routes.has(l.href)&&l.href!==route&&typeof l.label==='string'&&l.label.trim().length>=4&&l.label.length<=85)
          )return json({error:'Invalid SEO information for '+route},400);
        }
      }
    }
    const allowedActions=new Set(['read','save','publish','restore','knowledge-read','knowledge-save']);
    if(!allowedActions.has(action))return json({error:'Unknown action.'},400);
    // Public admin routes wrap publish/restore/knowledge items in {body}; the SQL function needs the inner value.
    // Save intentionally keeps {draft, expectedVersion} for optimistic concurrency checks.
    const body = action==='save' ? (input.body??{}) : ((action==='publish'||action==='restore'||action==='knowledge-save') ? (input.body?.body??input.body??{}) : (input.body??{}));
    return json(await rpc('witness_lema_admin_state',{action,body}));
  }catch(error){return json({error:error instanceof Error?error.message:'Request failed'},500);}
});