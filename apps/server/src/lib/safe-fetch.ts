import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_REDIRECTS_DEFAULT = 3;

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }

  const [a, b] = parts;

  if (a === 0 || a === 10 || a === 127) {
    return true;
  }
  if (a === 169 && b === 254) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a >= 224) {
    return true;
  }

  return false;
}

function isPrivateOrReservedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  if (normalized === '::1') {
    return true;
  }
  if (normalized.startsWith('fe80:')) {
    return true;
  }
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }

  return false;
}

export function isPrivateOrReservedIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    return isPrivateOrReservedIpv4(ip);
  }
  if (version === 6) {
    return isPrivateOrReservedIpv6(ip);
  }
  return true;
}

export async function assertPublicResolvableHost(hostname: string): Promise<void> {
  const normalized = hostname.trim().toLowerCase();

  if (
    !normalized ||
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local')
  ) {
    throw new Error('Blocked hostname');
  }

  if (isIP(normalized)) {
    if (isPrivateOrReservedIp(normalized)) {
      throw new Error('Blocked IP address');
    }
    return;
  }

  const records = await lookup(normalized, { all: true, verbatim: true });

  if (records.length === 0) {
    throw new Error('Hostname did not resolve');
  }

  for (const record of records) {
    if (isPrivateOrReservedIp(record.address)) {
      throw new Error('Hostname resolves to a private or reserved address');
    }
  }
}

export async function safeHttpsGet(
  initialUrl: string,
  options: {
    allowedHostnames: string[];
    timeoutMs: number;
    maxRedirects?: number;
    headers?: Record<string, string>;
  }
): Promise<Response> {
  const allowed = new Set(
    options.allowedHostnames.map((host) => host.trim().toLowerCase())
  );
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS_DEFAULT;
  let url = new URL(initialUrl);

  for (let hop = 0; hop <= maxRedirects; hop++) {
    if (url.protocol !== 'https:') {
      throw new Error('Only HTTPS URLs are allowed');
    }

    if (!allowed.has(url.hostname.toLowerCase())) {
      throw new Error('Hostname is not allowed for this request');
    }

    await assertPublicResolvableHost(url.hostname);

    const response = await fetch(url, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(options.timeoutMs),
      headers: options.headers,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Redirect response missing Location header');
      }
      url = new URL(location, url);
      continue;
    }

    return response;
  }

  throw new Error('Too many redirects');
}
