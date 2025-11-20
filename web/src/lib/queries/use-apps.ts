import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api/client';
import type {
  AppCreated,
  AppKeysResponse,
  AppsListResponse,
  AppTeamResponse,
  CreateAppRequest,
} from '@/lib/api/types';
import { useSession } from '@/lib/auth';
import { cacheConfig, queryClient } from './query-client';
import { queryKeys } from './query-keys';

export function useApps() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: queryKeys.apps.list(),
    queryFn: () => fetchApi<AppsListResponse>('/web/apps'),
    ...cacheConfig.static,
    enabled: !!session,
  });
}

export function useAppKeys(appId: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: queryKeys.apps.keys(appId),
    queryFn: () => fetchApi<AppKeysResponse>(`/web/apps/${appId}/keys`),
    ...cacheConfig.static,
    enabled: !!session && Boolean(appId),
  });
}

export function useAppTeam(appId: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: queryKeys.apps.team(appId),
    queryFn: () => fetchApi<AppTeamResponse>(`/web/apps/${appId}/team`),
    ...cacheConfig.detail,
    enabled: !!session && Boolean(appId),
  });
}

export function useCreateApp() {
  return useMutation({
    mutationFn: (data: CreateAppRequest) =>
      fetchApi<AppCreated>('/web/apps', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apps.all });
    },
  });
}

export function useDeleteApp() {
  return useMutation({
    mutationFn: (appId: string) =>
      fetchApi<void>(`/web/apps/${appId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apps.all });
    },
  });
}

export function useRotateAppKey() {
  return useMutation({
    mutationFn: (appId: string) =>
      fetchApi<AppKeysResponse>(`/web/apps/${appId}/keys/rotate`, {
        method: 'POST',
      }),
    onSuccess: (_, appId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apps.keys(appId) });
    },
  });
}
