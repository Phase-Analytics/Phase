'use client';

import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { getQueryClient } from './query-client';

const persister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 60 * 60 * 1000,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const queryKey = query.queryKey;
            if (Array.isArray(queryKey) && queryKey.includes('live')) {
              return false;
            }
            if (Array.isArray(queryKey) && queryKey[0] === 'apps') {
              return false;
            }
            return query.state.status === 'success';
          },
        },
      }}
    >
      {children}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </PersistQueryClientProvider>
  );
}
