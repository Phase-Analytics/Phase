import { promises as dns } from 'node:dns';
import { LINK_CNAME_TARGET } from './constants';

const TRAILING_DOT_REGEX = /\.$/;

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

export async function verifyDomainCname(hostname: string): Promise<{
  verified: boolean;
  error?: string;
}> {
  const normalizedHost = normalizeHostname(hostname);
  const target = normalizeHostname(LINK_CNAME_TARGET);

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
