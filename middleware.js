// Vercel Routing Middleware: render published SEO values in the HTTP HTML,
// not as browser-only JavaScript. Only public, already-published Supabase rows
// are used. Preview remains noindex. Private drafts are NEVER fetched here.
import { SEO_ROUTES, CONTENT_ROUTES, cleanSEOPage, renderLivePage, xmlSitemap, imageSitemap } from './seo/live.mjs';
export const config={
 matcher:['/','/about/','/gallery/','/services/','/contact/','/reviews/','/privacy/','/sitemap.xml','/image-sitemap.xml']
};
const origin='https://rema-ruby.vercel.app';
const siteOrigin=(env=process.env)=>{
 const v=String(env.SEO_SITE_ORIGIN||origin).replace(/\/$/,'');
 return /^https:\/\/[a-z0-9.-]+(?::[0-9]{2,5})?$/i.test(v)?v:origin;
};
const active=(env=process.env,hosting='vercel')=>hosting==='cloudflare'
 ?env.SEO_INDEXING_ENABLED==='true'&&Boolean(env.SEO_SITE_ORIGIN)
 :env.VERCEL_ENV==='production'&&env.SEO_INDEXING_ENABLED!=='false';
// Google URL-prefix verification can be updated on the destination Cloudflare account
// without rebuilding or exposing a token to an admin visitor. A verification token is
// public by design, but strictly validated before it becomes HTML.
export function injectGoogleVerification(html,token){
 const value=String(token||'').trim();
 if(!/^[A-Za-z0-9_-]{8,256}$/.test(value))return html;
 const meta='<meta name="google-site-verification" content="'+value+'">';
 return /<meta\s+name=["']google-site-verification["'][^>]*>/i.test(html)?
   html.replace(/<meta\s+name=["']google-site-verification["'][^>]*>/i,meta):
   html.replace(/<\/head>/i,meta+'</head>');
}
const cacheHeaders=type=>({'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff'});
async function getJson(url,headers={}){
 const r=await fetch(url,{headers,signal:AbortSignal.timeout(2600),cache:'no-store'});
 if(!r.ok)throw new Error('SEO data unavailable');
 return r.json();
}
const staticTemplate=(path,url)=>new URL('/_seo_templates/'+path,url).toString();
export default async function middleware(req,{env=process.env,assetFetch=fetch,hosting='vercel'}={}){
 const pathname=new URL(req.url).pathname;
 const sitemap=pathname==='/sitemap.xml'||pathname==='/image-sitemap.xml';
 if(!CONTENT_ROUTES.includes(pathname)&&!sitemap)return new Response('Not found',{status:404});
 const fallback=sitemap?(pathname==='/sitemap.xml'?'sitemap.xml':'image-sitemap.xml'):
     (pathname==='/'?'home':pathname.slice(1,-1))+'/index.html';
 const baseURL=staticTemplate(fallback,req.url);
 // Always fetch an actual compiled HTML template. Supabase failures fail open
 // to static build content; the template remains indexable where appropriate.
 const templatePromise=assetFetch(baseURL,{signal:AbortSignal.timeout(3000)});
 const supa=String(env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=String(env.SUPABASE_PUBLISHABLE_KEY||'');
 const dataPromise=supa&&key?getJson(supa+'/rest/v1/witness_lema_published_site?id=eq.main&select=payload,version&limit=1',
     {apikey:key,authorization:'Bearer '+key}).then(rows=>rows?.[0]?.payload||null).catch(()=>null):Promise.resolve(null);
 const defaultsPromise=assetFetch(new URL('/seo-defaults.json',req.url).toString(),
  {signal:AbortSignal.timeout(2600)}).then(r=>{if(!r.ok)throw Error('Missing SEO defaults');return r.json();}).catch(()=>null);
 const publicReviewsPromise=pathname==='/reviews/'&&supa&&key?
   getJson(supa+'/rest/v1/witness_lema_public_reviews?select=author,review_text,language&order=created_at.desc,id.desc&limit=100',
     {apikey:key,authorization:'Bearer '+key}).catch(()=>null):Promise.resolve(null);
 const [template,payload,defaults,publicReviews]=await Promise.all([templatePromise,dataPromise,defaultsPromise,publicReviewsPromise]);
 if(!template.ok)return new Response('Website temporarily unavailable',{status:503,headers:{'content-type':'text/plain','cache-control':'no-store'}});
 const raw=await template.text();
 if(!payload||!defaults?.pages){
   const h=new Headers(template.headers);h.set('cache-control','no-store');
   if(!active(env,hosting))h.set('x-robots-tag','noindex, nofollow');
   const verifiedHtml=pathname==='/'?injectGoogleVerification(raw,env.GOOGLE_SITE_VERIFICATION):raw;
   return new Response(req.method==='HEAD'?null:verifiedHtml,{status:200,headers:h});
 }
 const pages={};
 for(const route of SEO_ROUTES){
   pages[route]=cleanSEOPage(payload.seo?.pages?.[route],route,defaults.pages[route],supa);
 }
 const canonical=siteOrigin(env),production=active(env,hosting);
 if(sitemap){
   const xml=pathname==='/sitemap.xml'?xmlSitemap(pages,canonical,production):imageSitemap(pages,payload,canonical,supa,production);
   return new Response(req.method==='HEAD'?null:xml,{status:200,headers:cacheHeaders('application/xml; charset=utf-8')});
 }
 const publishedForPage=pathname==='/reviews/'&&Array.isArray(publicReviews)?
    {...payload,reviews:publicReviews.map(r=>({
      author:r.author,textEn:r.language==='en'?r.review_text:'',
      textHi:r.language==='hi'?r.review_text:'',published:true,consent:true
    }))}:payload;
 const pageHtml=renderLivePage(raw,pathname,pages[pathname]||null,publishedForPage,canonical,production,supa);
 const html=pathname==='/'?injectGoogleVerification(pageHtml,env.GOOGLE_SITE_VERIFICATION):pageHtml;
 const h=cacheHeaders('text/html; charset=utf-8');
 if(new URL(req.url).searchParams.get('admin_preview')==='1')h['x-robots-tag']='noindex, nofollow';
 if(!production||!pages[pathname]?.index)h['x-robots-tag']='noindex, nofollow';
 return new Response(req.method==='HEAD'?null:html,{status:200,headers:h});
}
