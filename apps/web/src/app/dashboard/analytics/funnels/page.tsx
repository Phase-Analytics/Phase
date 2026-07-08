'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { CustomFunnelBuilder } from '@/components/funnels/custom-funnel-builder';
import {
  FunnelVisualization,
  FunnelVisualizationSkeleton,
} from '@/components/funnels/funnel-visualization';
import { RequireApp } from '@/components/require-app';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActivationFunnel } from '@/lib/queries';

function ActivationFunnelPanel({ appId }: { appId: string }) {
  const { data, isLoading } = useActivationFunnel(appId);

  if (isLoading) {
    return <FunnelVisualizationSkeleton />;
  }

  return (
    <FunnelVisualization
      description="First open → session → meaningful session (≥30s) → D1 return → D7 return"
      result={data}
      title="Activation"
    />
  );
}

export default function FunnelsPage() {
  const [appId] = useQueryState('app', parseAsString);

  return (
    <RequireApp>
      <div className="space-y-6">
        <DashboardPageHeader
          description="Measure conversion through activation and custom event paths"
          title="Funnels"
        />
        <Tabs defaultValue="activation">
          <TabsList className="w-full max-w-md">
            <TabsTrigger value="activation">Activation</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
          <TabsContent className="mt-4" value="activation">
            {appId ? <ActivationFunnelPanel appId={appId} /> : null}
          </TabsContent>
          <TabsContent className="mt-4" value="custom">
            {appId ? <CustomFunnelBuilder appId={appId} /> : null}
          </TabsContent>
        </Tabs>
      </div>
    </RequireApp>
  );
}
