import { describe, expect, test } from 'bun:test';
import { getSocketAddress } from './client-ip';

describe('getSocketAddress', () => {
  test('reads the peer address from a real Bun server', async () => {
    const server = Bun.serve({
      port: 0,
      fetch: (request, bunServer) =>
        new Response(getSocketAddress(request, bunServer) ?? ''),
    });
    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/`);
      expect(await response.text()).toMatch(/127\.0\.0\.1|::1/);
    } finally {
      server.stop(true);
    }
  });
});
