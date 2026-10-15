// Read-only checks against an actual Cloudflare Pages staging deployment.
// It never signs in, publishes changes, sends reviews or uploads media.
const origin=String(process.argv[2]||'').replace(/\/$/,'');
if(!/^https:\/\/[-a-z0-9.]+\.pages\.dev$/i.test(origin)) {
 console.error('Expected the temporary Cloudflare Pages https://*.pages.dev URL.');
 process.exit(2);
}
const expectedCanonical=process.env.EXPECTED_CANONICAL_ORIGIN||origin;
const paths=['/','/about/','/gallery/','/services/','/contact/','/reviews/','/privacy/',
 '/admin/','/api/site-content','/api/reviews','/api/admin/session','/sitemap.xml','/robots.txt',
 '/media/uploads/00000000-0000-4000-8000-000000000000.jpg'];
let failed=0;
for(const path of paths){
 try{
   const r=await fetch(origin+path,{signal:AbortSignal.timeout(10000),headers:{'user-agent':'lema-staging-smoke/1'}});
   const html=r.headers.get('content-type')||'';
   const noindex=r.headers.get('x-robots-tag')||'';
   const body=await r.text();
   let good=false;
   if(['/','/about/','/gallery/','/services/','/contact/','/reviews/','/privacy/'].includes(path)){
      const robots=(body.match(/<meta\s+name="robots"[^>]*>/i)||[])[0]||'';
      const canon=(body.match(/<link\s+rel="canonical"\s+href="([^"]+)"[^>]*>/i)||[])[1]||'';
      const expected=expectedCanonical+path;
      good=r.ok&&html.includes('text/html')&&/noindex/i.test(noindex+' '+robots)
        &&canon===expected&&!/vercel\.app/i.test(canon);
      if(!good)console.error('SEO diagnostic',path,{
        correctCanonical:canon===expected,noindex:/noindex/i.test(noindex+' '+robots),validHtml:html.includes('text/html')
      });
   }else if(path==='/admin/')good=r.ok&&body.includes('data-login')&&body.includes('data-staging-self-test');
   else if(path==='/api/site-content')good=r.ok&&body.includes('"payload"');
   else if(path==='/api/reviews')good=r.ok&&body.includes('"items"');
   else if(path==='/api/admin/session')good=[401,503].includes(r.status);
   else if(path==='/sitemap.xml')good=r.ok&&body.includes('<?xml')&&!/<loc>/i.test(body);
   else if(path==='/robots.txt')good=r.ok&&/Disallow:\s*\//.test(body);
   else if(path.startsWith('/media/uploads/'))good=r.status===404;
   console.log((good?'PASS ':'FAIL ')+r.status+' '+path);
   if(!good){
     // Log only safe API error categories, never content bodies or credentials.
     if(path.startsWith('/api/')){
       const error=JSON.parse(body||'{}')?.error;
       console.error('API diagnostic',path,typeof error==='string'?error.slice(0,120):'invalid response');
     }
     failed++;
   }
 }catch(e){console.error('FAIL '+path+' '+String(e?.name||e));failed++;}
}
if(failed){console.error('Cloudflare staging smoke checks failed:',failed);process.exit(1);}
console.log('Cloudflare staging read-only smoke checks passed. Admin write, AI provider and R2 upload need authenticated end-to-end checks.');
