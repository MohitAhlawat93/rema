const endpoint = () => `${String(process.env.SUPABASE_URL || '').replace(/\/$/,'')}/functions/v1/witness-lema-admin`;

export async function callAdminBackend(action, body = {}, timeoutMs = 12000) {
  const secret = String(process.env.WITNESS_LEMA_INTERNAL_SECRET || '');
  if (!process.env.SUPABASE_URL || secret.length < 32) throw new Error('Admin storage is not configured.');
  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-secret': secret },
    body: JSON.stringify({ action, body, ...body }),
    signal: AbortSignal.timeout(Math.max(1000,Math.min(12000,timeoutMs)))
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // Never surface internal RPC/SQL errors or credentials to the browser.
    if (data.error === 'Draft version conflict') {
      throw Object.assign(new Error('This draft changed in another tab. Copy your unsaved edits before refreshing.'), { statusCode: 409 });
    }
    if (response.status === 400 || response.status === 413) {
      const message = typeof data.error === 'string' && data.error.length < 180 &&
        /^(Invalid |SEO |Reviews need |About photos |Draft |Unknown review |Image |Every social )/.test(data.error)
        ? data.error : 'The draft has invalid or incomplete information.';
      throw Object.assign(new Error(message), { statusCode: response.status });
    }
    throw new Error('The website storage service is temporarily unavailable. Please retry.');
  }
  return data;
}
