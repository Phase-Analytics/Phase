import { describe, expect, test } from 'bun:test';
import type { Domain } from '@opencoredev/domain-sdk';
import { toStoredDomainState } from './domain-provider';

function domain(overrides: Partial<Domain> = {}): Domain {
  return {
    id: 'provider-id',
    hostname: 'go.example.com',
    provider: 'cloudflare',
    status: 'pending_verification',
    records: [
      {
        type: 'CNAME',
        name: 'go.example.com',
        value: 'cname.phase.sh',
        purpose: 'routing',
        required: true,
        status: 'pending',
      },
      {
        type: 'TXT',
        name: '_cf-custom-hostname.go.example.com',
        value: 'ownership-token',
        purpose: 'ownership',
        required: true,
        status: 'pending',
      },
    ],
    verification: { status: 'pending', records: [] },
    certificate: { status: 'pending' },
    issues: [],
    ...overrides,
  };
}

describe('domain provider state', () => {
  test('keeps provider DNS ownership records pending until fully active', () => {
    const state = toStoredDomainState(domain());

    expect(state.status).toBe('pending');
    expect(state.dnsRecords.map((record) => record.purpose)).toEqual([
      'routing',
      'ownership',
    ]);
  });

  test('marks a domain verified only when the provider is active', () => {
    const state = toStoredDomainState(
      domain({
        status: 'active',
        verification: { status: 'verified', records: [] },
        certificate: { status: 'active' },
      })
    );

    expect(state.status).toBe('verified');
    expect(state.lastError).toBeNull();
  });

  test('requires the per-tenant ownership record even when Cloudflare is active', () => {
    const active = domain({
      status: 'active',
      verification: { status: 'verified', records: [] },
      certificate: { status: 'active' },
    });

    const pending = toStoredDomainState(active, {
      token: 'tenant-token',
      verified: false,
    });
    const verified = toStoredDomainState(active, {
      token: 'tenant-token',
      verified: true,
    });

    expect(pending.status).toBe('pending');
    expect(pending.dnsRecords[0]).toMatchObject({
      purpose: 'ownership',
      value: 'tenant-token',
      status: 'pending',
    });
    expect(verified.status).toBe('verified');
  });

  test('surfaces provider failures without false readiness', () => {
    const state = toStoredDomainState(
      domain({
        status: 'misconfigured',
        issues: [
          {
            code: 'dns_misconfigured',
            message: 'Routing record is invalid.',
            retryable: true,
          },
        ],
      })
    );

    expect(state.status).toBe('failed');
    expect(state.lastError).toBe('Routing record is invalid.');
  });
});
