// Pure renderer used by Vercel Routing Middleware; no secret keys or DOM APIs.
// Only authenticated owner publishing can write the public source data.
// Every value is escaped or passed through explicit route/image allowlists.
export const SEO_ROUTES=['/','/about/','/gallery/','/services/','/contact/'];
export const SEO_NAMES={'/':'Home','/about/':'About','/gallery/':'Gallery','/services/':'Services','/contact/':'Contact'};
const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const xml=esc;
export function validImage(image,supabaseUrl=''){
 if(typeof image!=='string'||image.length>2048)return false;
 if(/^\/images\/[a-z0-9_./-]+\.(?:jpe?g|png|webp)$/i.test(image)&&!image.includes('..'))return true;
 return Boolean(supabaseUrl)&&image.startsWith(supabaseUrl.replace(/\/$/,'')+'/storage/v1/object/public/witness-lema-gallery/')&&/^https:\/\//.test(image)&&!/[<>"'\s]/.test(image);
}
export function cleanSEOPage(raw,route,template={},supabaseUrl=''){
 const value=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
 const title=typeof value.title==='string'&&value.title.trim().length>=10&&value.title.length<=70?value.title.trim():template.title;
 const description=typeof value.description==='string'&&value.description.trim().length>=40&&value.description.length<=170?value.description.trim():template.description;
 const image=validImage(value.image,supabaseUrl)?value.image:template.image;
 const heading=typeof value.heading==='string'&&value.heading.trim().length>=12&&value.heading.length<=110?value.heading.trim():template.heading;
 const paragraphs=Array.isArray(value.paragraphs)&&value.paragraphs.length>=1&&value.paragraphs.length<=4&&value.paragraphs.every(p=>typeof p==='string'&&p.trim().length>=60&&p.length<=850)?value.paragraphs:template.paragraphs;
 const links=Array.isArray(value.links)&&value.links.length<=5&&value.links.every(l=>l&&typeof l==='object'&&SEO_ROUTES.includes(l.href)&&l.href!==route&&typeof l.label==='string'&&l.label.length>=4&&l.label.length<=85)?value.links:template.links;
 const index=value.index===false?false:template.index!==false;
 return {title,description,image,heading,paragraphs,links,index};
}
function replaceTag(html,pattern,replacement){
 return pattern.test(html)?html.replace(pattern,replacement):html;
}
function seoEditorial(page){
 if(!page.heading||!Array.isArray(page.paragraphs)||!Array.isArray(page.links))return '';
 return '<section class="seo-editorial" aria-label="Further information"><div class="seo-editorial-copy"><h2>'+
   esc(page.heading)+'</h2>'+page.paragraphs.map(p=>'<p>'+esc(p)+'</p>').join('')+
   '</div><nav aria-label="Related pages" class="seo-editorial-links">'+
   page.links.map(l=>'<a href="'+esc(l.href)+'">'+esc(l.label)+' <span aria-hidden="true">↗</span></a>').join('')+
   '</nav></section>';
}
function imageUrl(image,origin){
 if(image.startsWith('https://'))return image;
 return origin+image;
}
function updateHead(html,page,route,origin,production){
 const url=origin+route, socialImage=imageUrl(page.image,origin);
 const tags=[
  [/<title>[\s\S]*?<\/title>/i,'<title>'+esc(page.title)+'</title>'],
  [/<meta name="description"[^>]*>/i,'<meta name="description" content="'+esc(page.description)+'">'],
  [/<meta name="robots"[^>]*>/i,'<meta name="robots" content="'+(production&&page.index?'index, follow, max-image-preview:large':'noindex, nofollow')+'">'],
  [/<meta property="og:title"[^>]*>/i,'<meta property="og:title" content="'+esc(page.title)+'">'],
  [/<meta property="og:description"[^>]*>/i,'<meta property="og:description" content="'+esc(page.description)+'">'],
  [/<meta property="og:image"[^>]*>/i,'<meta property="og:image" content="'+esc(socialImage)+'">'],
  [/<meta name="twitter:title"[^>]*>/i,'<meta name="twitter:title" content="'+esc(page.title)+'">'],
  [/<meta name="twitter:description"[^>]*>/i,'<meta name="twitter:description" content="'+esc(page.description)+'">'],
  [/<meta name="twitter:image"[^>]*>/i,'<meta name="twitter:image" content="'+esc(socialImage)+'">']
 ];
 for(const [pattern,replacement] of tags)html=replaceTag(html,pattern,replacement);
 // Schema descriptions must agree with the visible, canonical HTML.
 html=html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i,(match,json)=>{
  try{
   const data=JSON.parse(json);
   const node=data['@graph']?.find(n=>n['@type']==='WebPage');
   if(node){node.name=page.title;node.description=page.description;node.primaryImageOfPage={'@type':'ImageObject',url:socialImage};}
   return '<script type="application/ld+json">'+JSON.stringify(data).replace(/</g,'\\u003c')+'</script>';
  }catch{return match;}
 });
 if(!production)html=replaceTag(html,/<meta name="robots"[^>]*>/i,'<meta name="robots" content="noindex, nofollow">');
 return html;
}
const serviceMarkup=(service,i)=>{
 if(!service||typeof service.title!=='string'||typeof service.text!=='string')return '';
 const src=typeof service.image==='string'&&service.image.startsWith('/')?service.image:'';
 return '<article class="service-card">'+(src?'<img src="'+esc(src)+'" alt="" width="900" height="1100" loading="lazy" decoding="async">':'')+
 '<div class="service-card-copy"><span class="index">'+esc(service.number||String(i+1).padStart(2,'0'))+'</span>'+
 '<h2>'+esc(service.title)+'</h2><p>'+esc(service.text)+'</p><span class="tag">'+esc(service.tag||'')+'</span></div></article>';
};
export function renderLivePage(html,route,page,published,origin,production=true){
 if(!SEO_ROUTES.includes(route)||!page)return html;
 html=updateHead(html,page,route,origin,production);
 const editorial=seoEditorial(page);
 if(editorial)html=replaceTag(html,/<section class="seo-editorial" aria-label="Further information">[\s\S]*?<\/section>/i,editorial);
 const site=published&&typeof published==='object'?published:{};
 // SEO-relevant primary content should agree with the published owner content,
 // even before client-side hydration. Do not generate entirely new pages.
 if(route==='/'&&site.hero){
  if(typeof site.hero.title==='string')html=html.replace(/(<div class="hero-copy">[\s\S]*?<h1>)[\s\S]*?(<\/h1>)/i,(_,head,tail)=>head+esc(site.hero.title).replaceAll('\n','<br>')+tail);
  if(typeof site.hero.intro==='string')html=html.replace(/(<div class="hero-copy">[\s\S]*?<p class="intro">)[\s\S]*?(<\/p>)/i,(_,head,tail)=>head+esc(site.hero.intro)+tail);
 }
 if(route==='/about/'&&site.about){
  if(typeof site.about.title==='string')html=html.replace(/(<section class="page-heading">[\s\S]*?<h1>)[\s\S]*?(<\/h1>)/i,(_,head,tail)=>head+esc(site.about.title).replaceAll('\n','<br>')+tail);
  if(typeof site.about.heading==='string')html=html.replace(/(<div class="editorial">[\s\S]*?<h2>)[\s\S]*?(<\/h2>)/i,(_,head,tail)=>head+esc(site.about.heading)+tail);
  if(typeof site.about.text==='string')html=html.replace(/(<div class="editorial">[\s\S]*?<p class="intro">)[\s\S]*?(<\/p>)/i,(_,head,tail)=>head+esc(site.about.text)+tail);
 }
 if(route==='/services/'){
  if(typeof site.servicesIntro==='string')html=html.replace(/(<section class="page-heading">[\s\S]*?<p class="intro">)[\s\S]*?(<\/p>)/i,(_,head,tail)=>head+esc(site.servicesIntro)+tail);
  if(Array.isArray(site.services)&&site.services.length<=40)html=replaceTag(html,/<section class="work-page service-grid">[\s\S]*?<\/section>/i,'<section class="work-page service-grid">'+site.services.map(serviceMarkup).join('')+'</section>');
 }
 return html;
}
export function xmlSitemap(pages,origin,production=true){
 const urls=SEO_ROUTES.filter(route=>production&&pages[route]?.index!==false).map(route=>'  <url><loc>'+xml(origin+route)+'</loc></url>');
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.join('\n')+'\n</urlset>\n';
}
export function imageSitemap(pages,published,origin,supabaseUrl='',production=true){
 const images=Array.isArray(published?.images)?published.images:[];
 const result=[];
 for(const route of ['/','/about/','/gallery/']){
  if(!production||pages[route]?.index===false)continue;
  const photos=route==='/gallery/'?images.map(x=>x.src):route==='/about/'?(published?.aboutImages||[]):images.filter(x=>x.hero).map(x=>x.src);
  const valid=[...new Set(photos)].filter(x=>validImage(x,supabaseUrl)).slice(0,250);
  result.push('  <url><loc>'+xml(origin+route)+'</loc>'+
    valid.map(src=>'<image:image><image:loc>'+xml(imageUrl(src,origin))+'</image:loc></image:image>').join('')+'</url>');
 }
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'+result.join('\n')+'\n</urlset>\n';
}
