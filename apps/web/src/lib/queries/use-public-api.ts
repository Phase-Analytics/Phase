'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api/client';
import type {
  CreatePublicApiTokenRequest,
  CreatePublicApiTokenResponse,
  PublicApiToken,
} from '@/lib/api/types';
import { useSession } from '@/lib/auth';
import { cacheConfig, getQueryClient } from './query-client';
import { queryKeys } from './query-keys';

type PublicApiTokensResponse = {
  tokens: PublicApiToken[];
};

export function usePublicApiTokens(appId: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: queryKeys.apps.publicApiTokens(appId),
    queryFn: () =>
      fetchApi<PublicApiTokensResponse>(`/web/apps/${appId}/public-api/tokens`),
    ...cacheConfig.static,
    refetchOnMount: false,
    enabled: !!session && Boolean(appId),
  });
}

export function useCreatePublicApiToken() {
  return useMutation({
    mutationFn: ({
      appId,
      data,
    }: {
      appId: string;
      data: CreatePublicApiTokenRequest;
    }) =>
      fetchApi<CreatePublicApiTokenResponse>(
        `/web/apps/${appId}/public-api/tokens`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      ),
    onSuccess: (_, variables) => {
      const queryClient = getQueryClient();
      queryClient.invalidateQueries({
        queryKey: queryKeys.apps.publicApiTokens(variables.appId),
      });
      toast.success('API key created');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create API key');
    },
  });
}

export function useRevokePublicApiToken() {
  return useMutation({
    mutationFn: ({ appId, tokenId }: { appId: string; tokenId: string }) =>
      fetchApi<void>(`/web/apps/${appId}/public-api/tokens/${tokenId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      const queryClient = getQueryClient();
      queryClient.invalidateQueries({
        queryKey: queryKeys.apps.publicApiTokens(variables.appId),
      });
      toast.success('API key revoked');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to revoke API key');
    },
  });
}
