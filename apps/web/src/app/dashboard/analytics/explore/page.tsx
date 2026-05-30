'use client';

import type {
  ExploreQueryV1,
  ExploreResult,
  ExploreRunMeta,
} from '@phase/shared';
import { parseAsString, useQueryState } from 'nuqs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnalyticsTimeRangePicker } from '@/components/analytics/analytics-time-range-picker';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { defaultExploreQuery } from '@/components/explore/default-query';
import { ExploreAiPrompt } from '@/components/explore/explore-ai-prompt';
import { ExplorePresetsSidebar } from '@/components/explore/explore-presets-sidebar';
import { ExploreQueryBuilder } from '@/components/explore/explore-query-builder';
import {
  buildExploreRunQuery,
  type ExploreQueryDefinition,
} from '@/components/explore/explore-query-utils';
import { ExploreResults } from '@/components/explore/explore-results';
import { RequireApp } from '@/components/require-app';
import { Card, CardContent } from '@/components/ui/card';
import { toExploreTimeRange } from '@/lib/analytics-time-range';
import { useExploreRun } from '@/lib/queries/use-explore';

export default function ExplorePage() {
  const [appId] = useQueryState('app', parseAsString);
  const [timeRange] = useQueryState('range', parseAsString.withDefault('7d'));
  const [query, setQuery] = useState<ExploreQueryDefinition>(() =>
    defaultExploreQuery()
  );
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [hasGeneratedQuery, setHasGeneratedQuery] = useState(false);
  const [result, setResult] = useState<ExploreResult | null>(null);
  const [runMeta, setRunMeta] = useState<ExploreRunMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { mutateAsync: runExploreQuery, isPending: isExploreRunning } =
    useExploreRun();
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
        const response = await runExploreQuery({
          appId,
          query: runQuery,
        });
        setResult(response.result);
        setRunMeta(response.meta);
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
    void executeRun(query);
  }, [executeRun, query]);

  useEffect(() => {
    if (!(hasRunRef.current && appId)) {
      return;
    }
    void executeRun(queryRef.current);
  }, [appId, timeRange, executeRun]);

  const handleLoadPreset = useCallback(
    (presetQuery: ExploreQueryV1) => {
      setQuery({
        ...presetQuery,
        timeRange: toExploreTimeRange(timeRange),
      });
      setHasGeneratedQuery(true);
      setAiSummary(null);
    },
    [timeRange]
  );

  const handleAiGenerated = useCallback(
    (payload: { query: ExploreQueryDefinition; summary: string }) => {
      setQuery({
        ...payload.query,
        timeRange: toExploreTimeRange(timeRange),
      });
      setAiSummary(payload.summary);
      setHasGeneratedQuery(true);
      setResult(null);
      setRunMeta(null);
      setError(null);
      hasRunRef.current = false;
    },
    [timeRange]
  );

  const showResults =
    Boolean(result) || isExploreRunning || Boolean(error);
  const showBuilder = hasGeneratedQuery;

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <DashboardPageHeader
          actions={<AnalyticsTimeRangePicker />}
          description="Build rules like a firewall query: measure, filter, split, run"
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

          <div className="flex min-w-0 flex-col gap-4">
            {appId ? (
              <ExploreAiPrompt appId={appId} onGenerated={handleAiGenerated} />
            ) : null}

            {showBuilder ? (
              <div className="space-y-2">
                {aiSummary ? (
                  <p className="text-muted-foreground text-sm">{aiSummary}</p>
                ) : null}
                <ExploreQueryBuilder
                  appId={appId ?? ''}
                  isRunning={isExploreRunning}
                  onChange={setQuery}
                  onRun={handleRun}
                  query={query}
                />
              </div>
            ) : null}

            {showResults ? (
              <Card className="py-0">
                <CardContent className="space-y-4 p-4">
                  <h2 className="font-semibold text-muted-foreground text-sm uppercase tracking-wide">
                    Results
                  </h2>
                  <ExploreResults
                    coverage={runMeta?.coverage}
                    error={error}
                    formatTimeseriesAsDuration={
                      query.grain === 'sessions' &&
                      query.metric.aggregation === 'avg' &&
                      query.metric.field?.kind === 'session_duration' &&
                      query.groupBy === 'day'
                    }
                    isPending={isExploreRunning}
                    result={result}
                  />
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </RequireApp>
  );
}
