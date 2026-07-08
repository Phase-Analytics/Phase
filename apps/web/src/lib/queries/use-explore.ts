import type {
  CreateExplorePresetRequest,
  ExploreCatalogResponse,
  ExplorePreset,
  ExplorePresetsListResponse,
  ExploreRunResponse,
  ExploreSqlQuery,
  ExploreTimeRange,
  UpdateExplorePresetRequest,
} from '@phase/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import { cacheConfig } from './query-client';
import { queryKeys } from './query-keys';

export function useExplorePresets(appId: string) {
  return useQuery({
    queryKey: queryKeys.explore.presets(appId),
    queryFn: () =>
      fetchApi<ExplorePresetsListResponse>(
        `/web/explore/presets${buildQueryString({ appId })}`
      ),
    ...cacheConfig.list,
    enabled: Boolean(appId),
  });
}

export function useExploreCatalog(appId: string, eventName?: string) {
  return useQuery({
    queryKey: queryKeys.explore.catalog(appId, eventName),
    queryFn: () =>
      fetchApi<ExploreCatalogResponse>(
        `/web/explore/catalog${buildQueryString({ appId, eventName })}`
      ),
    ...cacheConfig.list,
    enabled: Boolean(appId),
  });
}

export function useExploreRun() {
  return useMutation({
    mutationFn: (payload: {
      appId: string;
      query: ExploreSqlQuery;
      timeRange: ExploreTimeRange;
      page?: number;
    }) =>
      fetchApi<ExploreRunResponse>('/web/explore/run', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          page: payload.page ?? 1,
        }),
      }),
  });
}

export function useCreateExplorePreset(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateExplorePresetRequest) =>
      fetchApi<ExplorePreset>('/web/explore/presets', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.explore.presets(appId),
      });
    },
  });
}

export function useUpdateExplorePreset(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: UpdateExplorePresetRequest & { id: string }) =>
      fetchApi<ExplorePreset>(`/web/explore/presets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.explore.presets(appId),
      });
    },
  });
}

export function useDeleteExplorePreset(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<void>(`/web/explore/presets/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.explore.presets(appId),
      });
    },
  });
}
