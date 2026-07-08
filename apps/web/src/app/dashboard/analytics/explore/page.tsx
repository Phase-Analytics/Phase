'use client';

import type {
  ExploreResult,
  ExploreRunMeta,
  ExploreSqlQuery,
} from '@phase/shared';
import { parseAsString, useQueryState } from 'nuqs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnalyticsTimeRangePicker } from '@/components/analytics/analytics-time-range-picker';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { defaultExploreSqlQuery } from '@/components/explore/default-sql';
import { ExplorePresetsSection } from '@/components/explore/explore-presets-section';
import { ExploreResults } from '@/components/explore/explore-results';
import { ExploreSqlEditor } from '@/components/explore/explore-sql-editor';
import { RequireApp } from '@/components/require-app';
import { Card, CardContent } from '@/components/ui/card';
import { toExploreTimeRange } from '@/lib/analytics-time-range';
import { ignorePromiseRejection } from '@/lib/ignore-promise-rejection';
import { useExploreRun } from '@/lib/queries/use-explore';

export default function ExplorePage() {
  const [appId] = useQueryState('app', parseAsString);
  const [timeRange] = useQueryState('range', parseAsString.withDefault('7d'));
  const [query, setQuery] = useState<ExploreSqlQuery>(() =>
    defaultExploreSqlQuery()
  );
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ExploreResult | null>(null);
  const [runMeta, setRunMeta] = useState<ExploreRunMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync: runExploreQuery, isPending: isExploreRunning } =
    useExploreRun();
  const hasRunRef = useRef(false);
  const queryRef = useRef(query);
  const pageRef = useRef(page);
  queryRef.current = query;
  pageRef.current = page;

  const executeRun = useCallback(
    async (nextQuery: ExploreSqlQuery, nextPage: number) => {
      if (!appId) {
        return;
      }

      setError(null);

      try {
        const response = await runExploreQuery({
          appId,
          query: nextQuery,
          timeRange: toExploreTimeRange(timeRange),
          page: nextPage,
        });
        setResult(response.result);
        setRunMeta(response.meta);
        setPage(response.meta.page);
        hasRunRef.current = true;
      } catch (err) {
        setResult(null);
        setRunMeta(null);
        setError(err instanceof Error ? err.message : 'Query failed');
      }
    },
    [appId, runExploreQuery, timeRange]
  );

  const handleRun = useCallback(() => {
    setPage(1);
    executeRun(query, 1).catch(ignorePromiseRejection);
  }, [executeRun, query]);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      setPage(nextPage);
      executeRun(queryRef.current, nextPage).catch(ignorePromiseRejection);
    },
    [executeRun]
  );

  useEffect(() => {
    if (!(hasRunRef.current && appId)) {
      return;
    }
    setPage(1);
    executeRun(queryRef.current, 1).catch(ignorePromiseRejection);
  }, [appId, executeRun, timeRange]);

  const handleLoadPreset = useCallback((presetQuery: ExploreSqlQuery) => {
    setQuery(presetQuery);
    setResult(null);
    setRunMeta(null);
    setError(null);
    setPage(1);
    hasRunRef.current = false;
  }, []);

  const handleQueryChange = useCallback((nextQuery: ExploreSqlQuery) => {
    setQuery(nextQuery);
    hasRunRef.current = false;
  }, []);

  const showResults = Boolean(result) || isExploreRunning || Boolean(error);

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <DashboardPageHeader
          actions={<AnalyticsTimeRangePicker />}
          description="Write read-only SQL against events, devices, and sessions"
          title="Explore"
        />

        <div className="flex min-w-0 flex-col gap-4">
          {appId ? (
            <ExplorePresetsSection
              appId={appId}
              currentQuery={query}
              onLoadQuery={handleLoadPreset}
            />
          ) : null}

          <ExploreSqlEditor
            isRunning={isExploreRunning}
            onChange={handleQueryChange}
            onRun={handleRun}
            query={query}
          />

          {showResults ? (
            <Card className="py-0">
              <CardContent className="space-y-4 p-4">
                <h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
                  Results
                </h2>
                <ExploreResults
                  error={error}
                  isPending={isExploreRunning}
                  meta={runMeta}
                  onPageChange={handlePageChange}
                  result={result}
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </RequireApp>
  );
}
