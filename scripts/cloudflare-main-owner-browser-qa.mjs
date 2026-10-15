import {chromium} from 'playwright';
const site='https://witnesslema.com';
const browser=await chromium.launch({headless:true});
const failures=[];
try{
 for(const width of [390,1366]){
  const ctx=await browser.newContext({viewport:{width,height:width<500?844:768},isMobile:width<500,hasTouch:width<500,reducedMotion:'no-preference'});
  for(const route of ['/','/about/','/gallery/','/contact/','/admin/']){
   const page=await ctx.newPage();
   try{
    const errors=[];page.on('pageerror',e=>errors.push(e.name));
    const r=await page.goto(site+route,{waitUntil:'domcontentloaded',timeout:22000});
    if(!r?.ok())throw Error('HTTP '+r?.status());
    await page.locator('body').waitFor({state:'visible',timeout:5000});
    const layout=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,title:document.title,images:[...document.images].filter(x=>x.getBoundingClientRect().top<innerHeight&&x.getBoundingClientRect().bottom>0).filter(x=>x.complete&&x.naturalWidth===0).map(x=>x.getAttribute('src')).slice(0,3)}));
    if(layout.scroll>layout.viewport+6)throw Error('Horizontal overflow '+(layout.scroll-layout.viewport)+' px');
    if(layout.images.length)throw Error('Broken visible image '+layout.images.join(','));
    if(route==='/admin/'){
      await page.locator('[data-login-form]').waitFor({state:'visible',timeout:7000});
      if(await page.locator('[data-dashboard]').isVisible())throw Error('Owner dashboard is exposed without login');
      if((await page.locator('[data-tab="overview"]').count())!==1)throw Error('Owner home missing');
      if((await page.locator('[data-tab="growth"]').count())!==0)throw Error('Growth Lab should be separate from owner navigation');
    }
    if(route==='/contact/'){
      const links=await page.locator('a[href^="https://wa.me/"],a[href^="https://api.whatsapp.com/"]').count();
      if(links===0)throw Error('WhatsApp contact link missing');
    }
    if(route==='/'){
      const hero=page.locator('.hero-background .hero-slide');
      if(await hero.count()>1){
       const old=await page.locator('.hero-background .hero-slide.active').first().getAttribute('src');
       await page.waitForFunction(previous=>{
        const active=document.querySelector('.hero-background .hero-slide.active');
        return active&&active.getAttribute('src')!==previous;
       },old,{timeout:11000,polling:250});
      }
    }
    if(errors.length)throw Error('Browser script error '+errors[0]);
    console.log('PASS main browser',width,route,layout.title.slice(0,70));
   }catch(e){failures.push({width,route,error:String(e.message||e).slice(0,190)});}
   finally{await page.close();}
  }
  await ctx.close();
 }
}finally{await browser.close();}
if(failures.length){for(const x of failures)console.error('FAIL',JSON.stringify(x));process.exitCode=1;}
else console.log('PASS main website browser check: mobile/desktop, contact, admin protection and photo rotation');
