import { and, inArray, isNotNull } from 'drizzle-orm';
import { db, linkDomains } from '@/db';
import {
  LINK_CNAME_TARGET,
  LINK_DEFAULT_HOST,
  LINK_SHORT_PATH_PREFIX,
} from './constants';

/**
 * Destination abuse checks run when a destination is created or changed.
 * Scheme rules live in the shared zod schema; these need server context.
 */

// Chaining through another shortener hides the real destination from us and
// from Safe Browsing, which is exactly what phishing kits want.
const KNOWN_SHORTENER_HOSTS = [
  'bit.ly',
  'bl.ink',
  'buff.ly',
  'cutt.ly',
  'goo.gl',
  'is.gd',
  'ow.ly',
  'rb.gy',
  'rebrand.ly',
  's.id',
  'short.io',
  'shorturl.at',
  't.co',
  't.ly',
  'tiny.cc',
  'tinyurl.com',
  'v.gd',
];

const SAFE_BROWSING_ENDPOINT =
  'https://safebrowsing.googleapis.com/v4/threatMatches:find';
const SAFE_BROWSING_TIMEOUT_MS = 3000;

export class LinkDestinationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LinkDestinationError';
  }
}

function matchesHost(host: string, candidate: string): boolean {
  return host === candidate || host.endsWith(`.${candidate}`);
}

function parseWebUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function isOwnShortLink(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (matchesHost(host, LINK_CNAME_TARGET)) {
    return true;
  }
  const isDefaultHost =
    host === LINK_DEFAULT_HOST || host === `www.${LINK_DEFAULT_HOST}`;
  return isDefaultHost && url.pathname.startsWith(`${LINK_SHORT_PATH_PREFIX}/`);
}

/**
 * Google Safe Browsing v4 lookup. Skipped when no key is configured. Fails
 * closed only on a positive match; an API outage is logged and allowed so
 * link editing does not depend on Google uptime.
 */
async function findUnsafeUrls(urls: string[]): Promise<string[]> {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY?.trim();
  if (!apiKey || urls.length === 0) {
    return [];
  }

  try {
    const response = await fetch(
      `${SAFE_BROWSING_ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(SAFE_BROWSING_TIMEOUT_MS),
        body: JSON.stringify({
          client: { clientId: 'phase', clientVersion: '1.0' },
          threatInfo: {
            threatTypes: [
              'MALWARE',
              'SOCIAL_ENGINEERING',
              'UNWANTED_SOFTWARE',
              'POTENTIALLY_HARMFUL_APPLICATION',
            ],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: urls.map((url) => ({ url })),
          },
        }),
      }
    );

    if (!response.ok) {
      console.error(
        `[Links] Safe Browsing lookup failed (${response.status}); allowing destination`
      );
      return [];
    }

    const body = (await response.json()) as {
      matches?: Array<{ threat?: { url?: string } }>;
    };
    return (body.matches ?? [])
      .map((match) => match.threat?.url)
      .filter((url): url is string => Boolean(url));
  } catch (error) {
    console.error(
      '[Links] Safe Browsing lookup unavailable; allowing destination:',
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/** Throws LinkDestinationError when any destination is not allowed. */
export async function assertAllowedLinkDestinations(
  values: Array<string | null | undefined>
): Promise<void> {
  const urls = values
    .filter((value): value is string => Boolean(value))
    .map(parseWebUrl)
    .filter((url): url is URL => url !== null);
  if (urls.length === 0) {
    return;
  }

  for (const url of urls) {
    if (isOwnShortLink(url)) {
      throw new LinkDestinationError(
        'A link cannot point to another Phase link'
      );
    }
    const host = url.hostname.toLowerCase();
    if (
      KNOWN_SHORTENER_HOSTS.some((shortener) => matchesHost(host, shortener))
    ) {
      throw new LinkDestinationError(
        'Use the final destination instead of another link shortener'
      );
    }
  }

  const hosts = [...new Set(urls.map((url) => url.hostname.toLowerCase()))];
  // Only owned domains count: pending claims are unproven and would let anyone
  // block destinations (e.g. a pending claim on google.com).
  const customDomain = await db.query.linkDomains.findFirst({
    where: and(
      inArray(linkDomains.hostname, hosts),
      isNotNull(linkDomains.ownershipVerifiedAt)
    ),
    columns: { id: true },
  });
  if (customDomain) {
    throw new LinkDestinationError('A link cannot point to another Phase link');
  }

  const unsafe = await findUnsafeUrls(urls.map((url) => url.toString()));
  if (unsafe.length > 0) {
    throw new LinkDestinationError(
      'This destination is flagged as unsafe by Google Safe Browsing'
    );
  }
}
