import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import path from 'node:path';
import { site } from '../data/site.js';
import config from '../seo/site.config.mjs';
import editorial from '../seo/editorial.config.mjs';

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
const escapeXML=escapeHTML;
// Editorial modules are displayed to visitors AND supplied to search engines.
// Never create hidden, keyword-only, crawler-only, or duplicate local-area pages.
const allowedLinks=new Set(Object.keys(config.pages));
const editorialMarkup=(route)=>{
  const block=editorial[route];if(!block)return '';
  if(typeof block.heading!=='string'||block.heading.length<12||block.heading.length>110)throw new Error('Invalid editorial heading: '+route);
  if(!Array.isArray(block.paragraphs)||block.paragraphs.length<1||block.paragraphs.length>4
     ||!block.paragraphs.every(p=>typeof p==='string'&&p.length>=60&&p.length<=850))
     throw new Error('Invalid page copy: '+route);
  if(!Array.isArray(block.links)||block.links.length>5||!block.links.every(l=>allowedLinks.has(l.href)&&l.href!==route&&typeof l.label==='string'&&l.label.length>=6&&l.label.length<=85))
     throw new Error('Invalid internal links: '+route);
  return '<section class="seo-editorial" aria-label="Further information">'+
    '<div class="seo-editorial-copy"><h2>'+escapeHTML(block.heading)+'</h2>'+
    block.paragraphs.map(p=>'<p>'+escapeHTML(p)+'</p>').join('')+'</div>'+
    '<nav aria-label="Related pages" class="seo-editorial-links">'+block.links.map(l=>'<a href="'+escapeHTML(l.href)+'">'+escapeHTML(l.label)+' <span aria-hidden="true">↗</span></a>').join('')+'</nav></section>';
};
const root = path.resolve('dist');
const originURL = new URL(config.origin);
if (originURL.protocol !== 'https:' || originURL.pathname !== '/' || originURL.search || originURL.hash || originURL.username || originURL.password) {
  throw new Error('SEO origin must be an HTTPS site origin without a path: ' + config.origin);
}
const origin=originURL.origin;
const routes=Object.entries(config.pages);
const indexable=routes.filter(([,page])=>config.indexingEnabled && page.index);
const absolute=pathname=>{
  if(typeof pathname!=='string'||!pathname.startsWith('/')||pathname.startsWith('//'))throw new Error('SEO URL must be an absolute site path: '+pathname);
  return origin+pathname;
};
if(!/^[A-Za-z0-9_-]*$/.test(config.googleVerification))throw new Error('Invalid Google site verification token.');
function structuredData(route,page) {
  const url=absolute(route==='/'?'/':route);
  const graph=[
    {'@type':'WebSite','@id':origin+'/#website',url:origin+'/',name:config.brand,inLanguage:config.language},
    {'@type':'WebPage','@id':url+'#webpage',url,name:page.title,description:page.description,inLanguage:config.language,isPartOf:{'@id':origin+'/#website'},primaryImageOfPage: {'@type':'ImageObject',url:absolute(page.image)}}
  ];
  // A minimal identity node: no invented reviews, awards, address, ages, or sameAs.
  if(route==='/'||route==='/about/'){
    graph.push({'@type':'Person','@id':origin+'/#person',name:'Witness Lema',url:origin+'/',image:absolute(config.pages['/about/'].image)});
    graph[1].about={'@id':origin+'/#person'};
  }
  if(route!=='/' && route!=='/404/'){
    graph.push({'@type':'BreadcrumbList','@id':url+'#breadcrumb',itemListElement:[
      {'@type':'ListItem',position:1,name:'Home',item:origin+'/'},
      {'@type':'ListItem',position:2,name:page.title.split('|')[0].trim(),item:url}
    ]});
  }
  return JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c');
}
for (const [route,page] of routes) {
  if(typeof page.title!=='string'||page.title.length<10||page.title.length>70||
     typeof page.description!=='string'||page.description.length<40||page.description.length>170)
    throw new Error('Invalid SEO title or description: '+route);
  if(!route.startsWith('/') || !route.endsWith('/') || !page.image.startsWith('/images/'))
    throw new Error('Invalid SEO route or image: '+route);
  const file=route==='/404/'?'404.html':route==='/'?'index.html':route.slice(1)+'index.html';
  const filename=path.join(root,file);
  let html=await readFile(filename,'utf8');
  html=html.replace(/<html lang="[^"]*">/i,'<html lang="'+escapeHTML(config.language)+'">');
  if(!html.includes('</head>'))throw new Error('Missing <head> in '+file);
  html=html.replace(/<title>[\s\S]*?<\/title>/i,'<title>'+escapeHTML(page.title)+'</title>');
  html=html.replace(/<meta name="description"[^>]*>/i,'<meta name="description" content="'+escapeHTML(page.description)+'">');
  html=html.replace(/<meta name="robots"[^>]*>/i,'');
  const url=absolute(route==='/'?'/':route);
  const robots=config.indexingEnabled&&page.index?'index, follow, max-image-preview:large':'noindex, nofollow';
  const meta=[
    '<meta name="robots" content="'+robots+'">',
    '<link rel="canonical" href="'+escapeHTML(url)+'">',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="'+escapeHTML(config.brand)+'">',
    '<meta property="og:locale" content="'+escapeHTML(config.locale)+'">',
    '<meta property="og:title" content="'+escapeHTML(page.title)+'">',
    '<meta property="og:description" content="'+escapeHTML(page.description)+'">',
    '<meta property="og:url" content="'+escapeHTML(url)+'">',
    '<meta property="og:image" content="'+escapeHTML(absolute(page.image))+'">',
    '<meta property="og:image:alt" content="Witness Lema portrait photograph">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="'+escapeHTML(page.title)+'">',
    '<meta name="twitter:description" content="'+escapeHTML(page.description)+'">',
    '<meta name="twitter:image" content="'+escapeHTML(absolute(page.image))+'">',
    config.adultRating && page.index ? '<meta name="rating" content="adult">' : '',
    route==='/' && config.googleVerification ? '<meta name="google-site-verification" content="'+escapeHTML(config.googleVerification)+'">' : '',
    '<script type="application/ld+json">'+structuredData(route,page)+'</script>'
  ].filter(Boolean).join('\n');
  if(route==='/'){
    const primary=site.images.find(image=>image.hero)?.src;
    if(primary && /^\/images\/[A-Za-z0-9_./-]+$/.test(primary)){
      html=html.replace('</head>','<link rel="preload" as="image" href="'+escapeHTML(primary)+'" fetchpriority="high"></head>');
    }
  }
  html=html.replace('</head>',meta+'</head>');
  // The editorial text is genuine visible HTML; it remains accessible without JS.
  if(editorial[route]) html=html.replace('</main>',editorialMarkup(route)+'</main>');
  await writeFile(filename,html);
}
const robots=config.indexingEnabled?[
 'User-agent: *',
 'Disallow: /admin',
 'Disallow: /api/',
 'Disallow: /_seo_templates/',
 'Disallow: /*?admin_preview=',
 'Sitemap: '+origin+'/sitemap.xml',
 'Sitemap: '+origin+'/image-sitemap.xml',
 ''
].join('\n'):'User-agent: *\nDisallow: /\n';
await writeFile(path.join(root,'robots.txt'),robots);
const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+
 indexable.map(([route])=>'  <url><loc>'+escapeXML(absolute(route))+'</loc></url>').join('\n')+
 '\n</urlset>\n';
