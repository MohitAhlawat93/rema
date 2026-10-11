import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
test('review page does not render fabricated example testimonials or disclaimers',async()=>{
 const [app,build]=await Promise.all([read('../public/app.js'),read('../scripts/build.mjs')]);
 assert.ok(!app.includes('Layout example · not a client review'));
 assert.ok(!build.includes('Example cards are clearly labelled'));
 assert.ok(build.includes('No reviews published yet.'));
 assert.ok(build.includes('aria-labelledby="reviews-heading" hidden'));
 assert.ok(build.includes("link('/reviews/','Reviews')"));
});
