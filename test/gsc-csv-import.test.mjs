import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeGscCSV} from '../public/growth-lab/gsc-csv.js';
test('bounded Search Console import computes measured totals and opportunities',()=>{
 const x=analyzeGscCSV('\uFEFFQuery,Clicks,Impressions,CTR,Position\n"test, local",3,300,1%,10\nbrand name,40,100,40%,1\n');
 assert.equal(x.rows,2);
 assert.equal(x.totals.clicks,43);
 assert.equal(x.totals.impressions,400);
 assert.equal(x.opportunities.length,1);
 assert.equal(x.opportunities[0].label,'test, local');
 assert.equal(x.dimension,'query');
});
test('rejects unsupported data and invalid CSV, and never executes formulas',()=>{
 assert.throws(()=>analyzeGscCSV('Country,Clicks,Impressions\nX,2,20\n'),/Query or Page/);
 assert.throws(()=>analyzeGscCSV('Query,Clicks,Impressions\nX,33,20\n'),/No valid data/);
 const csv=analyzeGscCSV('Page,Clicks,Impressions\n"=CMD()",0,200\n');
 assert.equal(csv.opportunities[0].label,'=CMD()');
});
