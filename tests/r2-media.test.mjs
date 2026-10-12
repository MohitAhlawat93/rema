import test from 'node:test';
import assert from 'node:assert/strict';
import {parseImage,uploadR2Photo,getR2Photo,validMediaUrl} from '../lib/r2-media.js';

const jpeg=Buffer.concat([Buffer.from([0xff,0xd8,0xff,0xe0]),Buffer.alloc(100)]);
test('rejects invalid media and oversized image',()=>{
 assert.throws(()=>parseImage('data:image/jpeg;base64,'+Buffer.alloc(100).toString('base64')),/Invalid image/);
 assert.throws(()=>parseImage('data:text/html;base64,YQ=='),/Use JPEG/);
 assert.throws(()=>parseImage('x'.repeat(5000000)),/too large/i);
});
test('uploads a random-key JPEG and serves it from the same bound bucket',async()=>{
 const objects=new Map();
 const bucket={
  async put(key,value,options){objects.set(key,{value,options});},
  async get(key){const item=objects.get(key);return item?{
   body:item.value,httpMetadata:{contentType:item.options.httpMetadata.contentType}
  }:null;}
 };
 const file=jpeg.toString('base64');
 const saved=await uploadR2Photo(bucket,'data:image/jpeg;base64,'+file);
 assert.match(saved.path,/^r2:uploads\/[-a-f0-9]{36}\.jpg$/);
 assert.equal(validMediaUrl(saved.url),true);
 const response=await getR2Photo(bucket,new Request('https://example.com'+saved.url));
 assert.equal(response.status,200);
 assert.equal(response.headers.get('content-type'),'image/jpeg');
 assert.deepEqual(Buffer.from(await response.arrayBuffer()),jpeg);
 const head=await getR2Photo(bucket,new Request('https://example.com'+saved.url,{method:'HEAD'}));
 assert.equal(head.status,200);
 assert.equal(await head.text(),'');
 assert.equal((await getR2Photo(bucket,new Request('https://example.com/media/uploads/not-a-uuid.jpg'))).status,404);
 assert.equal((await getR2Photo(bucket,new Request('https://example.com'+saved.url,{method:'DELETE'}))).status,405);
});
test('missing storage binding fails closed',async()=>{
 const response=await getR2Photo(null,new Request('https://example.com/media/uploads/'+'00000000-0000-4000-8000-000000000000'+'.jpg'));
 assert.equal(response.status,503);
});
