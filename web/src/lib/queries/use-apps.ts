import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api/client';
import type {
  AppCreated,
  AppDetail,
  AppKeysResponse,
  AppsListResponse,
  AppTeamResponse,
  CreateAppRequest,
  UpdateAppRequest,
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

export function useApp(appId: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: queryKeys.apps.detail(appId),
    queryFn: () => fetchApi<AppDetail>(`/web/apps/${appId}`),
    ...cacheConfig.detail,
    enabled: !!session && Boolean(appId),
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apps.all });
      toast.success(`App "${data.name}" created successfully!`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create app');
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
      toast.success('Application deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete application');
    },
  });
}

export function useRenameApp() {
  return useMutation({
    mutationFn: ({ appId, data }: { appId: string; data: UpdateAppRequest }) =>
      fetchApi<AppCreated>(`/web/apps/${appId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apps.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.apps.detail(variables.appId),
      });
      toast.success(`Application renamed to "${data.name}"`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to rename application');
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
      toast.success('API key rotated successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to rotate API key');
    },
  });
}
