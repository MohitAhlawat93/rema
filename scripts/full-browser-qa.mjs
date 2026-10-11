import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFile,mkdir} from 'node:fs/promises';
const base=process.env.QA_ORIGIN||'http://127.0.0.1:3000';
const pages=[
 {path:'/',name:'home'},{path:'/about/',name:'about'},
 {path:'/gallery/',name:'gallery'},{path:'/services/',name:'services'},
 {path:'/reviews/',name:'reviews'},{path:'/contact/',name:'contact'},
 {path:'/privacy/',name:'privacy'},{path:'/admin.html',name:'admin-login'},
 {path:'/nonexistent-test-page/',name:'not-found',status:404}
];
const profiles=[
 {name:'desktop',width:1366,height:768,slow:false},
 {name:'mobile',width:390,height:844,slow:false},
 {name:'slow-desktop',width:1366,height:768,slow:true},
 {name:'slow-mobile',width:390,height:844,slow:true}
];
const browser=await chromium.launch({headless:true});
const rows=[],failures=[];
const output='qa-output';
await mkdir(output,{recursive:true});
for(const profile of profiles){
 const context=await browser.newContext({
  viewport:{width:profile.width,height:profile.height},
  isMobile:profile.width<500,hasTouch:profile.width<500,
  reducedMotion:'reduce'
 });
 for(const pageInfo of pages){
  const page=await context.newPage();
  const jsErrors=[],resourceFailures=[];
  page.on('pageerror',error=>jsErrors.push(error.message));
  page.on('response',response=>{
    const url=response.url();
    // Missing local API endpoints are expected in the static QA server;
    // production uses Vercel functions and live smoke tests separately.
    if(response.status()>=400&&new URL(url).origin===new URL(base).origin
       &&!new URL(url).pathname.startsWith('/api/')&&url!==base+pageInfo.path)
      resourceFailures.push(response.status()+' '+new URL(url).pathname);
  });
  if(profile.slow){
   const cdp=await context.newCDPSession(page);
   await cdp.send('Network.enable');
   await cdp.send('Network.emulateNetworkConditions',{
     offline:false,latency:160,downloadThroughput:200000,
     uploadThroughput:75000,connectionType:'cellular3g'
   });
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  }
  const start=Date.now();
  let status=null,domMs=null,metrics={};
  try{
   const response=await page.goto(base+pageInfo.path,{waitUntil:'domcontentloaded',timeout:45000});
   status=response?.status()??null;domMs=Date.now()-start;
   await page.locator('body').waitFor({state:'visible',timeout:8000});
   await page.waitForTimeout(profile.slow?550:320);
   metrics=await page.evaluate(()=>{
     const doc=document.documentElement;
     const header=document.querySelector('h1');
     const images=[...document.images];
     const deadImages=images.filter(x=>x.getAttribute('src')&&x.complete&&x.naturalWidth===0).map(x=>x.src);
     const nav=document.querySelector('#navigation');
     const links=[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'));
     const perf=performance.getEntriesByType('resource');
     return {
       title:document.title,
       h1:header?.textContent?.trim().replace(/\s+/g,' ').slice(0,95)||'',
       viewportWidth:window.innerWidth,scrollWidth:doc.scrollWidth,
       overflowPx:Math.max(0,doc.scrollWidth-window.innerWidth),
       primaryNavigationLinks:nav?.querySelectorAll('a[href]').length??0,
       images:images.length,brokenImages:deadImages.length,
       brokenImageSources:deadImages.slice(0,5).map(x=>new URL(x,location.href).pathname),
       hasMain:!!document.querySelector('main'),
       internalLinks:links.filter(x=>x?.startsWith('/')&&!x.startsWith('//')).length,
       loadedResourceKB:Math.round(perf.reduce((a,x)=>a+(x.transferSize||0),0)/1024),
       robots:document.querySelector('meta[name="robots"]')?.content||''
     };
   });
   if(status!==(pageInfo.status??200))throw Error('Unexpected HTTP '+status);
   if(metrics.overflowPx>3)throw Error('Horizontal overflow of '+metrics.overflowPx+'px');
   if(pageInfo.name!=='admin-login'&&!metrics.hasMain)throw Error('Missing main landmark');
   if(!metrics.h1)throw Error('Missing H1 heading');
   if(jsErrors.length)throw Error('JavaScript errors: '+jsErrors.join('; '));
   if(resourceFailures.length)throw Error('Broken local resources: '+resourceFailures.join('; '));
   if(metrics.brokenImages)throw Error('Broken image files: '+metrics.brokenImageSources.join(', '));
   if(profile.name==='mobile'&&!['not-found','admin-login'].includes(pageInfo.name)){
      // Every page should retain a usable responsive nav.
      if(!await page.locator('.menu-toggle').count())throw Error('Mobile navigation toggle missing');
   }
   if(!profile.slow&&['home','services','reviews','contact','gallery'].includes(pageInfo.name)){
      await page.screenshot({path:output+'/'+profile.name+'-'+pageInfo.name+'.png',fullPage:true,timeout:18000});
   }
  }catch(error){
   failures.push(profile.name+' '+pageInfo.path+': '+error.message);
   console.error('DETAIL '+profile.name+' '+pageInfo.path+': '+(error.stack||error.message));
  }
  const row={profile:profile.name,route:pageInfo.path,status,domMs,...metrics,jsErrors,resourceFailures};
  rows.push(row);
  console.log((failures.some(x=>x.startsWith(profile.name+' '+pageInfo.path+':'))?'FAIL ':'PASS ')+
   profile.name+' '+pageInfo.path+' '+domMs+'ms, overflow='+metrics.overflowPx+
   ', images='+metrics.images+', KB='+metrics.loadedResourceKB);
  await page.close();
 }
 await context.close();
}
await browser.close();
const report=[
 '# Browser quality assurance — all pages',
 '',
 'Profiles: desktop 1366×768, mobile 390×844, slow desktop and slow mobile.',
 'Slow network emulates 160ms latency, 1.6 Mbps download, 0.6 Mbps upload and 4× CPU slowdown in Chromium.',
 'The results below are from a locally served production-style build. They are not field Core Web Vitals or measurements of a visitor’s real network.',
 '',
 '| Profile | Page | HTTP | DOM load (ms) | Horizontal overflow (px) | Images | Loaded transfer KB |',
 '|---|---|---:|---:|---:|---:|---:|',
 ...rows.map(x=>'| '+x.profile+' | '+x.route+' | '+x.status+' | '+x.domMs+
 ' | '+(x.overflowPx??'?')+' | '+(x.images??'?')+' | '+(x.loadedResourceKB??'?')+' |'),
 '',
 '## Failures',
 failures.length?failures.map(x=>'- '+x).join('\n'):'None in the tested matrix.',
 '',
 'Note: A passing local build does not prove logged-in administrative edits, external WhatsApp delivery, or live Google indexing.'
].join('\n');
await writeFile(output+'/qa-report.md',report);
await writeFile(output+'/qa-report.json',JSON.stringify({generatedAt:new Date().toISOString(),profiles,pages,rows,failures},null,2));
console.log('QA matrix: '+(rows.length-failures.length)+'/'+rows.length+' pages passed');
if(failures.length)process.exitCode=1;
