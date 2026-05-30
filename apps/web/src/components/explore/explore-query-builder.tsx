'use client';

import { Add01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type {
  ExploreBreakdown,
  ExploreFilter,
  ExploreGrain,
  ExploreQueryV1,
  ExploreTimeRange,
  PropertyOperator,
} from '@phase/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useExploreCatalog } from '@/lib/queries/use-explore';
import { cn } from '@/lib/utils';

type ExploreQueryBuilderProps = {
  appId: string;
  query: ExploreQueryV1;
  onChange: (query: ExploreQueryV1) => void;
  onRun: () => void;
  isRunning: boolean;
};

const TIME_RANGES: ExploreTimeRange[] = ['7d', '30d', '180d', '360d'];

const selectClassName =
  'flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

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
    return undefined;
  })();

  const { data: catalog } = useExploreCatalog(appId, eventNameForCatalog);

  const update = (partial: Partial<ExploreQueryV1>) => {
    onChange({ ...query, ...partial });
  };

  const addFilter = () => {
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
  };

  const updateFilter = (index: number, filter: ExploreFilter) => {
    const filters = [...query.filters];
    filters[index] = filter;
    update({ filters });
  };

  const removeFilter = (index: number) => {
    update({ filters: query.filters.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Grain">
          <select
            className={cn(selectClassName, 'w-[140px]')}
            onChange={(e) => update({ grain: e.target.value as ExploreGrain })}
            value={query.grain}
          >
            <option value="users">Users</option>
            <option value="events">Events</option>
            <option value="sessions">Sessions</option>
          </select>
        </Field>

        <Field label="Time range">
          <select
            className={cn(selectClassName, 'w-[140px]')}
            onChange={(e) =>
              update({ timeRange: e.target.value as ExploreTimeRange })
            }
            value={query.timeRange}
          >
            {TIME_RANGES.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Metric">
          <select
            className={cn(selectClassName, 'w-[180px]')}
            onChange={(e) =>
              update({
                metric: {
                  ...query.metric,
                  aggregation: e.target
                    .value as ExploreQueryV1['metric']['aggregation'],
                },
              })
            }
            value={query.metric.aggregation}
          >
            <option value="count">Count</option>
            <option value="count_distinct_users">Distinct users</option>
            <option value="avg">Average</option>
            <option value="min">Min</option>
            <option value="max">Max</option>
            <option value="sum">Sum</option>
            <option value="field_summary">Field summary</option>
            <option value="sessions_per_user">Sessions / user</option>
          </select>
        </Field>

        {(query.metric.aggregation === 'avg' ||
          query.metric.aggregation === 'min' ||
          query.metric.aggregation === 'max' ||
          query.metric.aggregation === 'sum' ||
          query.metric.aggregation === 'field_summary') && (
          <Field label="Field">
            <select
              className={cn(selectClassName, 'w-[220px]')}
              onChange={(e) => {
                if (e.target.value === 'session_duration') {
                  update({
                    metric: {
                      ...query.metric,
                      field: { kind: 'session_duration' },
                    },
                  });
                  return;
                }
                const [eventName, paramKey] = e.target.value.split('::');
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
              value={
                query.metric.field?.kind === 'session_duration'
                  ? 'session_duration'
                  : query.metric.field?.kind === 'event_param'
                    ? `${query.metric.field.eventName}::${query.metric.field.paramKey}`
                    : ''
              }
            >
              <option disabled value="">
                Select field
              </option>
              {query.grain === 'sessions' && (
                <option value="session_duration">Session duration</option>
              )}
              {query.grain === 'events' &&
                (catalog?.eventNames ?? []).map((name) => (
                  <option key={name} value={`${name}::duration`}>
                    {name}.duration
                  </option>
                ))}
            </select>
          </Field>
        )}

        <Field label="Breakdown">
          <select
            className={cn(selectClassName, 'w-[160px]')}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'none') {
                update({ breakdown: undefined });
                return;
              }
              if (value === 'event_name') {
                update({ breakdown: { type: 'event_name' } });
                return;
              }
              update({
                breakdown: {
                  type: 'device',
                  field: value as 'platform' | 'country' | 'city' | 'locale',
                },
              });
            }}
            value={
              query.breakdown?.type === 'event_name'
                ? 'event_name'
                : query.breakdown?.type === 'device'
                  ? query.breakdown.field
                  : 'none'
            }
          >
            <option value="none">None</option>
            <option value="platform">Platform</option>
            <option value="country">Country</option>
            <option value="city">City</option>
            <option value="locale">Locale</option>
            {query.grain === 'events' && (
              <option value="event_name">Event name</option>
            )}
          </select>
        </Field>

        {query.metric.aggregation === 'sessions_per_user' && (
          <Field label="Group by">
            <select
              className={cn(selectClassName, 'w-[120px]')}
              onChange={(e) =>
                update({
                  groupBy: e.target.value === 'day' ? 'day' : undefined,
                })
              }
              value={query.groupBy ?? 'none'}
            >
              <option value="none">None</option>
              <option value="day">Day</option>
            </select>
          </Field>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-medium text-sm">Filters</p>
          <Button onClick={addFilter} size="sm" type="button" variant="outline">
            <HugeiconsIcon className="size-4" icon={Add01Icon} />
            Add filter
          </Button>
        </div>

        {query.filters.length === 0 ? (
          <p className="text-muted-foreground text-sm">No filters applied.</p>
        ) : (
          <div className="space-y-2">
            {query.filters.map((filter, index) => (
              <FilterRow
                catalog={catalog}
                filter={filter}
                key={`${filter.type}-${index}`}
                onChange={(next) => updateFilter(index, next)}
                onRemove={() => removeFilter(index)}
              />
            ))}
          </div>
        )}
      </div>

      <Button disabled={isRunning} onClick={onRun} type="button">
        {isRunning ? 'Running...' : 'Run query'}
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      {children}
    </div>
  );
}

function FilterRow({
  filter,
  onChange,
  onRemove,
  catalog,
}: {
  filter: ExploreFilter;
  onChange: (filter: ExploreFilter) => void;
  onRemove: () => void;
  catalog?: {
    eventNames: string[];
    deviceFields: { platforms: string[]; countries: string[] };
  };
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
      <select
        className={cn(selectClassName, 'w-[160px]')}
        onChange={(e) => {
          const type = e.target.value;
          if (type === 'event_performed') {
            onChange({
              type: 'event_performed',
              eventName: catalog?.eventNames[0] ?? '',
              performed: true,
            });
          } else if (type === 'event_property') {
            onChange({
              type: 'event_property',
              eventName: catalog?.eventNames[0] ?? '',
              key: 'duration',
              operator: 'gt',
              value: 0,
            });
          } else if (type === 'device') {
            onChange({
              type: 'device',
              field: 'platform',
              operator: 'eq',
              value: 'ios',
            });
          } else {
            onChange({
              type: 'device_property',
              key: '',
              operator: 'eq',
              value: '',
            });
          }
        }}
        value={filter.type}
      >
        <option value="event_performed">Event performed</option>
        <option value="event_property">Event property</option>
        <option value="device">Device field</option>
        <option value="device_property">Device property</option>
      </select>

      {filter.type === 'event_performed' && (
        <>
          <Input
            className="w-[180px]"
            onChange={(e) =>
              onChange({ ...filter, eventName: e.target.value })
            }
            placeholder="Event name"
            value={filter.eventName}
          />
          <select
            className={cn(selectClassName, 'w-[120px]')}
            onChange={(e) =>
              onChange({ ...filter, performed: e.target.value === 'true' })
            }
            value={filter.performed ? 'true' : 'false'}
          >
            <option value="true">Performed</option>
            <option value="false">Not performed</option>
          </select>
        </>
      )}

      {filter.type === 'event_property' && (
        <>
          <Input
            className="w-[140px]"
            onChange={(e) =>
              onChange({ ...filter, eventName: e.target.value })
            }
            placeholder="Event"
            value={filter.eventName}
          />
          <Input
            className="w-[100px]"
            onChange={(e) => onChange({ ...filter, key: e.target.value })}
            placeholder="Key"
            value={filter.key}
          />
          <OperatorSelect
            onChange={(operator) => onChange({ ...filter, operator })}
            value={filter.operator}
          />
          <Input
            className="w-[100px]"
            onChange={(e) =>
              onChange({
                ...filter,
                value: Number.isNaN(Number(e.target.value))
                  ? e.target.value
                  : Number(e.target.value),
              })
            }
            placeholder="Value"
            value={String(filter.value ?? '')}
          />
        </>
      )}

      {filter.type === 'device' && (
        <>
          <select
            className={cn(selectClassName, 'w-[120px]')}
            onChange={(e) =>
              onChange({
                ...filter,
                field: e.target.value as typeof filter.field,
              })
            }
            value={filter.field}
          >
            <option value="platform">Platform</option>
            <option value="country">Country</option>
            <option value="city">City</option>
            <option value="locale">Locale</option>
          </select>
          <select
            className={cn(selectClassName, 'w-[100px]')}
            onChange={(e) =>
              onChange({
                ...filter,
                operator: e.target.value as 'eq' | 'neq',
              })
            }
            value={filter.operator}
          >
            <option value="eq">equals</option>
            <option value="neq">not equals</option>
          </select>
          <Input
            className="w-[120px]"
            onChange={(e) => onChange({ ...filter, value: e.target.value })}
            value={filter.value}
          />
        </>
      )}

      {filter.type === 'device_property' && (
        <>
          <Input
            className="w-[120px]"
            onChange={(e) => onChange({ ...filter, key: e.target.value })}
            placeholder="Key"
            value={filter.key}
          />
          <OperatorSelect
            onChange={(operator) => onChange({ ...filter, operator })}
            value={filter.operator}
          />
          <Input
            className="w-[120px]"
            onChange={(e) =>
              onChange({
                ...filter,
                value: Number.isNaN(Number(e.target.value))
                  ? e.target.value
                  : Number(e.target.value),
              })
            }
            placeholder="Value"
            value={String(filter.value ?? '')}
          />
        </>
      )}

      <Button onClick={onRemove} size="icon" type="button" variant="ghost">
        <HugeiconsIcon className="size-4" icon={Delete02Icon} />
      </Button>
    </div>
  );
}

function OperatorSelect({
  value,
  onChange,
}: {
  value: PropertyOperator;
  onChange: (value: PropertyOperator) => void;
}) {
  return (
    <select
      className={cn(selectClassName, 'w-[100px]')}
      onChange={(e) => onChange(e.target.value as PropertyOperator)}
      value={value}
    >
      <option value="eq">=</option>
      <option value="neq">!=</option>
      <option value="gt">&gt;</option>
      <option value="gte">&gt;=</option>
      <option value="lt">&lt;</option>
      <option value="lte">&lt;=</option>
      <option value="contains">contains</option>
    </select>
  );
}
