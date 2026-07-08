import { randomUUID } from 'node:crypto';

const VISITOR_COOKIE = 'phase_vid';
const VISITOR_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;
const VISITOR_ID_PATTERN = /^[a-f0-9-]{16,64}$/i;

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

/**
 * Prefer a first-party cookie so CGNAT / shared Wi-Fi / same UA do not collapse
 * many people into one unique. Each browser gets its own id on first click.
 */
export function resolveVisitorIdentity(options: {
  cookieHeader: string | null;
}): { visitorKey: string; setCookie: string | null } {
  const existing = parseCookieValue(options.cookieHeader, VISITOR_COOKIE);
  if (isValidVisitorId(existing)) {
    return { visitorKey: existing, setCookie: null };
  }

  const visitorId = randomUUID();
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
