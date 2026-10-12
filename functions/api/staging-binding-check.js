// Non-sensitive staging diagnostic; never disclose secrets or config values.
export function onRequestGet(context) {
  const u=new URL(context.request.url);
  if(u.hostname!=='lema-website-staging.pages.dev'||context.env?.SITE_STAGING_TEST_ENABLED!=='true')
    return Response.json({error:'Not found'},{status:404});
  return Response.json({
    workersAI:Boolean(context.env?.AI?.run),
    photoStorage:Boolean(context.env?.MEDIA_BUCKET?.get&&context.env?.MEDIA_BUCKET?.put),
    staging:true
  },{headers:{'cache-control':'no-store','x-robots-tag':'noindex, nofollow'}});
}
