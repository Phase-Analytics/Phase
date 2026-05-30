'use client';

import type { ExploreQueryV1, ExploreResult } from '@phase/shared';
import { parseAsString, useQueryState } from 'nuqs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnalyticsTimeRangePicker } from '@/components/analytics/analytics-time-range-picker';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { defaultExploreQuery } from '@/components/explore/default-query';
import { ExplorePresetsSidebar } from '@/components/explore/explore-presets-sidebar';
import { ExploreQueryBuilder } from '@/components/explore/explore-query-builder';
import {
  type ExploreQueryDefinition,
  buildExploreRunQuery,
} from '@/components/explore/explore-query-utils';
import { ExploreResults } from '@/components/explore/explore-results';
import { RequireApp } from '@/components/require-app';
import { Card, CardContent } from '@/components/ui/card';
import { toExploreTimeRange } from '@/lib/analytics-time-range';
import { useExploreRun } from '@/lib/queries/use-explore';

export default function ExplorePage() {
  const [appId] = useQueryState('app', parseAsString);
  const [timeRange] = useQueryState('range', parseAsString.withDefault('7d'));
  const [query, setQuery] = useState<ExploreQueryDefinition>(defaultExploreQuery);
  const [result, setResult] = useState<ExploreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runExplore = useExploreRun();
  const hasRunRef = useRef(false);
  const queryRef = useRef(query);
  queryRef.current = query;

  const executeRun = useCallback(
    async (definition: ExploreQueryDefinition) => {
      if (!appId) {
        return;
      }

      setError(null);
      const runQuery = buildExploreRunQuery(
        definition,
        toExploreTimeRange(timeRange)
      );

      try {
        const response = await runExplore.mutateAsync({
          appId,
          query: runQuery,
        });
        setResult(response.result);
        hasRunRef.current = true;
      } catch (err) {
        setResult(null);
        setError(err instanceof Error ? err.message : 'Query failed');
      }
    },
    [appId, runExplore, timeRange]
  );

  const handleRun = useCallback(() => {
    void executeRun(query);
  }, [executeRun, query]);

  useEffect(() => {
    if (!hasRunRef.current || !appId) {
      return;
    }
    void executeRun(queryRef.current);
  }, [timeRange, appId, executeRun]);

  const handleLoadPreset = useCallback((presetQuery: ExploreQueryV1) => {
    setQuery({
      ...presetQuery,
      timeRange: toExploreTimeRange(timeRange),
    });
  }, [timeRange]);

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <DashboardPageHeader
          actions={<AnalyticsTimeRangePicker />}
          description="Build ad-hoc queries across users, events, and sessions"
          title="Explore"
        />

        <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          {appId ? (
            <ExplorePresetsSidebar
              appId={appId}
              currentQuery={query}
              onLoadQuery={handleLoadPreset}
              timeRange={toExploreTimeRange(timeRange)}
            />
          ) : null}

          <div className="flex min-w-0 flex-col gap-6">
            <Card className="py-0">
              <CardContent className="space-y-4 p-4">
                <div>
                  <h2 className="font-semibold text-muted-foreground text-sm uppercase">
                    Query builder
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Grain, filters, metric, and breakdown
                  </p>
                </div>
                <ExploreQueryBuilder
                  appId={appId ?? ''}
                  isRunning={runExplore.isPending}
                  onChange={setQuery}
                  onRun={handleRun}
                  query={query}
                />
              </CardContent>
            </Card>

            <Card className="py-0">
              <CardContent className="space-y-4 p-4">
                <div>
                  <h2 className="font-semibold text-muted-foreground text-sm uppercase">
                    Results
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Charts and tables for the current query
                  </p>
                </div>
                <ExploreResults
                  error={error}
                  isPending={runExplore.isPending}
                  result={result}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </RequireApp>
  );
}
