const endpoint = () => `${String(process.env.SUPABASE_URL || '').replace(/\/$/,'')}/functions/v1/witness-lema-admin`;

export async function callAdminBackend(action, body = {}) {
  const secret = String(process.env.WITNESS_LEMA_INTERNAL_SECRET || '');
  if (!process.env.SUPABASE_URL || secret.length < 32) throw new Error('Admin storage is not configured.');
  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-admin-secret': secret },
    body: JSON.stringify({ action, body, ...body }),
    signal: AbortSignal.timeout(12000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Admin storage request failed.');
  return data;
}
