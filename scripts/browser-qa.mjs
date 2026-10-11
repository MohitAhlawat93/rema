import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {site} from '../data/site.js';
import {renderLivePage,cleanSEOPage} from '../seo/live.mjs';
const root=process.env.BROWSER_QA_SITE||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true});
const results=[];
async function run(name,fn){
  try{await fn();results.push(name);console.log('PASS '+name);}
  catch(error){console.error('FAIL '+name+': '+error.stack);throw error;}
}
try{
 for(const profile of [{name:'desktop',viewport:{width:1365,height:768}},{name:'mobile',viewport:{width:390,height:844},isMobile:true,hasTouch:true}]){
  const context=await browser.newContext({viewport:profile.viewport,isMobile:!!profile.isMobile,hasTouch:!!profile.hasTouch});
  await run(profile.name+' auto-opening chat is compact, dismissible and once per session',async()=>{
    const page=await context.newPage();
    await page.goto(root+'/');
    await page.locator('#assistant-panel').waitFor({state:'visible',timeout:10000});
    const bounds=await page.locator('#assistant-panel').boundingBox();
    assert.ok(bounds&&bounds.width<= (profile.isMobile?288:308),JSON.stringify(bounds));
    assert.ok(bounds.height<= (profile.isMobile?347:361),JSON.stringify(bounds));
    assert.ok(bounds.x>=0&&bounds.x+bounds.width<=profile.viewport.width+1,'chat must fit viewport');
    await page.click('#assistant-minimize');
    assert.equal(await page.locator('#assistant-panel').isHidden(),true);
    await page.goto(root+'/about/');
    await page.waitForTimeout(1800);
    assert.equal(await page.locator('#assistant-panel').isHidden(),true,'dismissed popup must not reopen');
    await page.click('#assistant-launch');
    assert.equal(await page.locator('#assistant-panel').isVisible(),true,'launcher must reopen popup');
    await page.close();
  });
  await context.close();
 }

 await run('Home and Gallery show full-width uncropped photos on phones',async()=>{
   for(const width of [320,390,600]){
     const context=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true});
     for(const route of ['/','/gallery/']){
       const page=await context.newPage();
       await page.goto(root+route,{waitUntil:'domcontentloaded'});
       await page.locator('.gallery-grid .gallery-tile img').first().waitFor({state:'attached'});
       const layout=await page.evaluate(async()=>{
         const grid=document.querySelector('.gallery-grid');
         const photos=[...grid.querySelectorAll('.gallery-tile img')].slice(0,2);
         await Promise.all(photos.map(img=>img.decode().catch(()=>{})));
         return {
           columns:getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length,
           overflow:document.documentElement.scrollWidth-window.innerWidth,
           photos:photos.map(img=>{
             const bounds=img.getBoundingClientRect();
             const container=grid.getBoundingClientRect();
             return {
               width:bounds.width,height:bounds.height,left:bounds.left,right:bounds.right,
               availableWidth:container.width,
               naturalRatio:img.naturalHeight/img.naturalWidth,
               fit:getComputedStyle(img).objectFit
             };
           })
         };
       });
       assert.equal(layout.columns,1,`${route} at ${width}px should have one photo column`);
       assert.ok(layout.overflow<=2,`${route} at ${width}px has horizontal overflow: ${layout.overflow}px`);
       assert.ok(layout.photos.length===2,'Expected at least two photographs');
       for(const photo of layout.photos){
         assert.ok(photo.width>=photo.availableWidth*.95,`Photo narrow at ${width}px: ${JSON.stringify(photo)}`);
         assert.ok(photo.left>=-2&&photo.right<=width+2,`Photo outside phone viewport at ${width}px`);
         assert.equal(photo.fit,'contain','Mobile image must not be cropped');
         assert.ok(Number.isFinite(photo.naturalRatio)&&photo.naturalRatio>0,'Image failed to load');
         assert.ok(Math.abs(photo.height/photo.width-photo.naturalRatio)<.045,
           `Photo aspect ratio differs from original at ${width}px: ${JSON.stringify(photo)}`);
       }
       await page.close();
     }
     await context.close();
   }
 });
 await run('automatic chat waits for Afterhours dialog then opens after closure',async()=>{
  const ctx=await browser.newContext({viewport:{width:1280,height:720}});
  const page=await ctx.newPage();
  await page.goto(root+'/');
  await page.click('#afterhours-launch');
  await page.waitForTimeout(1750);
  assert.equal(await page.locator('#assistant-panel').isHidden(),true);
  await page.click('#afterhours-close');
  await page.locator('#assistant-panel').waitFor({state:'visible',timeout:3000});
  await ctx.close();
 });
 await run('Reviews SEO is visible in page source, metadata and sitemap',async()=>{
  const context=await browser.newContext({viewport:{width:1300,height:850}});
  const page=await context.newPage();
  await page.goto(root+'/reviews/');
  assert.match(await page.title(),/Guest Reviews/);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://rema-ruby.vercel.app/reviews/');
  assert.match(await page.locator('meta[name="description"]').getAttribute('content'),/visitor-submitted reviews/);
  assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/index, follow/);
  assert.equal(await page.locator('.seo-editorial h2').count(),1);
  const xml=await page.evaluate(async()=>await (await fetch('/sitemap.xml')).text());
  assert.ok(xml.includes('https://rema-ruby.vercel.app/reviews/'));
  await context.close();
 });
 await run('WhatsApp contact link and enquiry message work on desktop',async()=>{
  const context=await browser.newContext({viewport:{width:1200,height:850}});
  await context.addInitScript(()=>{window.__whatsappOpened='';window.open=(url)=>{window.__whatsappOpened=url;return null;};});
  const page=await context.newPage();
  await page.goto(root+'/contact/');
  const direct=page.locator('[data-whatsapp-direct]');
  await direct.waitFor({state:'visible'});
  const href=await direct.getAttribute('href');
  assert.match(href,/^https:\/\/wa\.me\/\d{8,15}$/);
  await page.locator('#enquiry [name="name"]').fill('Browser QA');
  await page.locator('#enquiry [name="message"]').fill('Please send details of how to get in touch.');
  await page.locator('[data-whatsapp-send]').click();
  const opened=await page.evaluate(()=>window.__whatsappOpened);
  assert.equal(new URL(opened).hostname,'wa.me');
  assert.match(new URL(opened).searchParams.get('text'),/Browser QA/);
  assert.match(new URL(opened).searchParams.get('text'),/Please send details/);
  assert.match(await page.locator('#form-status').textContent(),/Nothing was sent automatically/);
  const manual=await page.locator('[data-whatsapp-manual]').getAttribute('href');
  assert.equal(manual,opened);
  await context.close();
 });
 await run('contact form offers fallback when no WhatsApp is configured',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await context.newPage();
  await page.route('**/api/site-content',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({payload:{contactLinks:[{label:'Instagram',url:'https://instagram.com/example'}],social:{whatsapp:''}}})}));
  await page.goto(root+'/contact/');
  assert.equal(await page.locator('[data-whatsapp-send]').isHidden(),true);
  assert.equal(await page.locator('[data-copy-enquiry]').isVisible(),true);
  await context.close();
 });
 await run('owner edits Reviews SEO, saves and publishes a simulated version',async()=>{
  const context=await browser.newContext({viewport:{width:1350,height:950}});
  const simulated={version:2,publishedVersion:1,history:[],draft:structuredClone(site)};
  let saveCount=0,publishCount=0;
  const page=await context.newPage();
  await page.route('**/api/admin/**',async route=>{
    const req=route.request(),path=new URL(req.url()).pathname,method=req.method();
    let body={};
    if(path.endsWith('/session'))body={authenticated:true,state:simulated};
    else if(path.endsWith('/knowledge'))body={items:[]};
    else if(path.endsWith('/ai-status'))body={configured:false};
    else if(path.endsWith('/review-inbox'))body={items:[]};
    else if(path.endsWith('/state')&&method==='PUT'){
      const request=req.postDataJSON();
      assert.equal(request.expectedVersion,simulated.version);
      simulated.draft=request.state;simulated.version++;saveCount++;body=simulated;
    }else if(path.endsWith('/state')&&method==='POST'){
      const request=req.postDataJSON();
      assert.equal(request.expectedVersion,simulated.version);
      simulated.published=structuredClone(simulated.draft);
      simulated.publishedVersion++;publishCount++;body=simulated;
    }else body={};
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  page.on('dialog',dialog=>dialog.accept());
  await page.goto(root+'/admin.html');
  await page.locator('[data-dashboard]').waitFor({state:'visible'});
  await page.locator('[data-tab="seo"]').click();
  await page.locator('[data-seo-page]').selectOption('/reviews/');
  const title='Guest experiences and Reviews | Witness Lema';
  await page.locator('[data-seo-field="title"]').fill(title);
  await page.locator('[data-panel="seo"] [data-save]').first().click();
  assert.equal(saveCount,1);
  assert.equal(simulated.draft.seo.pages['/reviews/'].title,title);
  await page.locator('[data-publish]').click();
  assert.equal(publishCount,1);
  assert.equal(simulated.published.seo.pages['/reviews/'].title,title);
  const html='<html><head><title>Old</title><meta name="description" content="old">'+
   '<meta name="robots" content="noindex"><meta property="og:title" content="old">'+
   '<meta property="og:description" content="old"><meta property="og:image" content="old">'+
   '<meta name="twitter:title" content="old"><meta name="twitter:description" content="old">'+
   '<meta name="twitter:image" content="old"></head><body><main></main></body></html>';
  const pageSEO=simulated.published.seo.pages['/reviews/'];
  const result=renderLivePage(html,'/reviews/',cleanSEOPage(pageSEO,'/reviews/',pageSEO),simulated.published,'https://rema-ruby.vercel.app',true);
  assert.match(result,/<title>Guest experiences and Reviews \| Witness Lema<\/title>/);
  assert.match(result,/index, follow/);
  await context.close();
 });
 console.log('Browser QA: '+results.length+' checks passed');
}finally{await browser.close();}
