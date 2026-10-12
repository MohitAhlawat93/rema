import test from 'node:test';
import assert from 'node:assert/strict';
import {injectGoogleVerification} from '../middleware.js';

test('Google HTML ownership token is injected into a homepage without rebuilding',()=>{
 const original='<html><head><title>Trial</title><meta name="robots" content="noindex, nofollow"></head><body>OK</body></html>';
 const output=injectGoogleVerification(original,'valid_ExampleToken-01');
 assert.match(output,/<meta name="google-site-verification" content="valid_ExampleToken-01">/);
 assert.match(output,/noindex, nofollow/);
 assert.equal(injectGoogleVerification(output,'valid_ExampleToken-02').match(/google-site-verification/g).length,1);
 assert.match(injectGoogleVerification(output,'valid_ExampleToken-02'),/valid_ExampleToken-02/);
});

test('Google verification rejects unsafe or absent tokens',()=>{
 const html='<html><head></head><body>OK</body></html>';
 for(const token of ['',null,'a','<script>alert(1)</script>','bad token','bad"content'])
   assert.equal(injectGoogleVerification(html,token),html);
});
