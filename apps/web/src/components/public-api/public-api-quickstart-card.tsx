import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Code, CodeBlock, CodeHeader } from '@/components/ui/code';
import type { CreatePublicApiTokenResponse } from '@/lib/api/types';

const API_BASE = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

type PublicApiQuickstartCardProps = {
  appId: string;
  createdToken?: CreatePublicApiTokenResponse | null;
};

export function PublicApiQuickstartCard({
  appId,
  createdToken,
}: PublicApiQuickstartCardProps) {
  const token = createdToken?.token || 'phase_pat_your_token';

  const eventsOverviewCurl = `curl -X GET "${API_BASE}/public-api/v1/apps/${appId}/reports/events/overview" \\
  -H "Authorization: Bearer ${token}"`;

  const sessionsTimeseriesCurl = `curl -X GET "${API_BASE}/public-api/v1/apps/${appId}/reports/sessions/timeseries?metric=sessionCount" \\
  -H "Authorization: Bearer ${token}"`;

  const devicesOverviewCurl = `curl -X GET "${API_BASE}/public-api/v1/apps/${appId}/reports/devices/overview" \\
  -H "Authorization: Bearer ${token}"`;

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-semibold text-sm">Quickstart</h3>
            <p className="text-muted-foreground text-sm">
              Use your token with the curated report endpoints below. If you
              just created a token, these examples use it for the current
              session.
            </p>
          </div>

          <Button asChild size="sm" type="button" variant="outline">
            <Link href="/docs/public-api/overview" target="_blank">
              Open docs
            </Link>
          </Button>
        </div>

        <div className="space-y-3">
          <Code code={eventsOverviewCurl}>
            <CodeHeader copyButton>Event overview</CodeHeader>
            <CodeBlock lang="bash" />
          </Code>

          <Code code={sessionsTimeseriesCurl}>
            <CodeHeader copyButton>Session timeseries</CodeHeader>
            <CodeBlock lang="bash" />
          </Code>

          <Code code={devicesOverviewCurl}>
            <CodeHeader copyButton>Device overview</CodeHeader>
            <CodeBlock lang="bash" />
          </Code>
        </div>

        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="font-medium text-sm">Notes</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-muted-foreground text-sm">
            <li>
              Public API tokens are read-only and separate from your SDK
              ingestion key.
            </li>
            <li>
              Device metrics remain device-based; they are not user metrics.
            </li>
            <li>
              Choose an expiration that matches how long the integration should
              stay active.
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
