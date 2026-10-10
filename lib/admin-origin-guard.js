// Defense in depth for private admin mutations.
// SameSite=Strict owner cookies remain the primary browser CSRF barrier.
// Avoid trusting an Origin header whose hostname differs from the actual host.
export function validateOwnerWriteOrigin(req) {
  const method = String(req?.method || 'GET').toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return { allowed: true };
  const headers = req?.headers || {};
  const fetchSite = String(headers['sec-fetch-site'] || '').toLowerCase();
  if (fetchSite === 'cross-site') return { allowed: false, reason: 'Cross-site admin changes are not permitted.' };

  const suppliedOrigin = String(headers.origin || '').trim();
  if (!suppliedOrigin) {
    // Server-side/callback requests may omit Origin. Do not infer an origin
    // from untrusted Referer or X-Forwarded-Host values.
    return { allowed: true };
  }

  const host = String(headers.host || '').trim().toLowerCase();
  if (!host) return { allowed: false, reason: 'Could not verify request host.' };
  try {
    const origin = new URL(suppliedOrigin);
    if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
      return { allowed: false, reason: 'Invalid origin for admin request.' };
    }
    const localHttp = origin.protocol === 'http:' && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
    const secure = origin.protocol === 'https:';
    if (!(secure || localHttp) || origin.host.toLowerCase() !== host) {
      return { allowed: false, reason: 'Admin changes must originate from this website.' };
    }
    return { allowed: true };
  } catch {
    return { allowed: false, reason: 'Invalid origin for admin request.' };
  }
}
