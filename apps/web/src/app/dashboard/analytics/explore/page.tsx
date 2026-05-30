'use client';

import type { ExploreQueryV1, ExploreResult } from '@phase/shared';
import { parseAsString, useQueryState } from 'nuqs';
import { useCallback, useState } from 'react';
import { defaultExploreQuery } from '@/components/explore/default-query';
import { ExplorePresetsSidebar } from '@/components/explore/explore-presets-sidebar';
import { ExploreQueryBuilder } from '@/components/explore/explore-query-builder';
import { ExploreResults } from '@/components/explore/explore-results';
import { RequireApp } from '@/components/require-app';
import { useExploreRun } from '@/lib/queries/use-explore';

export default function ExplorePage() {
  const [appId] = useQueryState('app', parseAsString);
  const [query, setQuery] = useState<ExploreQueryV1>(defaultExploreQuery);
  const [result, setResult] = useState<ExploreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runExplore = useExploreRun();

  const handleRun = useCallback(async () => {
    if (!appId) {
      return;
    }
    setError(null);
    try {
      const response = await runExplore.mutateAsync({ appId, query });
      setResult(response.result);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Query failed');
    }
  }, [appId, query, runExplore]);

  return (
    <RequireApp>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-semibold text-2xl tracking-tight">Explore</h1>
          <p className="text-muted-foreground text-sm">
            Ad-hoc analytics across users, events, and sessions.
          </p>
        </div>

        <div className="grid min-h-[560px] gap-6 lg:grid-cols-[220px_1fr]">
          {appId ? (
            <ExplorePresetsSidebar
              appId={appId}
              currentQuery={query}
              onLoadQuery={setQuery}
            />
          ) : null}

          <div className="flex min-w-0 flex-col gap-6">
            <ExploreQueryBuilder
              appId={appId ?? ''}
              isRunning={runExplore.isPending}
              onChange={setQuery}
              onRun={handleRun}
              query={query}
            />

            <div className="rounded-lg border p-4">
              <p className="mb-3 font-medium text-sm">Results</p>
              <ExploreResults
                error={error}
                isPending={runExplore.isPending}
                result={result}
              />
            </div>
          </div>
        </div>
      </div>
    </RequireApp>
  );
}
