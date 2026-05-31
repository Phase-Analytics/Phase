import { promises as dns } from 'node:dns';
import { eq } from 'drizzle-orm';
import { db, linkDomains } from '@/db';
import { LINK_CNAME_TARGET } from './constants';

const TRAILING_DOT_REGEX = /\.$/;
export const DOMAIN_VERIFY_PATH = '/phase/link-domain-verify';
export const DOMAIN_VERIFY_HEADER = 'x-phase-domain-verify';

export type DomainVerifyChecks = {
  cname: string;
  doh: string;
  httpExternal: string;
  httpLocal: string;
  resolves: boolean;
};

export type DomainVerifyResult = {
  verified: boolean;
  error?: string;
  checks: DomainVerifyChecks;
};

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

function formatChecks(checks: DomainVerifyChecks): string {
  return [
    `CNAME: ${checks.cname}`,
    `DoH: ${checks.doh}`,
    `HTTP: ${checks.httpExternal}`,
    `Local: ${checks.httpLocal}`,
    `Resolves: ${checks.resolves ? 'yes' : 'no'}`,
  ].join(' | ');
}

async function verifyCnameRecord(
  hostname: string,
  target: string
): Promise<{ verified: boolean; detail: string }> {
  const normalizedHost = normalizeHostname(hostname);

  try {
    const cnames = await dns.resolveCname(normalizedHost);
    const match = cnames.some((record) => cnameMatchesTarget(record, target));

    if (match) {
      return { verified: true, detail: `ok (${cnames.join(', ')})` };
    }

    return {
      verified: false,
      detail: `points to ${cnames.join(', ') ?? 'unknown'}`,
    };
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : 'UNKNOWN';

    if (code === 'ENODATA' || code === 'ENOTFOUND') {
      return { verified: false, detail: 'no public CNAME (proxied DNS is ok)' };
    }

    return { verified: false, detail: `lookup error (${code})` };
  }
}

type DoHAnswer = { type: number; data: string };

async function verifyCnameViaDoH(
  hostname: string,
  target: string
): Promise<{ verified: boolean; detail: string }> {
  try {
    const url = new URL('https://cloudflare-dns.com/dns-query');
    url.searchParams.set('name', normalizeHostname(hostname));
    url.searchParams.set('type', 'CNAME');

    const response = await fetch(url, {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return { verified: false, detail: `DoH status ${response.status}` };
    }

    const payload = (await response.json()) as { Answer?: DoHAnswer[] };
    const answers = payload.Answer ?? [];
    const cnames = answers
      .filter((answer) => answer.type === 5)
      .map((answer) => answer.data);

    if (cnames.some((record) => cnameMatchesTarget(record, target))) {
      return { verified: true, detail: `ok (${cnames.join(', ')})` };
    }

    return {
      verified: false,
      detail: cnames.length > 0 ? cnames.join(', ') : 'no CNAME answer',
    };
  } catch (error) {
    return {
      verified: false,
      detail: error instanceof Error ? error.message : 'DoH failed',
    };
  }
}

async function hostnameResolves(hostname: string): Promise<boolean> {
  const normalizedHost = normalizeHostname(hostname);

  try {
    await dns.resolve4(normalizedHost);
    return true;
  } catch {
    try {
      await dns.resolve6(normalizedHost);
      return true;
    } catch {
      return false;
    }
  }
}

async function verifyDomainHttpExternal(
  hostname: string
): Promise<{ verified: boolean; detail: string }> {
  const url = `https://${normalizeHostname(hostname)}${DOMAIN_VERIFY_PATH}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(12_000),
      redirect: 'follow',
      headers: {
        Accept: '*/*',
        'User-Agent': 'Phase-Domain-Verify/1',
      },
    });

    const header = response.headers.get(DOMAIN_VERIFY_HEADER)?.toLowerCase();

    if (response.ok && header === '1') {
      return { verified: true, detail: 'ok' };
    }

    return {
      verified: false,
      detail: `status ${response.status}, header=${header ?? 'missing'}`,
    };
  } catch (error) {
    return {
      verified: false,
      detail: error instanceof Error ? error.message : 'fetch failed',
    };
  }
}

async function verifyDomainHttpLocal(
  hostname: string
): Promise<{ verified: boolean; detail: string }> {
  const port = Number(process.env.PORT ?? 3001);
  const url = `http://127.0.0.1:${port}${DOMAIN_VERIFY_PATH}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
      headers: {
        Accept: '*/*',
        Host: normalizeHostname(hostname),
        'User-Agent': 'Phase-Domain-Verify/1',
      },
    });

    const header = response.headers.get(DOMAIN_VERIFY_HEADER)?.toLowerCase();

    if (response.ok && header === '1') {
      return { verified: true, detail: 'ok' };
    }

    return {
      verified: false,
      detail: `status ${response.status}, header=${header ?? 'missing'}`,
    };
  } catch (error) {
    return {
      verified: false,
      detail: error instanceof Error ? error.message : 'local fetch failed',
    };
  }
}

export async function verifyDomainCname(
  hostname: string
): Promise<DomainVerifyResult> {
  const normalizedHost = normalizeHostname(hostname);
  const target = normalizeHostname(LINK_CNAME_TARGET);

  const cname = await verifyCnameRecord(normalizedHost, target);
  const doh = await verifyCnameViaDoH(normalizedHost, target);
  const httpExternal = await verifyDomainHttpExternal(normalizedHost);
  const resolves = await hostnameResolves(normalizedHost);
  const httpLocal = await verifyDomainHttpLocal(normalizedHost);

  const checks: DomainVerifyChecks = {
    cname: cname.detail,
    doh: doh.detail,
    httpExternal: httpExternal.detail,
    httpLocal: httpLocal.detail,
    resolves,
  };

  const verified =
    cname.verified ||
    doh.verified ||
    httpExternal.verified ||
    (resolves && httpLocal.verified);

  const result: DomainVerifyResult = {
    verified,
    checks,
  };

  console.info('[LinkDomainVerify]', {
    hostname: normalizedHost,
    verified,
    checks,
  });

  if (!verified) {
    result.error = `Could not verify ${normalizedHost}. ${formatChecks(checks)}`;
  }

  return result;
}

export async function handleDomainVerifyRequest(
  host: string | null
): Promise<Response> {
  const normalizedHost = host ? normalizeHostname(host) : null;

  if (!normalizedHost) {
    console.warn('[LinkDomainVerify] request missing host header');
    return new Response('Not Found', { status: 404 });
  }

  const row = await db.query.linkDomains.findFirst({
    where: eq(linkDomains.hostname, normalizedHost),
  });

  if (!row) {
    console.warn('[LinkDomainVerify] host not in database', {
      hostname: normalizedHost,
    });
    return new Response('Not Found', { status: 404 });
  }

  console.info('[LinkDomainVerify] probe ok', { hostname: normalizedHost });

  return new Response('ok', {
    status: 200,
    headers: {
      [DOMAIN_VERIFY_HEADER]: '1',
    },
  });
}
