import { promises as dns } from 'node:dns';
import { eq } from 'drizzle-orm';
import { db, linkDomains } from '@/db';
import { safeHttpsGet } from '@/lib/safe-fetch';
import { LINK_CNAME_TARGET } from './constants';

const TRAILING_DOT_REGEX = /\.$/;
export const DOMAIN_VERIFY_PATH = '/phase/link-domain-verify';
export const DOMAIN_VERIFY_HEADER = 'x-phase-domain-verify';

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(TRAILING_DOT_REGEX, '');
}

function cnameMatchesTarget(record: string, target: string): boolean {
  const normalizedRecord = normalizeHostname(record);
  const normalizedTarget = normalizeHostname(target);

  return (
    normalizedRecord === normalizedTarget ||
    normalizedRecord.endsWith(`.${normalizedTarget}`)
  );
}

async function verifyCnameRecord(
  hostname: string,
  target: string
): Promise<boolean> {
  try {
    const cnames = await dns.resolveCname(normalizeHostname(hostname));
    return cnames.some((record) => cnameMatchesTarget(record, target));
  } catch {
    return false;
  }
}

type DoHAnswer = { type: number; data: string };

async function verifyCnameViaDoH(
  hostname: string,
  target: string
): Promise<boolean> {
  try {
    const url = new URL('https://cloudflare-dns.com/dns-query');
    url.searchParams.set('name', normalizeHostname(hostname));
    url.searchParams.set('type', 'CNAME');

    const response = await fetch(url, {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { Answer?: DoHAnswer[] };
    const answers = payload.Answer ?? [];

    return answers.some(
      (answer) => answer.type === 5 && cnameMatchesTarget(answer.data, target)
    );
  } catch {
    return false;
  }
}

async function verifyDomainHttpExternal(hostname: string): Promise<boolean> {
  const normalizedHost = normalizeHostname(hostname);

  try {
    const response = await safeHttpsGet(
      `https://${normalizedHost}${DOMAIN_VERIFY_PATH}`,
      {
        allowedHostnames: [normalizedHost],
        timeoutMs: 12_000,
        maxRedirects: 3,
        headers: {
          Accept: '*/*',
          'User-Agent': 'Phase-Domain-Verify/1',
        },
      }
    );

    return (
      response.ok &&
      response.headers.get(DOMAIN_VERIFY_HEADER)?.toLowerCase() === '1'
    );
  } catch {
    return false;
  }
}

export async function verifyDomainCname(hostname: string): Promise<{
  verified: boolean;
  error?: string;
}> {
  const normalizedHost = normalizeHostname(hostname);
  const target = normalizeHostname(LINK_CNAME_TARGET);

  if (await verifyCnameRecord(normalizedHost, target)) {
    return { verified: true };
  }

  if (await verifyCnameViaDoH(normalizedHost, target)) {
    return { verified: true };
  }

  if (await verifyDomainHttpExternal(normalizedHost)) {
    return { verified: true };
  }

  return {
    verified: false,
    error: `Could not verify ${normalizedHost}. Add CNAME → ${LINK_CNAME_TARGET} and try again.`,
  };
}

export async function handleDomainVerifyRequest(
  host: string | null
): Promise<Response> {
  const normalizedHost = host ? normalizeHostname(host) : null;

  if (!normalizedHost) {
    return new Response('Not Found', { status: 404 });
  }

  const row = await db.query.linkDomains.findFirst({
    where: eq(linkDomains.hostname, normalizedHost),
  });

  if (!row) {
    return new Response('Not Found', { status: 404 });
  }

  return new Response('ok', {
    status: 200,
    headers: {
      [DOMAIN_VERIFY_HEADER]: '1',
    },
  });
}
