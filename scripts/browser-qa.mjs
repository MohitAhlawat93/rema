import assert from 'node:assert/strict';
import {chromium} from 'playwright';
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
 console.log('Browser QA: '+results.length+' checks passed');
}finally{await browser.close();}
