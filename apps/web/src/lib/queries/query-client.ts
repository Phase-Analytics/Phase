import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api/client';

function shouldRetry(failureCount: number, error: Error): boolean {
  // Client errors (auth, access, not found, validation) won't succeed on retry.
  if (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  ) {
    return false;
  }
  return failureCount < 1;
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30_000),
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        staleTime: 30_000,
        gcTime: 20 * 60_000,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export const cacheConfig = {
  realtime: {
    staleTime: 0,
    gcTime: 5 * 60_000,
    refetchInterval: 15_000,
  },
  overview: {
    staleTime: 30_000,
    gcTime: 20 * 60_000,
  },
  list: {
    staleTime: 30_000,
    gcTime: 20 * 60_000,
  },
  detail: {
    staleTime: 30_000,
    gcTime: 20 * 60_000,
  },
  static: {
    staleTime: 30_000,
    gcTime: 40 * 60_000,
  },
  timeseries: {
    staleTime: 30_000,
    gcTime: 30 * 60_000,
  },
} as const;
