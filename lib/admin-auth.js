import crypto from 'node:crypto';

export const ADMIN_COOKIE_NAME = 'signature_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12;

function getSessionSecret() {
  return String(process.env.SIGNATURE_SESSION_SECRET || '').trim();
}

export function adminAuthConfigured() {
  return Boolean(
    String(process.env.SIGNATURE_ADMIN_LOGIN_ID || '').trim() &&
    String(process.env.SIGNATURE_ADMIN_PASSWORD_HASH || '').trim() &&
    getSessionSecret().length >= 32
  );
}

export function constantTimeTextEqual(left = '', right = '') {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) {
    const filler = Buffer.alloc(Math.max(a.length, b.length));
    const aPadded = Buffer.concat([a, filler]).subarray(0, filler.length);
    const bPadded = Buffer.concat([b, filler]).subarray(0, filler.length);
    crypto.timingSafeEqual(aPadded, bPadded);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

export function verifyPasswordHash(password = '', encodedHash = '') {
  try {
    const [scheme, nRaw, rRaw, pRaw, saltRaw, hashRaw] = String(encodedHash).split('$');
    if (scheme !== 'scrypt' || !nRaw || !rRaw || !pRaw || !saltRaw || !hashRaw) return false;

    const N = Number(nRaw);
    const r = Number(rRaw);
    const p = Number(pRaw);
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

    const salt = Buffer.from(saltRaw, 'base64url');
    const expected = Buffer.from(hashRaw, 'base64url');
    const derived = crypto.scryptSync(String(password), salt, expected.length, {
      N,
      r,
      p,
      maxmem: 64 * 1024 * 1024
    });

    return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

function sign(value) {
  // Tying the session MAC to the current password hash lets an owner revoke
  // every existing session by rotating credentials in private server settings.
  // The password hash and session secret never leave the server.
  return crypto.createHmac('sha256', getSessionSecret())
    .update('signature-owner-session-v1:')
    .update(String(process.env.SIGNATURE_ADMIN_PASSWORD_HASH || '').trim())
    .update(':')
    .update(value)
    .digest('base64url');
}

export function createSessionToken(loginId) {
  if (!adminAuthConfigured()) throw new Error('Admin authentication is not configured.');

  const issuedAt = Date.now();
  const payload = {
    sub: String(loginId),
    role: 'owner',
    iat: issuedAt,
    exp: issuedAt + ADMIN_SESSION_TTL_SECONDS * 1000,
    nonce: crypto.randomBytes(16).toString('base64url')
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return body + '.' + sign(body);
}

export function verifySessionToken(token = '') {
  try {
    if (!adminAuthConfigured()) return null;
    const text = String(token);
    if (!text || text.length > 4096) return null;
    const pieces = text.split('.');
    if (pieces.length !== 2) return null;
    const [body, suppliedSignature] = pieces;
    if (!body || !suppliedSignature) return null;

    const expectedSignature = sign(body);
    if (!constantTimeTextEqual(suppliedSignature, expectedSignature)) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (
      payload?.role !== 'owner' ||
      typeof payload?.sub !== 'string' ||
      typeof payload?.exp !== 'number' ||
      !Number.isSafeInteger(payload?.iat) ||
      payload.iat > Date.now() + 5 * 60 * 1000 ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > ADMIN_SESSION_TTL_SECONDS * 1000 ||
      Date.now() >= payload.exp
    ) return null;

    const expectedLogin = String(process.env.SIGNATURE_ADMIN_LOGIN_ID || '').trim();
    if (!constantTimeTextEqual(payload.sub, expectedLogin)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const header = String(req?.headers?.cookie || '');
  return header.split(';').reduce((cookies, pair) => {
    const index = pair.indexOf('=');
    if (index < 0) return cookies;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (key) {
      try { cookies[key] = decodeURIComponent(value); }
      catch { /* Ignore a malformed cookie instead of crashing admin APIs. */ }
    }
    return cookies;
  }, {});
}

export function getAdminSession(req) {
  const cookies = parseCookies(req);
  return verifySessionToken(cookies[ADMIN_COOKIE_NAME] || '');
}

export function makeSessionCookie(token) {
  const secure = process.env.VERCEL ? '; Secure' : '';
  return [
    ADMIN_COOKIE_NAME + '=' + encodeURIComponent(token),
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=' + ADMIN_SESSION_TTL_SECONDS,
    secure.replace(/^; /, '')
  ].filter(Boolean).join('; ');
}

export function makeExpiredSessionCookie() {
  const secure = process.env.VERCEL ? '; Secure' : '';
  return [
    ADMIN_COOKIE_NAME + '=',
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    secure.replace(/^; /, '')
  ].filter(Boolean).join('; ');
}

export function getClientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  return (Array.isArray(forwarded) ? forwarded[0] : String(forwarded || req?.headers?.['x-real-ip'] || 'unknown').split(',')[0]).trim();
}
