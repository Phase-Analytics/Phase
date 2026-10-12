'use client';

import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { getQueryClient } from './query-client';

const persister = createSyncStoragePersister({
  storage: typeof window === 'undefined' ? undefined : window.localStorage,
  // Serializing the cache blocks the main thread; batch bursts of query updates.
  throttleTime: 2000,
});

// Only aggregate analytics are persisted: no lists, details, admin data or PII.
const PERSISTED_QUERY_KINDS: Record<string, ReadonlySet<string>> = {
  devices: new Set(['overview', 'timeseries', 'retention']),
  sessions: new Set(['overview', 'timeseries']),
  events: new Set(['overview', 'timeseries', 'top']),
  funnels: new Set(['activation']),
};

// Structural type: the persist packages currently resolve their own query-core copy.
type PersistableQuery = {
  queryKey: readonly unknown[];
  state: { status: string };
};

function shouldPersistQuery(query: PersistableQuery): boolean {
  if (query.state.status !== 'success') {
    return false;
  }
  const [domain, kind] = query.queryKey;
  if (typeof domain !== 'string' || typeof kind !== 'string') {
    return false;
  }
  return PERSISTED_QUERY_KINDS[domain]?.has(kind) ?? false;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 60 * 60 * 1000,
        buster: process.env.NEXT_PUBLIC_BUILD_ID,
        dehydrateOptions: {
          shouldDehydrateQuery: shouldPersistQuery,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
