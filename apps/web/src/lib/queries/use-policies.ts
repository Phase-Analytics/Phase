import type {
  CreatePolicyRequest,
  PoliciesListResponse,
  PolicyDetail,
  PolicySlugAvailableResponseSchema,
  UpdatePolicyRequest,
} from '@phase/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';
import { buildQueryString, fetchApi } from '@/lib/api/client';
import { cacheConfig } from './query-client';
import { queryKeys } from './query-keys';

type PolicySlugAvailableResponse = z.infer<
  typeof PolicySlugAvailableResponseSchema
>;

export function usePolicies(appId: string) {
  return useQuery({
    queryKey: queryKeys.policies.list(appId),
    queryFn: () =>
      fetchApi<PoliciesListResponse>(
        `/web/policies${buildQueryString({ appId })}`
      ),
    ...cacheConfig.list,
    enabled: Boolean(appId),
  });
}

export function usePolicy(appId: string, policyId: string) {
  return useQuery({
    queryKey: queryKeys.policies.detail(appId, policyId),
    queryFn: () =>
      fetchApi<PolicyDetail>(
        `/web/policies/${policyId}${buildQueryString({ appId })}`
      ),
    ...cacheConfig.detail,
    enabled: Boolean(appId) && Boolean(policyId),
  });
}

type PolicySlugAvailabilityOptions = {
  appId: string;
  slug: string;
  domainId: string | null;
  enabled: boolean;
  excludePolicyId?: string;
};

export function usePolicySlugAvailable({
  appId,
  slug,
  domainId,
  enabled,
  excludePolicyId,
}: PolicySlugAvailabilityOptions) {
  return useQuery({
    queryKey: queryKeys.policies.slugAvailable(slug, domainId, excludePolicyId),
    queryFn: () =>
      fetchApi<PolicySlugAvailableResponse>(
        `/web/policies/slug-available${buildQueryString({
          appId,
          slug,
          domainId: domainId ?? undefined,
          excludePolicyId,
        })}`
      ),
    enabled: enabled && Boolean(appId) && slug.length >= 3,
    staleTime: 10_000,
  });
}

export function useCreatePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePolicyRequest) =>
      fetchApi<PolicyDetail>('/web/policies', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.policies.list(variables.appId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.list(variables.appId),
      });
    },
  });
}

export function useUpdatePolicy(appId: string, policyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePolicyRequest) =>
      fetchApi<PolicyDetail>(
        `/web/policies/${policyId}${buildQueryString({ appId })}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }
      ),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.policies.list(appId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.policies.detail(appId, policyId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.list(appId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.detail(appId, data.linkId),
      });
    },
  });
}

export function useDeletePolicy(appId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (policyId: string) =>
      fetchApi<{ success: boolean }>(
        `/web/policies/${policyId}${buildQueryString({ appId })}`,
        { method: 'DELETE' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.policies.list(appId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.links.list(appId),
      });
    },
  });
}
