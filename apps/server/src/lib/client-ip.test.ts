import { describe, expect, test } from 'bun:test';
import { serve } from 'bun';
import { getClientIp, getSocketAddress } from './client-ip';

const LOOPBACK_REGEX = /127\.0\.0\.1|::1/;

describe('getSocketAddress', () => {
  test('reads the peer address from a real Bun server', async () => {
    const server = serve({
      port: 0,
      fetch: (request, bunServer) =>
        new Response(getSocketAddress(request, bunServer) ?? ''),
    });
    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/`);
      expect(await response.text()).toMatch(LOOPBACK_REGEX);
    } finally {
      server.stop(true);
    }
  });
});

const VISITOR = '203.0.113.7';
const SPOOFED = '198.51.100.9';
const TUNNEL_CONNECTOR = '172.23.0.19';
const TRAEFIK = '172.23.0.5';
const CLOUDFLARE_EDGE = '162.158.1.1';

function requestWith(headers: Record<string, string>): Request {
  return new Request('https://api.phase.sh/sdk/devices', { headers });
}

describe('getClientIp', () => {
  test('uses the Cloudflare visitor behind the tunnel connector', () => {
    // cloudflared sends no x-forwarded-for; Traefik records the connector.
    const request = requestWith({
      'x-forwarded-for': TUNNEL_CONNECTOR,
      'cf-connecting-ip': VISITOR,
      'cf-ray': 'abc-FRA',
    });
    expect(getClientIp(request, TRAEFIK)).toBe(VISITOR);
  });

  test('uses the Cloudflare visitor when the edge proxies to the origin', () => {
    const request = requestWith({
      'x-forwarded-for': CLOUDFLARE_EDGE,
      'cf-connecting-ip': VISITOR,
    });
    expect(getClientIp(request, TRAEFIK)).toBe(VISITOR);
  });

  test('ignores a spoofed cf-connecting-ip from a client hitting the origin directly', () => {
    // Traefik replaces x-forwarded-for from untrusted peers with their address.
    const request = requestWith({
      'x-forwarded-for': VISITOR,
      'cf-connecting-ip': SPOOFED,
    });
    expect(getClientIp(request, TRAEFIK)).toBe(VISITOR);
  });

  test('keeps the private address for internal calls without Cloudflare', () => {
    const request = requestWith({ 'x-forwarded-for': TUNNEL_CONNECTOR });
    expect(getClientIp(request, TRAEFIK)).toBe(TUNNEL_CONNECTOR);
  });
});
