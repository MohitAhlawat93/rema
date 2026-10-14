// Every API keeps the exact same URL on Cloudflare as on Vercel.
import { runLegacyHandler } from '../../lib/cloudflare-http.js';
import assistant from '../../api/assistant.js';
import reviews from '../../api/reviews.js';
import siteContent from '../../api/site-content.js';
import admin from '../../api/admin/[route].js';

export async function onRequest(context) {
  const requestUrl = new URL(context.request.url);
  const pathname = requestUrl.pathname;
  if (pathname==='/api/staging-binding-check') {
    if(requestUrl.hostname!=='lema-website-staging.pages.dev' ||
       context.env?.SITE_STAGING_TEST_ENABLED!=='true' ||
       context.request.method!=='GET')
      return Response.json({error:'Not found.'},{status:404});
    return Response.json({
      staging:true,
      workersAI:Boolean(context.env?.AI?.run),
      photoStorage:Boolean(context.env?.MEDIA_BUCKET?.put&&context.env?.MEDIA_BUCKET?.get)
    },{headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
  }
  const handlers = {
    '/api/assistant':assistant,
    '/api/reviews':reviews,
    '/api/site-content':siteContent
  };
  const adminMatch = /^\/api\/admin\/([a-z0-9-]+)$/.exec(pathname);
  const handler = handlers[pathname] || (adminMatch ? admin : null);
  if (!handler) return Response.json({error:'Not found.'},{status:404});
  return runLegacyHandler(context,handler,adminMatch?.[1] || '');
}
