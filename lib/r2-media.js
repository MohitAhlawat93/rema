// R2 media functions. Operate only on the client's bound bucket.
// Public key names are random: no original filenames or user information in URLs.
import crypto from 'node:crypto';
const MAX_BYTES = 3 * 1024 * 1024;
const PREFIX = 'uploads/';
const formats = {
  'image/jpeg': {ext:'jpg',magic:b=>b.length>=4&&b[0]===0xff&&b[1]===0xd8&&b[2]===0xff},
  'image/png': {ext:'png',magic:b=>b.length>=8&&b[0]===0x89&&b[1]===0x50&&b[2]===0x4e&&b[3]===0x47},
  'image/webp': {ext:'webp',magic:b=>b.length>=12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'}
};
export function parseImage(dataUrl){
  if(typeof dataUrl!=='string'||dataUrl.length>MAX_BYTES*1.4+128)
    throw Object.assign(new Error('Image is too large after optimization.'),{statusCode:413});
  const match=/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl);
  if(!match)throw Object.assign(new Error('Use JPEG, PNG or WebP photographs.'),{statusCode:400});
  const bytes=Buffer.from(match[2],'base64'), format=formats[match[1]];
  if(bytes.length<32||bytes.length>MAX_BYTES||!format.magic(bytes))
    throw Object.assign(new Error('Invalid image or exceeds 3 MB after optimisation.'),{statusCode:400});
  return {bytes,type:match[1],ext:format.ext};
}
export async function uploadR2Photo(bucket,dataUrl){
  if(!bucket?.put)throw Object.assign(new Error('Photo storage not configured.'),{statusCode:503});
  const image=parseImage(dataUrl);
  const path=PREFIX+crypto.randomUUID()+'.'+image.ext;
  await bucket.put(path,image.bytes,{httpMetadata:{contentType:image.type,
    cacheControl:'public, max-age=31536000, immutable'}});
  return {path:'r2:'+path,url:'/media/'+path};
}
export function validMediaUrl(url){
  return typeof url==='string'&&/^\/media\/uploads\/[0-9a-f-]{36}\.(?:jpg|png|webp)$/.test(url);
}
export async function getR2Photo(bucket,request){
  if(!bucket?.get)return new Response('Media storage not configured',{status:503});
  const url=new URL(request.url),publicUrl=url.pathname;
  if(!validMediaUrl(publicUrl))return new Response('Not found',{status:404});
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
  const entry=await bucket.get(publicUrl.slice('/media/'.length));
  if(!entry)return new Response('Not found',{status:404});
  const headers=new Headers({
    'content-type':entry.httpMetadata?.contentType||'application/octet-stream',
    'cache-control':'public, max-age=31536000, immutable',
    'x-content-type-options':'nosniff','cross-origin-resource-policy':'same-origin'
  });
  return new Response(request.method==='HEAD'?null:entry.body,{status:200,headers});
}
