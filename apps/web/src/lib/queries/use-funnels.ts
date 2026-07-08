import type {
  CreateFunnelDefinitionRequest,
  CustomFunnelRunRequest,
  FunnelDefinition,
  FunnelDefinitionsListResponse,
  FunnelResult,
  UpdateFunnelDefinitionRequest,
} from '@phase/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import { cacheConfig } from './query-client';
import { queryKeys } from './query-keys';

export function useActivationFunnel(
  appId: string,
  range?: { startDate?: string; endDate?: string }
) {
  return useQuery({
    queryKey: queryKeys.funnels.activation(appId, range),
    queryFn: () =>
      fetchApi<FunnelResult>(
        `/web/funnels/activation${buildQueryString({
          appId,
          startDate: range?.startDate,
          endDate: range?.endDate,
        })}`
      ),
    ...cacheConfig.overview,
    enabled: Boolean(appId),
  });
}

export function useFunnelPresets(appId: string) {
  return useQuery({
    queryKey: queryKeys.funnels.presets(appId),
    queryFn: () =>
      fetchApi<FunnelDefinitionsListResponse>(
        `/web/funnels/presets${buildQueryString({ appId })}`
      ),
    ...cacheConfig.list,
    enabled: Boolean(appId),
  });
}

export function useRunCustomFunnel() {
  return useMutation({
    mutationFn: (payload: CustomFunnelRunRequest) =>
      fetchApi<FunnelResult>('/web/funnels/run', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  });
}

export function useCreateFunnelPreset(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFunnelDefinitionRequest) =>
      fetchApi<FunnelDefinition>('/web/funnels/presets', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.funnels.presets(appId),
      });
    },
  });
}

export function useUpdateFunnelPreset(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: UpdateFunnelDefinitionRequest & { id: string }) =>
      fetchApi<FunnelDefinition>(`/web/funnels/presets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.funnels.presets(appId),
      });
    },
  });
}

export function useDeleteFunnelPreset(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      fetchApi<void>(`/web/funnels/presets/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.funnels.presets(appId),
      });
    },
  });
}
