import type {
  AppCreated,
  AppDetailResponse,
  AppsListResponse,
  CreateAppRequest,
} from "@phase/shared";
import { useMutation, useQuery } from "@tanstack/react-query";

import { fetchApi } from "@/lib/api/client";
import { cacheConfig, getQueryClient } from "@/lib/api/query-client";
import { queryKeys } from "@/lib/api/query-keys";
import { useSession } from "@/lib/auth-client";

export function useApps() {
  const { data: session } = useSession();

  return useQuery({
    queryKey: queryKeys.apps.list(),
    queryFn: () => fetchApi<AppsListResponse>("/web/apps"),
    ...cacheConfig.static,
    enabled: Boolean(session),
  });
}

export function useApp(appId: string) {
  const { data: session } = useSession();

  return useQuery({
    queryKey: queryKeys.apps.detail(appId),
    queryFn: () => fetchApi<AppDetailResponse>(`/web/apps/${appId}`),
    ...cacheConfig.detail,
    enabled: Boolean(session) && Boolean(appId),
  });
}

export function useCreateApp() {
  return useMutation({
    mutationFn: (data: CreateAppRequest) =>
      fetchApi<AppCreated>("/web/apps", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      getQueryClient().invalidateQueries({ queryKey: queryKeys.apps.all });
    },
  });
}