await writeFile(path.join(root,'sitemap.xml'),sitemap);
const imageRows=[];
for (const route of ['/', '/about/', '/gallery/']) {
  if(!indexable.some(([p])=>p===route))continue;
  const pictures=route==='/gallery/'?site.images.map(x=>x.src):route==='/about/'?site.aboutImages:site.images.filter(x=>x.hero).map(x=>x.src);
  const urls=[...new Set(pictures)].filter(p=>typeof p==='string'&&p.startsWith('/')&&!p.startsWith('//'));
  imageRows.push('  <url><loc>'+escapeXML(absolute(route))+'</loc>'+urls.map(src=>'<image:image><image:loc>'+escapeXML(absolute(src))+'</image:loc></image:image>').join('')+'</url>');
}
await writeFile(path.join(root,'image-sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'+imageRows.join('\n')+'\n</urlset>\n');
const editableRoutes=['/','/about/','/gallery/','/services/','/contact/','/reviews/'];
const defaults=Object.fromEntries(editableRoutes.map(route=>[route,{
  title:config.pages[route].title,
  description:config.pages[route].description,
  image:config.pages[route].image,
  index:config.pages[route].index,
  heading:editorial[route].heading,
  paragraphs:editorial[route].paragraphs,
  links:editorial[route].links
}]));
await writeFile(path.join(root,'seo-defaults.json'),JSON.stringify({pages:defaults},null,2));
// Private-to-the-build template URLs. They have explicit noindex headers and
// are never linked in navigation or sitemaps. Middleware uses them as a safe
// fallback when the published SEO store is temporarily unavailable.
for(const route of editableRoutes){
  const folder=path.join(root,'_seo_templates',route==='/'?'home':route.slice(1,-1));
  await mkdir(folder,{recursive:true});
  await cp(path.join(root,route==='/'?'index.html':route.slice(1)+'index.html'),path.join(folder,'index.html'));
}
// Privacy remains private-to-the-SEO-editor and deliberately noindex.
// Reviews now uses the editable SEO template path above.
for(const route of ['/privacy/']){
  const folder=path.join(root,'_seo_templates',route.slice(1,-1));
  await mkdir(folder,{recursive:true});
  await cp(path.join(root,route.slice(1)+'index.html'),path.join(folder,'index.html'));
}
const templateDir=path.join(root,'_seo_templates');
await cp(path.join(root,'sitemap.xml'),path.join(templateDir,'sitemap.xml'));
await cp(path.join(root,'image-sitemap.xml'),path.join(templateDir,'image-sitemap.xml'));
console.log('SEO generated: '+indexable.length+' indexable pages; origin '+origin+'; indexing '+(config.indexingEnabled?'enabled':'disabled')+'.');
