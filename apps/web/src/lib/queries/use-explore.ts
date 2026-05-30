import type {
  CreateExplorePresetRequest,
  ExploreCatalogResponse,
  ExploreGenerateQueryRequest,
  ExploreGenerateQueryResponse,
  ExplorePreset,
  ExplorePresetsListResponse,
  ExploreQueryV1,
  ExploreRunResponse,
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

export function useExploreGenerateQuery() {
  return useMutation({
    mutationFn: (payload: ExploreGenerateQueryRequest) =>
      fetchApi<ExploreGenerateQueryResponse>('/web/explore/generate-query', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

export function useExploreRun() {
  return useMutation({
    mutationFn: (payload: { appId: string; query: ExploreQueryV1 }) =>
      fetchApi<ExploreRunResponse>('/web/explore/run', {
        method: 'POST',
        body: JSON.stringify(payload),
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
