import { isIP } from 'node:net';

// Source: https://www.cloudflare.com/ips/
const CLOUDFLARE_CIDRS = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
];

const PRIVATE_CIDRS = [
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '127.0.0.0/8',
  '100.64.0.0/10',
  '169.254.0.0/16',
  '::1/128',
  'fc00::/7',
  'fe80::/10',
];

type ParsedCidr = { version: 4 | 6; base: bigint; mask: bigint };

function ipToBigInt(ip: string): { version: 4 | 6; value: bigint } | null {
  const version = isIP(ip);
  if (version === 4) {
    const value = ip
      .split('.')
      .reduce((acc, part) => (acc << 8n) + BigInt(Number(part)), 0n);
    return { version: 4, value };
  }
  if (version !== 6) {
    return null;
  }

  const mappedV4 = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  if (mappedV4) {
    return ipToBigInt(mappedV4);
  }

  const [head = '', tail = ''] = ip.split('::');
  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  const missing = 8 - headParts.length - tailParts.length;
  const groups = ip.includes('::')
    ? [...headParts, ...new Array(missing).fill('0'), ...tailParts]
    : headParts;

  const value = groups.reduce(
    (acc, group) => (acc << 16n) + BigInt(Number.parseInt(group || '0', 16)),
    0n
  );
  return { version: 6, value };
}

function parseCidr(cidr: string): ParsedCidr {
  const [address = '', prefixText = ''] = cidr.split('/');
  const parsed = ipToBigInt(address);
  if (!parsed) {
    throw new Error(`Invalid CIDR: ${cidr}`);
  }
  const bits = parsed.version === 4 ? 32n : 128n;
  const prefix = BigInt(Number(prefixText));
  const mask = ((1n << prefix) - 1n) << (bits - prefix);
  return { version: parsed.version, base: parsed.value & mask, mask };
}

const cloudflareRanges = CLOUDFLARE_CIDRS.map(parseCidr);
const privateRanges = PRIVATE_CIDRS.map(parseCidr);

function inRanges(ip: string, ranges: ParsedCidr[]): boolean {
  const parsed = ipToBigInt(ip);
  if (!parsed) {
    return false;
  }
  return ranges.some(
    (range) =>
      range.version === parsed.version &&
      (parsed.value & range.mask) === range.base
  );
}

function normalizeIp(raw: string | undefined | null): string | null {
  const value = raw?.trim();
  if (!value) {
    return null;
  }
  return isIP(value) ? value : null;
}

/**
 * Resolves the client IP by walking the proxy chain from the closest hop.
 * Forwarding headers are only honored when the hop that set them is a
 * trusted proxy (private network or Cloudflare), so a client that reaches
 * the origin directly cannot spoof its address.
 */
export function getClientIp(
  request: Request,
  socketAddress?: string | null
): string | null {
  const forwardedFor = (request.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map(normalizeIp)
    .filter((ip): ip is string => ip !== null);
  const realIp = normalizeIp(request.headers.get('x-real-ip'));
  const socketIp = normalizeIp(socketAddress);

  const chain = [...forwardedFor];
  if (forwardedFor.length === 0 && realIp) {
    chain.push(realIp);
  }
  if (socketIp && chain.at(-1) !== socketIp) {
    chain.push(socketIp);
  }

  for (let index = chain.length - 1; index >= 0; index--) {
    const hop = chain[index] as string;

    if (inRanges(hop, cloudflareRanges)) {
      const cfIp = normalizeIp(request.headers.get('cf-connecting-ip'));
      if (cfIp) {
        return cfIp;
      }
      continue;
    }

    if (inRanges(hop, privateRanges) && index > 0) {
      continue;
    }

    return hop;
  }

  return chain[0] ?? null;
}

export function getSocketAddress(
  request: Request,
  server: unknown
): string | null {
  const requestIP = (
    server as { requestIP?: (req: Request) => { address: string } | null }
  )?.requestIP;
  return requestIP?.(request)?.address ?? null;
}
