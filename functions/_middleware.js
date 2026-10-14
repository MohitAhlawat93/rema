// Cloudflare Pages SEO route integration. Other paths are served normally.
// A narrow _routes.json keeps static assets off the Functions request allowance.
import renderPublishedSeo from '../middleware.js';
import { CONTENT_ROUTES } from '../seo/live.mjs';

export async function onRequest(context) {
  const {pathname} = new URL(context.request.url);
  if (pathname.startsWith('/api/')) return context.next();
  if (!CONTENT_ROUTES.includes(pathname) &&
      pathname !== '/sitemap.xml' && pathname !== '/image-sitemap.xml')
    return context.next();
  try {
    // Use the asset binding for templates to avoid recursive fetches to this Worker.
    const assetFetch = (url, options = {}) =>
      context.env.ASSETS.fetch(new Request(url, options));
    return await renderPublishedSeo(context.request,{
      env:context.env,assetFetch,hosting:'cloudflare'
    });
  } catch (error) {
    console.error('cloudflare_seo_error',error?.name || 'unknown');
    // Static fallback may have been built against another domain or with
    // indexable defaults. Fail closed for indexing on unexpected SEO errors.
    const fallback = await context.next();
    const headers = new Headers(fallback.headers);
    headers.set('x-robots-tag', 'noindex, nofollow');
    return new Response(fallback.body, {
      status: fallback.status, statusText: fallback.statusText, headers
    });
  }
}
