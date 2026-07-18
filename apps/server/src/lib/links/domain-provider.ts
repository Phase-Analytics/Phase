import { resolveTxt } from 'node:dns/promises';
import {
  createDomainClient,
  type Domain,
  type DomainClient,
  DomainSdkError,
} from '@opencoredev/domain-sdk';
import { cloudflareSaaS } from '@opencoredev/domain-sdk/cloudflare';
import type { LinkDomainDnsRecord } from '@phase/shared';
import { LINK_CNAME_TARGET } from './constants';

const OWNERSHIP_LABEL = '_phase-verify';
let client: DomainClient | undefined;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new DomainSdkError(
      'INVALID_CONFIGURATION',
      `${name} is required for custom domain provisioning.`
    );
  }
  return value;
}

export function getDomainClient(): DomainClient {
  if (client) {
    return client;
  }

  client = createDomainClient({
    provider: cloudflareSaaS({
      apiToken: requiredEnv('CLOUDFLARE_API_TOKEN'),
      zoneId: requiredEnv('CLOUDFLARE_ZONE_ID'),
      cnameTarget:
        process.env.CLOUDFLARE_CNAME_TARGET?.trim() || LINK_CNAME_TARGET,
      ssl: {
        method: 'txt',
        type: 'dv',
        minimumTlsVersion: '1.2',
      },
      ...(process.env.CLOUDFLARE_CUSTOM_ORIGIN_SERVER?.trim()
        ? {
            customOriginServer:
              process.env.CLOUDFLARE_CUSTOM_ORIGIN_SERVER.trim(),
          }
        : {}),
    }),
  });

  return client;
}

function toDnsRecords(domain: Domain): LinkDomainDnsRecord[] {
  return domain.records.map((record) => ({
    type: record.type,
    name: record.name,
    value: record.value,
    purpose: record.purpose,
    required: record.required,
    status: record.status,
  }));
}

export function createOwnershipRecord(
  hostname: string,
  token: string,
  verified: boolean
): LinkDomainDnsRecord {
  return {
    type: 'TXT',
    name: `${OWNERSHIP_LABEL}.${hostname}`,
    value: token,
    purpose: 'ownership',
    required: true,
    status: verified ? 'valid' : 'pending',
  };
}

function withOwnershipRecord(
  records: LinkDomainDnsRecord[],
  hostname: string,
  token: string,
  verified: boolean
): LinkDomainDnsRecord[] {
  const ownership = createOwnershipRecord(hostname, token, verified);
  return [
    ownership,
    ...records.filter(
      (record) =>
        !(record.type === ownership.type && record.name === ownership.name)
    ),
  ];
}

export function toStoredDomainState(
  domain: Domain,
  ownership?: { token: string; verified: boolean }
) {
  const failed =
    domain.status === 'failed' || domain.status === 'misconfigured';
  const ownershipVerified = ownership?.verified ?? true;
  let status: 'pending' | 'verified' | 'failed' = 'pending';
  if (domain.status === 'active' && ownershipVerified) {
    status = 'verified';
  } else if (failed) {
    status = 'failed';
  }

  const providerError =
    domain.issues
      .map((issue) => issue.message)
      .filter(Boolean)
      .join(' ') ||
    domain.verification.message ||
    domain.certificate.message ||
    null;
  const lastError = ownershipVerified
    ? providerError
    : 'Add the Phase ownership TXT record and verify again.';
  const providerRecords = toDnsRecords(domain);

  return {
    status,
    providerId: domain.id,
    providerStatus: domain.status,
    verificationStatus: domain.verification.status,
    certificateStatus: domain.certificate.status,
    dnsRecords: ownership
      ? withOwnershipRecord(
          providerRecords,
          domain.hostname,
          ownership.token,
          ownership.verified
        )
      : providerRecords,
    lastCheckAt: new Date(),
    lastError: status === 'verified' ? null : lastError,
  } as const;
}

function parseDohTxt(data: string): string {
  const parts = data.match(/"(?:\\.|[^"\\])*"/g);
  if (!parts) {
    return data.replace(/^"|"$/g, '');
  }

  try {
    return parts.map((part) => JSON.parse(part) as string).join('');
  } catch {
    return data.replace(/^"|"$/g, '');
  }
}

async function verifyOwnershipViaDoh(
  recordName: string,
  token: string
): Promise<boolean> {
  try {
    const url = new URL('https://cloudflare-dns.com/dns-query');
    url.searchParams.set('name', recordName);
    url.searchParams.set('type', 'TXT');
    const response = await fetch(url, {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return false;
    }

    const body = (await response.json()) as {
      Answer?: Array<{ type: number; data: string }>;
    };
    return (body.Answer ?? []).some(
      (answer) => answer.type === 16 && parseDohTxt(answer.data) === token
    );
  } catch {
    return false;
  }
}

export async function verifyDomainOwnership(
  hostname: string,
  token: string
): Promise<boolean> {
  const recordName = `${OWNERSHIP_LABEL}.${hostname}`;
  try {
    const records = await resolveTxt(recordName);
    if (records.some((record) => record.join('') === token)) {
      return true;
    }
  } catch {
    return verifyOwnershipViaDoh(recordName, token);
  }

  return verifyOwnershipViaDoh(recordName, token);
}

export function getDomainProvisioningError(error: unknown): string {
  if (!(error instanceof DomainSdkError)) {
    return 'Domain provider request failed.';
  }

  switch (error.code) {
    case 'AUTHENTICATION_FAILED':
    case 'PERMISSION_DENIED':
    case 'INVALID_CONFIGURATION':
      return 'Custom domain provider is not configured correctly.';
    case 'DOMAIN_CONFLICT':
      return 'This hostname is already configured by another account.';
    case 'RATE_LIMITED':
      return 'Domain provider rate limit reached. Try again shortly.';
    case 'PROVIDER_UNAVAILABLE':
    case 'TIMEOUT':
      return 'Domain provider is temporarily unavailable. Try again shortly.';
    default:
      return error.message || 'Domain provider request failed.';
  }
}
