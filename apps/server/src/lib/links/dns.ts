import { promises as dns } from 'node:dns';
import { eq } from 'drizzle-orm';
import { db, linkDomains } from '@/db';
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

async function verifyCnameRecord(hostname: string, target: string): Promise<{
  verified: boolean;
  error?: string;
}> {
  const normalizedHost = normalizeHostname(hostname);

  try {
    const cnames = await dns.resolveCname(normalizedHost);
    const match = cnames.some((record) => cnameMatchesTarget(record, target));

    if (match) {
      return { verified: true };
    }

    return {
      verified: false,
      error: `CNAME must point to ${LINK_CNAME_TARGET}`,
    };
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : 'UNKNOWN';

    if (code === 'ENODATA' || code === 'ENOTFOUND') {
      return {
        verified: false,
        error: `No CNAME record found. Add CNAME ${normalizedHost} → ${LINK_CNAME_TARGET}`,
      };
    }

    return {
      verified: false,
      error: 'DNS lookup failed. Try again in a few minutes.',
    };
  }
}

type DoHAnswer = { type: number; data: string };

async function verifyCnameViaDoH(hostname: string, target: string): Promise<boolean> {
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

async function verifyDomainHttp(hostname: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const response = await fetch(
      `https://${normalizeHostname(hostname)}${DOMAIN_VERIFY_PATH}`,
      {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
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
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyDomainCname(hostname: string): Promise<{
  verified: boolean;
  error?: string;
}> {
  const normalizedHost = normalizeHostname(hostname);
  const target = normalizeHostname(LINK_CNAME_TARGET);

  const cnameResult = await verifyCnameRecord(normalizedHost, target);
  if (cnameResult.verified) {
    return cnameResult;
  }

  const dohVerified = await verifyCnameViaDoH(normalizedHost, target);
  if (dohVerified) {
    return { verified: true };
  }

  const httpVerified = await verifyDomainHttp(normalizedHost);
  if (httpVerified) {
    return { verified: true };
  }

  return {
    verified: false,
    error: `Could not verify ${normalizedHost}. Add CNAME → ${LINK_CNAME_TARGET}, wait for DNS propagation, then try again.`,
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
