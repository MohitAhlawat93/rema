// Bridge Pages' Fetch API to the existing Vercel-style API handlers.
// Keep privileged cookies, origin checks and Supabase calls in their existing handlers.
const MAX_JSON_BYTES = 512 * 1024;
export async function runLegacyHandler(context, handler, route = '') {
  const request = context.request;
  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers);
  headers.host = url.host;
  // Use a Cloudflare-supplied client IP when available; never trust visitor XFF.
  headers['x-forwarded-for'] = request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') || 'unknown';
  const maxBytes = url.pathname === '/api/admin/upload' ? 5 * 1024 * 1024 : MAX_JSON_BYTES;
  let body = {};
  if (!['GET', 'HEAD'].includes(request.method)) {
    if (Number(request.headers.get('content-length') || 0) > maxBytes)
      return Response.json({error:'Request is too large.'}, {status:413});
    const text = await request.text();
    if (new TextEncoder().encode(text).length > maxBytes)
      return Response.json({error:'Request is too large.'}, {status:413});
    try { body = text ? JSON.parse(text) : {}; }
    catch { return Response.json({error:'Invalid JSON.'}, {status:400}); }
  }
  const query = Object.fromEntries(url.searchParams);
  if (route) query.route = route;
  const req = {
    method: request.method, url: url.pathname + url.search,
    headers, query, body,
    socket: {remoteAddress:headers['x-forwarded-for']},
    cloudflareAI:context.env?.AI,
    cloudflareMediaBucket:context.env?.MEDIA_BUCKET,
    protocol:url.protocol
  };
  const responseHeaders = new Headers();
  let completed = false, payload = '';
  const res = {
    statusCode:200,
    setHeader(name, value) {responseHeaders.set(name, Array.isArray(value)?value.join(', '):String(value));},
    getHeader(name) {return responseHeaders.get(name);},
    end(data = '') {completed = true;payload = data;}
  };
  try {
    await handler(req,res);
    if (!completed) throw new Error('Handler did not complete');
    responseHeaders.set('x-content-type-options','nosniff');
    responseHeaders.set('referrer-policy','strict-origin-when-cross-origin');
    return new Response(request.method === 'HEAD' ? null : payload,
      {status:res.statusCode,headers:responseHeaders});
  } catch (error) {
    console.error('cloudflare_api_error', url.pathname, error?.name || 'unknown');
    return Response.json({error:'Service temporarily unavailable.'},
      {status:503,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
  }
}
