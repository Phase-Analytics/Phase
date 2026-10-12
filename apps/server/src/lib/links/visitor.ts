import { createHmac, randomUUID } from 'node:crypto';

const VISITOR_COOKIE = 'phase_vid';
const VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;
const VISITOR_ID_PATTERN = /^[a-f0-9-]{16,64}$/i;

let cachedSalt: { day: string; salt: Buffer } | null = null;

function parseCookieValue(
  cookieHeader: string | null,
  name: string
): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) {
      const value = rest.join('=').trim();
      return value || null;
    }
  }

  return null;
}

function isValidVisitorId(value: string | null): value is string {
  if (!value) {
    return false;
  }
  return VISITOR_ID_PATTERN.test(value);
}

/** Salt rotates daily so cookie-less keys cannot be linked across days. */
function getDailySalt(secret: string, now: Date): Buffer {
  const day = now.toISOString().slice(0, 10);
  if (cachedSalt?.day !== day) {
    cachedSalt = {
      day,
      salt: createHmac('sha256', secret)
        .update(`link-visitor-salt:${day}`)
        .digest(),
    };
  }
  return cachedSalt.salt;
}

function deriveVisitorKey(
  ip: string | null,
  userAgent: string | null
): string | null {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!(secret && ip)) {
    return null;
  }
  return createHmac('sha256', getDailySalt(secret, new Date()))
    .update(`${ip}|${userAgent ?? ''}`)
    .digest('hex');
}

/**
 * Prefer a first-party cookie so CGNAT / shared Wi-Fi / same UA do not collapse
 * many people into one unique. Cookie-less clients (link unfurlers, privacy
 * browsers, the first click) get a daily-salted HMAC of IP + UA instead of a
 * random id, so repeated clicks from the same client count once per day. The
 * derived key becomes the cookie value for clients that keep cookies.
 */
export function resolveVisitorIdentity(options: {
  cookieHeader: string | null;
  ip: string | null;
  userAgent: string | null;
}): { visitorKey: string; setCookie: string | null } {
  const existing = parseCookieValue(options.cookieHeader, VISITOR_COOKIE);
  if (isValidVisitorId(existing)) {
    return { visitorKey: existing, setCookie: null };
  }

  const visitorId =
    deriveVisitorKey(options.ip, options.userAgent) ?? randomUUID();
  const setCookie = [
    `${VISITOR_COOKIE}=${visitorId}`,
    'Path=/',
    `Max-Age=${VISITOR_COOKIE_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
    'Secure',
    'HttpOnly',
  ].join('; ');

  return { visitorKey: visitorId, setCookie };
}
