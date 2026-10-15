import test from 'node:test';
import assert from 'node:assert/strict';
import middleware,{robotsForRequest,indexingAllowed} from '../middleware.js';
test('only the main approved host receives crawlable robots instructions',()=>{
 const env={SEO_INDEXING_ENABLED:'true',SEO_SITE_ORIGIN:'https://witnesslema.com'};
 const primary=robotsForRequest(env,'cloudflare','https://witnesslema.com/robots.txt');
 assert.match(primary,/Allow: \/\n/);
 assert.match(primary,/Sitemap: https:\/\/witnesslema.com\/sitemap.xml/);
 assert.doesNotMatch(primary,/Disallow: \/\n/);
 for(const url of [
  'https://www.witnesslema.com/robots.txt',
  'https://lema-website-staging.pages.dev/robots.txt',
  'https://test.witnesslema.com/robots.txt'
 ])assert.match(robotsForRequest(env,'cloudflare',url),/Disallow: \/\n/);
});
test('any indexing-disabled host keeps robots disallow',()=>{
 const env={SEO_INDEXING_ENABLED:'false',SEO_SITE_ORIGIN:'https://witnesslema.com'};
 assert.match(robotsForRequest(env,'cloudflare','https://witnesslema.com/robots.txt'),/Disallow: \/\n/);
});
test('robots middleware works without database or SEO defaults, with correct content-type',async()=>{
 const env={SEO_INDEXING_ENABLED:'true',SEO_SITE_ORIGIN:'https://witnesslema.com'};
 const response=await middleware(new Request('https://witnesslema.com/robots.txt'),{env,hosting:'cloudflare'});
 assert.equal(response.status,200);
 assert.match(response.headers.get('content-type'),/text\/plain/);
 assert.match(await response.text(),/Sitemap: https:\/\/witnesslema.com\/sitemap.xml/);
});
