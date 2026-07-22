import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { AnalyticsProvider } from "@/lib/analytics";
import { queryClient } from "@/lib/api/query-client";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsProvider>{children}</AnalyticsProvider>
    </QueryClientProvider>
  );
}
