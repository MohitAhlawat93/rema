// Vercel Routing Middleware: render published SEO values in the HTTP HTML,
// not as browser-only JavaScript. Only public, already-published Supabase rows
// are used. Preview remains noindex. Private drafts are NEVER fetched here.
import { SEO_ROUTES, CONTENT_ROUTES, cleanSEOPage, renderLivePage, xmlSitemap, imageSitemap } from './seo/live.mjs';
export const config={
 matcher:['/','/about/','/gallery/','/services/','/contact/','/reviews/','/privacy/','/sitemap.xml','/image-sitemap.xml']
};
const origin='https://rema-ruby.vercel.app';
const siteOrigin=()=>{
 const v=String(process.env.SEO_SITE_ORIGIN||origin).replace(/\/$/,'');
 return /^https:\/\/[a-z0-9.-]+(?::[0-9]{2,5})?$/i.test(v)?v:origin;
};
const active=()=>process.env.VERCEL_ENV==='production'&&process.env.SEO_INDEXING_ENABLED!=='false';
const cacheHeaders=type=>({'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff'});
async function getJson(url,headers={}){
 const r=await fetch(url,{headers,signal:AbortSignal.timeout(2600),cache:'no-store'});
 if(!r.ok)throw new Error('SEO data unavailable');
 return r.json();
}
const staticTemplate=(path,url)=>new URL('/_seo_templates/'+path,url).toString();
export default async function middleware(req){
 const pathname=new URL(req.url).pathname;
 const sitemap=pathname==='/sitemap.xml'||pathname==='/image-sitemap.xml';
 if(!CONTENT_ROUTES.includes(pathname)&&!sitemap)return new Response('Not found',{status:404});
 const fallback=sitemap?(pathname==='/sitemap.xml'?'sitemap.xml':'image-sitemap.xml'):
     (pathname==='/'?'home':pathname.slice(1,-1))+'/index.html';
 const baseURL=staticTemplate(fallback,req.url);
 // Always fetch an actual compiled HTML template. Supabase failures fail open
 // to static build content; the template remains indexable where appropriate.
 const templatePromise=fetch(baseURL,{signal:AbortSignal.timeout(3000)});
 const supa=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
 const key=String(process.env.SUPABASE_PUBLISHABLE_KEY||'');
 const dataPromise=supa&&key?getJson(supa+'/rest/v1/witness_lema_published_site?id=eq.main&select=payload,version&limit=1',
     {apikey:key,authorization:'Bearer '+key}).then(rows=>rows?.[0]?.payload||null).catch(()=>null):Promise.resolve(null);
 const defaultsPromise=getJson(new URL('/seo-defaults.json',req.url).toString()).catch(()=>null);
 const publicReviewsPromise=pathname==='/reviews/'&&supa&&key?
   getJson(supa+'/rest/v1/witness_lema_public_reviews?select=author,review_text,language&order=created_at.desc,id.desc&limit=100',
     {apikey:key,authorization:'Bearer '+key}).catch(()=>null):Promise.resolve(null);
 const [template,payload,defaults,publicReviews]=await Promise.all([templatePromise,dataPromise,defaultsPromise,publicReviewsPromise]);
 if(!template.ok)return new Response('Website temporarily unavailable',{status:503,headers:{'content-type':'text/plain','cache-control':'no-store'}});
 const raw=await template.text();
 if(!payload||!defaults?.pages){
   const h=new Headers(template.headers);h.set('cache-control','no-store');
   if(!active())h.set('x-robots-tag','noindex, nofollow');
   return new Response(req.method==='HEAD'?null:raw,{status:200,headers:h});
 }
 const pages={};
 for(const route of SEO_ROUTES){
   pages[route]=cleanSEOPage(payload.seo?.pages?.[route],route,defaults.pages[route],supa);
 }
 const canonical=siteOrigin(),production=active();
 if(sitemap){
   const xml=pathname==='/sitemap.xml'?xmlSitemap(pages,canonical,production):imageSitemap(pages,payload,canonical,supa,production);
   return new Response(req.method==='HEAD'?null:xml,{status:200,headers:cacheHeaders('application/xml; charset=utf-8')});
 }
 const publishedForPage=pathname==='/reviews/'&&Array.isArray(publicReviews)?
    {...payload,reviews:publicReviews.map(r=>({
      author:r.author,textEn:r.language==='en'?r.review_text:'',
      textHi:r.language==='hi'?r.review_text:'',published:true,consent:true
    }))}:payload;
 const html=renderLivePage(raw,pathname,pages[pathname]||null,publishedForPage,canonical,production,supa);
 const h=cacheHeaders('text/html; charset=utf-8');
 if(new URL(req.url).searchParams.get('admin_preview')==='1')h['x-robots-tag']='noindex, nofollow';
 if(!production||!SEO_ROUTES.includes(pathname)||!pages[pathname]?.index)h['x-robots-tag']='noindex, nofollow';
 return new Response(req.method==='HEAD'?null:html,{status:200,headers:h});
}
