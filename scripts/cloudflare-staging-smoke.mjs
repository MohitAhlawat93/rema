// Read-only checks against an actual Cloudflare Pages staging deployment.
// It never signs in, publishes changes, sends reviews or uploads media.
const origin=String(process.argv[2]||'').replace(/\/$/,'');
if(!/^https:\/\/[-a-z0-9.]+\.pages\.dev$/i.test(origin)) {
 console.error('Expected the temporary Cloudflare Pages https://*.pages.dev URL.');
 process.exit(2);
}
const paths=['/','/about/','/gallery/','/services/','/contact/','/reviews/',
 '/api/site-content','/api/reviews','/api/admin/session','/sitemap.xml','/robots.txt'];
let failed=0;
for(const path of paths){
 try{
   const r=await fetch(origin+path,{signal:AbortSignal.timeout(10000),headers:{'user-agent':'lema-staging-smoke/1'}});
   const html=r.headers.get('content-type')||'';
   const noindex=r.headers.get('x-robots-tag')||'';
   const body=await r.text();
   let good=false;
   if(['/','/about/','/gallery/','/services/','/contact/','/reviews/'].includes(path)){
      good=r.ok&&html.includes('text/html')&&/noindex/i.test(noindex+' '+(body.match(/<meta\s+name="robots"[^>]*>/i)||[])[0]);
   }else if(path==='/api/site-content')good=r.ok&&body.includes('"payload"');
   else if(path==='/api/reviews')good=r.ok&&body.includes('"items"');
   else if(path==='/api/admin/session')good=[401,503].includes(r.status);
   else if(path==='/sitemap.xml')good=r.ok&&body.includes('<?xml');
   else if(path==='/robots.txt')good=r.ok&&/Disallow:\s*\//.test(body);
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
