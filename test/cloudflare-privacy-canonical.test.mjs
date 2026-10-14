import test from 'node:test';
import assert from 'node:assert/strict';
import {renderLivePage} from '../seo/live.mjs';

test('privacy page uses active Cloudflare canonical and stays noindex',()=>{
  const previous='https://rema-ruby.vercel.app';
  const active='https://lema-website-staging.pages.dev';
  const input='<html><head>'+
    '<link rel="canonical" href="'+previous+'/privacy/">'+
    '<meta property="og:url" content="'+previous+'/privacy/">'+
    '<meta name="robots" content="index, follow">'+
    '<script type="application/ld+json">{"@context":"https://schema.org","url":"'+previous+'/privacy/"}</script>'+
    '</head><body><h1>Privacy</h1></body></html>';
  const output=renderLivePage(input,'/privacy/',null,{},active,false);
  assert.ok(output.includes(active+'/privacy/'));
  assert.ok(!output.includes(previous));
  assert.match(output,/<meta name="robots" content="noindex, nofollow">/);
});
test('privacy URL replacement does not modify third-party links',()=>{
  const active='https://lema-website-staging.pages.dev';
  const html='<html><head><link rel="canonical" href="https://rema-ruby.vercel.app/privacy/">'+
    '<meta name="robots" content="noindex"></head><body>'+
    '<a href="https://privacy.example.org/policy">External policy</a></body></html>';
  const output=renderLivePage(html,'/privacy/',null,{},active,false);
  assert.match(output,/https:\/\/privacy\.example\.org\/policy/);
});
