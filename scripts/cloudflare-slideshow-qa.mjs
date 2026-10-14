// Confirm live Cloudflare slides rotate after Supabase rehydrates published content.
// Runs from GitHub Actions with Playwright; no client credentials or writes needed.
import {chromium} from 'playwright';
const origin=(process.argv[2]||'').replace(/\/$/,'');
if(!/^https:\/\/[a-z0-9.-]+\.pages\.dev$/.test(origin))throw new Error('Expected a Cloudflare pages.dev staging URL');
const browser=await chromium.launch({headless:true});
const pages=[
  {path:'/',selector:'.hero-background .hero-slide',interval:6000},
  {path:'/about/',selector:'.about-rotator .about-slide',interval:4500}
];
let failure=0;
try{
  for(const viewport of [{width:1366,height:768},{width:390,height:844}]){
    const context=await browser.newContext({viewport,reducedMotion:'no-preference'});
    for(const test of pages){
      const page=await context.newPage();
      try{
        const published=page.waitForResponse(r=>r.url().includes('/api/site-content')&&r.status()===200,{timeout:15000});
        const response=await page.goto(origin+test.path,{waitUntil:'domcontentloaded',timeout:20000});
        if(!response?.ok())throw Error('Page unavailable');
        await published;
        await page.waitForFunction(selector=>document.querySelectorAll(selector).length>1,test.selector,{timeout:6000});
        const state=await page.locator(test.selector).evaluateAll(items=>{
          const active=items.find(el=>el.classList.contains('active'));
          return {count:items.length,src:active?.src||'',visible:!!active};
        });
        if(!state.visible)throw Error('No active slide');
        await page.waitForFunction(({selector,original})=>{
          const images=[...document.querySelectorAll(selector)];
          const current=images.find(el=>el.classList.contains('active'));
          return images.length>1&&current?.src!==original&&current?.complete&&current?.naturalWidth>0;
        },{selector:test.selector,original:state.src},{timeout:test.interval+4500,polling:150});
        console.log('PASS slideshow',viewport.width,test.path,'images:',state.count,'changed and loaded');
      }catch(e){
        failure++;
        console.error('FAIL slideshow',viewport.width,test.path,String(e?.message||e).slice(0,350));
      }finally{await page.close();}
    }
    await context.close();
  }
}finally{await browser.close();}
if(failure)process.exit(1);
console.log('PASS Cloudflare rotating photos on mobile and desktop');
