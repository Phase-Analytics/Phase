import { serve } from 'bun';
import { describe, expect, test } from 'bun:test';
import { getSocketAddress } from './client-ip';

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
