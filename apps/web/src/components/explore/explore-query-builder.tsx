'use client';

import { Add01Icon, PlayIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type {
  ExploreFilter,
  ExploreGrain,
  ExploreQueryV1,
} from '@phase/shared';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useExploreCatalog } from '@/lib/queries/use-explore';
import { BuilderDropdown, ExploreFilterClause } from './explore-filter-clause';
import type { ExploreQueryDefinition } from './explore-query-utils';

type ExploreQueryBuilderProps = {
  appId: string;
  query: ExploreQueryDefinition;
  onChange: (query: ExploreQueryDefinition) => void;
  onRun: () => void;
  isRunning: boolean;
};

const GRAIN_OPTIONS = [
  { value: 'users', label: 'devices' },
  { value: 'events', label: 'events' },
  { value: 'sessions', label: 'sessions' },
];

const METRIC_OPTIONS = [
  { value: 'count', label: 'Count' },
  { value: 'count_distinct_users', label: 'Count unique devices' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
  { value: 'sum', label: 'Sum' },
  { value: 'field_summary', label: 'Summarize field' },
  { value: 'sessions_per_user', label: 'Sessions per device' },
];

const BREAKDOWN_OPTIONS = [
  { value: 'none', label: 'No split' },
  { value: 'platform', label: 'Platform' },
  { value: 'country', label: 'Country' },
  { value: 'city', label: 'City' },
  { value: 'locale', label: 'Locale' },
  { value: 'country_platform', label: 'Country + platform' },
  { value: 'event_name', label: 'Event name' },
];

const GROUP_BY_OPTIONS = [
  { value: 'none', label: 'No grouping' },
  { value: 'day', label: 'Per day' },
];

function sectionLabel(text: string) {
  return (
    <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      {text}
    </p>
  );
}

export function ExploreQueryBuilder({
  appId,
  query,
  onChange,
  onRun,
  isRunning,
}: ExploreQueryBuilderProps) {
  const eventNameForCatalog = (() => {
    const performed = query.filters.find((f) => f.type === 'event_performed');
    if (performed) {
      return performed.eventName;
    }
    const field = query.metric.field;
    if (field?.kind === 'event_param') {
      return field.eventName;
    }
    return;
  })();

  const { data: catalog } = useExploreCatalog(appId, eventNameForCatalog);

  const update = (partial: Partial<ExploreQueryDefinition>) => {
    onChange({ ...query, ...partial });
  };

  const fieldOptions: Array<{ value: string; label: string }> = [];
  if (query.grain === 'sessions') {
    fieldOptions.push({ value: 'session_duration', label: 'session duration' });
  }
  if (query.grain === 'events') {
    for (const name of catalog?.eventNames ?? []) {
      fieldOptions.push({
        value: `${name}::duration`,
        label: `${name}.duration`,
      });
    }
  }

  const needsField =
    query.metric.aggregation === 'avg' ||
    query.metric.aggregation === 'min' ||
    query.metric.aggregation === 'max' ||
    query.metric.aggregation === 'sum' ||
    query.metric.aggregation === 'field_summary';

  const breakdownOptions = BREAKDOWN_OPTIONS.map((option) => ({
    ...option,
    disabled:
      (option.value === 'event_name' && query.grain !== 'events') ||
      (option.value === 'country_platform' &&
        query.grain !== 'users' &&
        query.grain !== 'sessions'),
  }));

  const breakdownValue =
    query.breakdown?.type === 'event_name'
      ? 'event_name'
      : query.breakdown?.type === 'device_pair'
        ? 'country_platform'
        : query.breakdown?.type === 'device'
          ? query.breakdown.field
          : 'none';

  const fieldValue =
    query.metric.field?.kind === 'session_duration'
      ? 'session_duration'
      : query.metric.field?.kind === 'event_param'
        ? `${query.metric.field.eventName}::${query.metric.field.paramKey}`
        : (fieldOptions[0]?.value ?? '');

  const showDayTrend =
    (query.grain === 'users' &&
      query.metric.aggregation === 'sessions_per_user') ||
    (query.grain === 'sessions' &&
      (query.metric.aggregation === 'count' ||
        (query.metric.aggregation === 'avg' &&
          query.metric.field?.kind === 'session_duration'))) ||
    (query.grain === 'events' && query.metric.aggregation === 'count');

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <section className="border-b bg-muted/25 px-4 py-3">
        {sectionLabel('Measure')}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <BuilderDropdown
            className="min-w-[160px]"
            onValueChange={(value) =>
              update({
                metric: {
                  ...query.metric,
                  aggregation: value as ExploreQueryV1['metric']['aggregation'],
                },
              })
            }
            options={METRIC_OPTIONS}
            value={query.metric.aggregation}
          />
          {needsField && fieldOptions.length > 0 ? (
            <>
              <span className="text-muted-foreground">of</span>
              <BuilderDropdown
                className="min-w-[200px] font-mono"
                onValueChange={(value) => {
                  if (value === 'session_duration') {
                    update({
                      metric: {
                        ...query.metric,
                        field: { kind: 'session_duration' },
                      },
                    });
                    return;
                  }
                  const [eventName, paramKey] = value.split('::');
                  update({
                    metric: {
                      ...query.metric,
                      field: {
                        kind: 'event_param',
                        eventName,
                        paramKey,
                      },
                    },
                  });
                }}
                options={fieldOptions}
                value={fieldValue}
              />
            </>
          ) : null}
          <span className="text-muted-foreground">across</span>
          <BuilderDropdown
            className="min-w-[120px]"
            onValueChange={(value) => {
              const grain = value as ExploreGrain;
              const next: Partial<ExploreQueryDefinition> = { grain };
              if (
                grain !== 'events' &&
                query.breakdown?.type === 'event_name'
              ) {
                next.breakdown = undefined;
              }
              if (
                grain !== 'users' &&
                query.metric.aggregation === 'sessions_per_user'
              ) {
                next.metric = { ...query.metric, aggregation: 'count' };
                next.groupBy = undefined;
              }
              if (
                grain !== 'sessions' &&
                query.metric.field?.kind === 'session_duration'
              ) {
                next.metric = { ...query.metric, field: undefined };
              }
              if (
                grain !== 'events' &&
                query.metric.field?.kind === 'event_param'
              ) {
                next.metric = { ...query.metric, field: undefined };
              }
              update(next);
            }}
            options={GRAIN_OPTIONS}
            value={query.grain}
          />
        </div>
      </section>

      <section className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          {sectionLabel('Where')}
          <Button onClick={addFilter} size="sm" type="button" variant="outline">
            <HugeiconsIcon className="size-3.5" icon={Add01Icon} />
            Add condition
          </Button>
        </div>

        <div className="mt-3 space-y-2">
          {query.filters.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 px-3 py-4" />
          ) : (
            query.filters.map((filter, index) => (
              <div
                className="flex flex-wrap items-start gap-2"
                key={`filter-${index}-${filter.type}`}
              >
                {index > 0 ? (
                  <span className="mt-2 rounded-md bg-muted px-2 py-0.5 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
                    and
                  </span>
                ) : null}
                <ExploreFilterClause
                  catalog={catalog}
                  filter={filter}
                  onChange={(next) => updateFilter(index, next)}
                  onRemove={() => removeFilter(index)}
                />
              </div>
            ))
          )}
        </div>
      </section>

      <section className="border-b px-4 py-3">
        {sectionLabel('Split & trend')}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Split by</span>
          <BuilderDropdown
            className="min-w-[140px]"
            onValueChange={(value) => {
              if (value === 'none') {
                update({ breakdown: undefined, groupBy: undefined });
                return;
              }
              if (value === 'event_name') {
                update({ breakdown: { type: 'event_name' } });
                return;
              }
              if (value === 'country_platform') {
                update({
                  breakdown: {
                    type: 'device_pair',
                    fields: ['country', 'platform'],
                  },
                });
                return;
              }
              update({
                breakdown: {
                  type: 'device',
                  field: value as 'platform' | 'country' | 'city' | 'locale',
                },
              });
            }}
            options={breakdownOptions}
            value={breakdownValue}
          />
          {showDayTrend ? (
            <>
              <span className="text-muted-foreground text-sm">Trend</span>
              <BuilderDropdown
                className="min-w-[130px]"
                onValueChange={(value) =>
                  update({
                    groupBy: value === 'day' ? 'day' : undefined,
                  })
                }
                options={GROUP_BY_OPTIONS}
                value={query.groupBy ?? 'none'}
              />
            </>
          ) : null}
        </div>
      </section>

      <footer className="flex justify-end bg-muted/15 px-4 py-3">
        <Button disabled={isRunning} onClick={onRun} type="button">
          {isRunning ? (
            <>
              <Spinner className="size-4" />
              Running
            </>
          ) : (
            <>
              <HugeiconsIcon className="size-4" icon={PlayIcon} />
              Run query
            </>
          )}
        </Button>
      </footer>

      {catalog?.eventNames.length ? (
        <datalist id="explore-event-names">
          {catalog.eventNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      ) : null}
    </div>
  );

  function addFilter() {
    update({
      filters: [
        ...query.filters,
        {
          type: 'event_performed',
          eventName: catalog?.eventNames[0] ?? 'app_opened',
          performed: true,
        },
      ],
    });
  }

  function updateFilter(index: number, filter: ExploreFilter) {
    const filters = [...query.filters];
    filters[index] = filter;
    update({ filters });
  }

  function removeFilter(index: number) {
    update({ filters: query.filters.filter((_, i) => i !== index) });
  }
}
