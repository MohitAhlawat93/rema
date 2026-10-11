// Pure renderer used by Vercel Routing Middleware; no secret keys or DOM APIs.
// Only authenticated owner publishing can write the public source data.
// Every value is escaped or passed through explicit route/image allowlists.
export const SEO_ROUTES=['/','/about/','/gallery/','/services/','/contact/'];
export const CONTENT_ROUTES=[...SEO_ROUTES,'/reviews/','/privacy/'];
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
const safePublishedImage=(value,supabaseUrl)=>validImage(value,supabaseUrl)?value:'';
const safeExternalLink=value=>{
 if(typeof value!=='string'||value.length>2048)return '';
 try{const url=new URL(value);return url.protocol==='https:'&&url.username===''&&url.password===''?url.href:'';}catch{return '';}
};
const contactLinks=site=>{
 const input=Array.isArray(site.contactLinks)?site.contactLinks:
   Object.entries(site.social||{}).map(([label,url])=>({label,url}));
 return Array.isArray(input)?input.filter(item=>item&&typeof item.label==='string'&&item.label.trim().length&&item.label.length<=60&&safeExternalLink(item.url)).slice(0,24).map(item=>({label:item.label,url:safeExternalLink(item.url)})):[];
};
const linkMarkup=links=>links.map(item=>'<a href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">'+esc(item.label)+' <span aria-hidden="true">↗</span></a>').join('');
const galleryMarkup=(item,index,supabaseUrl)=>{
 if(!item||typeof item!=='object')return '';
 const src=safePublishedImage(item.src,supabaseUrl);if(!src)return '';
 const caption=typeof item.title==='string'?item.title:'Photograph';
 const alt=typeof item.alt==='string'?item.alt:'';
 const category=typeof item.category==='string'?item.category:'';
 return '<figure class="gallery-tile"><button class="photo" data-photo="'+index+'" aria-label="View '+esc(caption)+'"><img src="'+esc(src)+'" alt="'+esc(alt)+'" width="900" height="1100" loading="lazy" decoding="async"></button><figcaption><span>'+esc(caption)+'</span><span class="caption-kind">'+esc(category)+'</span></figcaption></figure>';
};
const reviewMarkup=item=>{
 if(!item||item.published!==true||item.consent!==true||typeof item.author!=='string'||item.author.length>90)return '';
 const en=typeof item.textEn==='string'&&item.textEn.length<=1400?item.textEn:'';
 const hi=typeof item.textHi==='string'&&item.textHi.length<=1400?item.textHi:'';
 if(!en&&!hi)return '';
 return '<article class="review-quote"><span class="review-language">Guest feedback · अतिथि के शब्द</span>'+
 (en?'<blockquote lang="en">'+esc(en)+'</blockquote>':'')+
 (hi?'<blockquote lang="hi">'+esc(hi)+'</blockquote>':'')+
 '<p>— '+esc(item.author)+'</p></article>';
};
const serviceMarkup=(service,i,supabaseUrl)=>{
 if(!service||typeof service.title!=='string'||typeof service.text!=='string')return '';
 const src=safePublishedImage(service.image,supabaseUrl);
 return '<article class="service-card">'+(src?'<img src="'+esc(src)+'" alt="" width="900" height="1100" loading="lazy" decoding="async">':'')+
 '<div class="service-card-copy"><span class="index">'+esc(service.number||String(i+1).padStart(2,'0'))+'</span>'+
 '<h2>'+esc(service.title)+'</h2><p>'+esc(service.text)+'</p><span class="tag">'+esc(service.tag||'')+'</span></div></article>';
};
export function renderLivePage(html,route,page,published,origin,production=true,supabaseUrl=''){
 if(!CONTENT_ROUTES.includes(route))return html;
 if(SEO_ROUTES.includes(route)&&page){
   html=updateHead(html,page,route,origin,production);
   const editorial=seoEditorial(page);
   if(editorial)html=replaceTag(html,/<section class="seo-editorial" aria-label="Further information">[\s\S]*?<\/section>/i,editorial);
 }
 const site=published&&typeof published==='object'?published:{};
 // Shared owner-managed controls are server-rendered on every public page
 // rather than depending on JavaScript hydration or a stale build artifact.
 if(Array.isArray(site.contactLinks)||site.social){
   const links=contactLinks(site);
   html=html.replace(/<div class="social-links">[\s\S]*?<\/div>/g,
     '<div class="social-links">'+linkMarkup(links)+'</div>');
   html=html.replace(/<div class="contact-social">[\s\S]*?<\/div>/g,
     '<div class="contact-social">'+linkMarkup(links)+'</div>');
 }
 if(site.afterhours&&typeof site.afterhours==='object'){
   const cfg=site.afterhours;
   if(cfg.enabled===false)html=html.replace('<button id="afterhours-launch"','<button hidden id="afterhours-launch"');
   if(typeof cfg.title==='string')html=html.replace(/<h2 id="afterhours-title">[\s\S]*?<\/h2>/,'<h2 id="afterhours-title">'+esc(cfg.title)+'</h2>');
   if(typeof cfg.intro==='string')html=html.replace(/<p id="afterhours-intro">[\s\S]*?<\/p>/,'<p id="afterhours-intro">'+esc(cfg.intro)+'</p>');
   if(Array.isArray(cfg.links)){
     const links=cfg.links.filter(v=>v&&typeof v.label==='string'&&v.label.length<=60&&safeExternalLink(v.url)).slice(0,24)
       .map(v=>({label:v.label,url:safeExternalLink(v.url)}));
     html=html.replace('<div class="afterhours-links" data-afterhours-links></div>',
       '<div class="afterhours-links" data-afterhours-links>'+linkMarkup(links)+'</div>');
   }
 }
 if(site.assistant&&typeof site.assistant==='object'){
   if(typeof site.assistant.name==='string'&&site.assistant.name.length<=80)
     html=html.replace(/(<div class="assistant-head"><div><strong>)[\s\S]*?(<\/strong>)/,(_,start,end)=>start+esc(site.assistant.name)+end);
   if(typeof site.assistant.greeting==='string'&&site.assistant.greeting.length<=500)
     html=html.replace(/(<div id="messages"[^>]*><p class="bubble">)[\s\S]*?(<\/p>)/,(_,start,end)=>start+esc(site.assistant.greeting)+end);
 }
 if(route==='/'&&site.hero){
  if(typeof site.hero.title==='string')html=html.replace(/(<div class="hero-copy">[\s\S]*?<h1>)[\s\S]*?(<\/h1>)/i,(_,head,tail)=>head+esc(site.hero.title).replaceAll('\n','<br>')+tail);
  if(typeof site.hero.intro==='string')html=html.replace(/(<div class="hero-copy">[\s\S]*?<p class="intro">)[\s\S]*?(<\/p>)/i,(_,head,tail)=>head+esc(site.hero.intro)+tail);
  if(typeof site.hero.eyebrow==='string')html=html.replace(/(<div class="hero-copy">[\s\S]*?<p class="eyebrow">)[\s\S]*?(<\/p>)/i,(_,head,tail)=>head+esc(site.hero.eyebrow)+tail);
 }
 if(route==='/'&&Array.isArray(site.images)){
  const heroes=site.images.filter(x=>x&&x.hero&&safePublishedImage(x.src,supabaseUrl)).slice(0,250);
  if(heroes.length){
   html=html.replace(/<div class="hero-background" aria-hidden="true">[\s\S]*?<\/div>/,
    '<div class="hero-background" aria-hidden="true">'+heroes.map((im,i)=>
     '<img src="'+esc(im.src)+'" alt="" width="900" height="1100" decoding="async" class="hero-slide '+(i?'':'active')+'" '+(i?'loading="lazy" fetchpriority="low"':'loading="eager" fetchpriority="high"')+'>').join('')+'</div>');
  }
 }
 if(route==='/about/'&&site.about){
  if(typeof site.about.title==='string')html=html.replace(/(<section class="page-heading">[\s\S]*?<h1>)[\s\S]*?(<\/h1>)/i,(_,head,tail)=>head+esc(site.about.title).replaceAll('\n','<br>')+tail);
  if(typeof site.about.heading==='string')html=html.replace(/(<div class="editorial">[\s\S]*?<h2>)[\s\S]*?(<\/h2>)/i,(_,head,tail)=>head+esc(site.about.heading)+tail);
  if(typeof site.about.text==='string')html=html.replace(/(<div class="editorial">[\s\S]*?<p class="intro">)[\s\S]*?(<\/p>)/i,(_,head,tail)=>head+esc(site.about.text)+tail);
 }
 if(route==='/about/'&&Array.isArray(site.aboutImages)){
  const imgs=site.aboutImages.filter(src=>safePublishedImage(src,supabaseUrl)).slice(0,3);
  if(imgs.length)html=html.replace(/<figure class="about-rotator"[^>]*>[\s\S]*?<\/figure>/,
    '<figure class="about-rotator" aria-label="Portrait slideshow">'+imgs.map((src,i)=>
      '<img class="about-slide '+(i?'':'active')+'" src="'+esc(src)+'" alt="Portrait of Lema" width="900" height="1100" decoding="async" aria-hidden="'+Boolean(i)+'">').join('')+'</figure>');
 }
 if(route==='/services/'){
  if(typeof site.servicesIntro==='string')html=html.replace(/(<section class="page-heading">[\s\S]*?<p class="intro">)[\s\S]*?(<\/p>)/i,(_,head,tail)=>head+esc(site.servicesIntro)+tail);
  if(Array.isArray(site.services)&&site.services.length<=40)
    html=html.replace(/<section class="work-page service-grid">[\s\S]*?<\/section>/i,
      '<section class="work-page service-grid">'+site.services.map((s,i)=>serviceMarkup(s,i,supabaseUrl)).join('')+'</section>');
 }
 if(route==='/gallery/'&&Array.isArray(site.images)){
  const pictures=site.images.slice(0,250);
  const categories=[...new Set(pictures.filter(x=>x&&typeof x.category==='string'&&x.category).map(x=>x.category))];
  html=html.replace(/<div class="gallery-grid full-gallery">[\s\S]*?<\/div>/i,
    '<div class="gallery-grid full-gallery">'+pictures.map((im,i)=>galleryMarkup(im,i,supabaseUrl)).join('')+'</div>');
  html=html.replace(/<div class="filters" role="group" aria-label="Filter gallery">[\s\S]*?<\/div>/i,
    '<div class="filters" role="group" aria-label="Filter gallery"><button class="active" data-filter="All" aria-pressed="true">All images</button>'+
    categories.map(c=>'<button data-filter="'+esc(c)+'" aria-pressed="false">'+esc(c)+'</button>').join('')+'</div>');
  html=html.replace(/(<p class="fine" data-gallery-status[^>]*>)[\s\S]*?(<\/p>)/i,(_,s,e)=>s+'Showing '+pictures.length+' images'+e);
 }
 if(route==='/reviews/'&&Array.isArray(site.reviews)){
  const reviews=site.reviews.slice(0,40).map(reviewMarkup).filter(Boolean);
  html=html.replace(/(<div class="review-grid" data-public-reviews>)[\s\S]*?(<\/div>)/i,
    (_,s,e)=>s+(reviews.length?reviews.join(''):'<p class="review-empty">No reviews published yet.</p>')+e);
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
