import {runLegacyHandler} from '../../lib/cloudflare-http.js';
import handler from '../../api/assistant.js';
export function onRequest(context){
  const url=new URL(context.request.url);
  if(url.searchParams.get('stage_check')==='1' &&
     url.hostname==='lema-website-staging.pages.dev' &&
     context.env?.SITE_STAGING_TEST_ENABLED==='true' &&
     context.request.method==='GET'){
    return Response.json({
      ai:Boolean(context.env?.AI?.run),
      r2:Boolean(context.env?.MEDIA_BUCKET?.put)
    },{headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
  }
  return runLegacyHandler(context,handler);
}
