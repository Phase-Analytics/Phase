import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { PublicApiCapabilitiesResponse } from '@/lib/api/types';

type PublicApiCapabilitiesCardProps = {
  capabilities?: PublicApiCapabilitiesResponse;
  isLoading?: boolean;
};

function CapabilityList({
  title,
  values,
}: {
  title: string;
  values: string[];
}) {
  if (values.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="font-medium text-sm">{title}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge className="rounded-full" key={value} variant="outline">
            {value}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function CapabilityDomainCard({
  title,
  reports,
  metrics,
  dimensions,
  filters,
}: {
  title: string;
  reports: string[];
  metrics: string[];
  dimensions?: string[];
  filters?: string[];
}) {
  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <div>
        <h4 className="font-medium text-sm">{title}</h4>
        <p className="mt-1 text-muted-foreground text-sm">
          Supported public report surface for this app.
        </p>
      </div>

      <CapabilityList title="Reports" values={reports} />
      <CapabilityList title="Metrics" values={metrics} />
      {dimensions ? (
        <CapabilityList title="Dimensions" values={dimensions} />
      ) : null}
      {filters ? <CapabilityList title="Filters" values={filters} /> : null}
    </div>
  );
}

export function PublicApiCapabilitiesCard({
  capabilities,
  isLoading,
}: PublicApiCapabilitiesCardProps) {
  if (isLoading) {
    return (
      <Card className="py-0">
        <CardContent className="space-y-4 p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!capabilities) {
    return (
      <Card className="py-0">
        <CardContent className="space-y-2 p-4">
          <h3 className="font-semibold text-sm">Capabilities</h3>
          <p className="text-muted-foreground text-sm">
            Select an application to inspect the supported Public API surface.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="py-0">
      <CardContent className="space-y-5 p-4">
        <div>
          <h3 className="font-semibold text-sm">Capabilities</h3>
          <p className="text-muted-foreground text-sm">
            Backend-driven support matrix for the current Public API MVP.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="font-medium text-sm">Identity model</p>
            <p className="mt-1 text-muted-foreground text-sm capitalize">
              {capabilities.identityModel}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="font-medium text-sm">Event retention</p>
            <p className="mt-1 text-muted-foreground text-sm">
              ~{capabilities.retention.eventsDaysApprox} days
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 sm:col-span-2">
            <p className="font-medium text-sm">Semantics</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Bounce rate: {capabilities.semantics.bounceRate}. Consistency:{' '}
              {capabilities.semantics.consistency}.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <CapabilityDomainCard
            dimensions={capabilities.domains.events.dimensions}
            filters={capabilities.domains.events.filters}
            metrics={capabilities.domains.events.metrics}
            reports={capabilities.domains.events.reports}
            title="Events"
          />
          <CapabilityDomainCard
            dimensions={capabilities.domains.sessions.dimensions}
            filters={capabilities.domains.sessions.filters}
            metrics={capabilities.domains.sessions.metrics}
            reports={capabilities.domains.sessions.reports}
            title="Sessions"
          />
          <CapabilityDomainCard
            dimensions={capabilities.domains.devices.dimensions}
            filters={capabilities.domains.devices.filters}
            metrics={capabilities.domains.devices.metrics}
            reports={capabilities.domains.devices.reports}
            title="Devices"
          />
        </div>

        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <p className="font-medium text-sm">Limits</p>
          <ul className="space-y-1 text-muted-foreground text-sm">
            <li>
              Max report range: {capabilities.limits.maxReportRangeDays} days
            </li>
            <li>Max breakdown rows: {capabilities.limits.maxBreakdownLimit}</li>
            <li>Max raw page size: {capabilities.limits.maxRawPageSize}</li>
          </ul>
        </div>

        <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
          <p className="font-medium text-sm">Known V1 limits</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground text-sm">
            <li>No event parameter filtering or breakdowns yet</li>
            <li>No funnels, retention, or cohort reports in V1</li>
            <li>
              Device metrics stay device-based; they are not renamed to users
            </li>
            <li>
              Current external MVP is reports-first, not a freeform query API
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
