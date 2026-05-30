'use client';

import {
  Add01Icon,
  Delete02Icon,
  UnfoldMoreIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type {
  ExploreFilter,
  ExploreGrain,
  ExploreQueryV1,
  PropertyOperator,
} from '@phase/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useExploreCatalog } from '@/lib/queries/use-explore';
import { cn } from '@/lib/utils';
import type { ExploreQueryDefinition } from './explore-query-utils';

type ExploreQueryBuilderProps = {
  appId: string;
  query: ExploreQueryDefinition;
  onChange: (query: ExploreQueryDefinition) => void;
  onRun: () => void;
  isRunning: boolean;
};

type BuilderOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

const GRAIN_OPTIONS: BuilderOption[] = [
  { value: 'users', label: 'Users' },
  { value: 'events', label: 'Events' },
  { value: 'sessions', label: 'Sessions' },
];

const METRIC_OPTIONS: BuilderOption[] = [
  { value: 'count', label: 'Count' },
  { value: 'count_distinct_users', label: 'Distinct users' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
  { value: 'sum', label: 'Sum' },
  { value: 'field_summary', label: 'Field summary' },
  { value: 'sessions_per_user', label: 'Sessions / user' },
];

const BREAKDOWN_OPTIONS: BuilderOption[] = [
  { value: 'none', label: 'None' },
  { value: 'platform', label: 'Platform' },
  { value: 'country', label: 'Country' },
  { value: 'city', label: 'City' },
  { value: 'locale', label: 'Locale' },
  { value: 'event_name', label: 'Event name' },
];

const GROUP_BY_OPTIONS: BuilderOption[] = [
  { value: 'none', label: 'None' },
  { value: 'day', label: 'Day' },
];

const FILTER_TYPE_OPTIONS: BuilderOption[] = [
  { value: 'event_performed', label: 'Event performed' },
  { value: 'event_property', label: 'Event property' },
  { value: 'device', label: 'Device field' },
  { value: 'device_property', label: 'Device property' },
];

const PERFORMED_OPTIONS: BuilderOption[] = [
  { value: 'true', label: 'Performed' },
  { value: 'false', label: 'Not performed' },
];

const DEVICE_FIELD_OPTIONS: BuilderOption[] = [
  { value: 'platform', label: 'Platform' },
  { value: 'country', label: 'Country' },
  { value: 'city', label: 'City' },
  { value: 'locale', label: 'Locale' },
];

const DEVICE_OPERATOR_OPTIONS: BuilderOption[] = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'not equals' },
];

const OPERATOR_OPTIONS: BuilderOption[] = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '!=' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '>=' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '<=' },
  { value: 'contains', label: 'contains' },
];

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

  const update = (partial: Partial<ExploreQueryDefinition>) => {
    onChange({ ...query, ...partial });
  };

  const fieldOptions: BuilderOption[] = [];
  if (query.grain === 'sessions') {
    fieldOptions.push({ value: 'session_duration', label: 'Session duration' });
  }
  if (query.grain === 'events') {
    for (const name of catalog?.eventNames ?? []) {
      fieldOptions.push({
        value: `${name}::duration`,
        label: `${name}.duration`,
      });
    }
  }

  const breakdownOptions = BREAKDOWN_OPTIONS.map((option) => ({
    ...option,
    disabled:
      option.value === 'event_name' && query.grain !== 'events',
  }));

  const breakdownValue =
    query.breakdown?.type === 'event_name'
      ? 'event_name'
      : query.breakdown?.type === 'device'
        ? query.breakdown.field
        : 'none';

  const fieldValue =
    query.metric.field?.kind === 'session_duration'
      ? 'session_duration'
      : query.metric.field?.kind === 'event_param'
        ? `${query.metric.field.eventName}::${query.metric.field.paramKey}`
        : fieldOptions[0]?.value ?? '';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Grain">
          <BuilderDropdown
            className="w-[140px]"
            onValueChange={(value) => update({ grain: value as ExploreGrain })}
            options={GRAIN_OPTIONS}
            value={query.grain}
          />
        </Field>

        <Field label="Metric">
          <BuilderDropdown
            className="w-[180px]"
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
        </Field>

        {(query.metric.aggregation === 'avg' ||
          query.metric.aggregation === 'min' ||
          query.metric.aggregation === 'max' ||
          query.metric.aggregation === 'sum' ||
          query.metric.aggregation === 'field_summary') &&
          fieldOptions.length > 0 && (
            <Field label="Field">
              <BuilderDropdown
                className="w-[220px]"
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
            </Field>
          )}

        <Field label="Breakdown">
          <BuilderDropdown
            className="w-[160px]"
            onValueChange={(value) => {
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
            options={breakdownOptions}
            value={breakdownValue}
          />
        </Field>

        {query.metric.aggregation === 'sessions_per_user' && (
          <Field label="Group by">
            <BuilderDropdown
              className="w-[120px]"
              onValueChange={(value) =>
                update({
                  groupBy: value === 'day' ? 'day' : undefined,
                })
              }
              options={GROUP_BY_OPTIONS}
              value={query.groupBy ?? 'none'}
            />
          </Field>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-muted-foreground text-sm uppercase">
            Filters
          </p>
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-medium text-muted-foreground text-xs">{label}</p>
      {children}
    </div>
  );
}

function BuilderDropdown({
  value,
  onValueChange,
  options,
  className,
  placeholder = 'Select',
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: BuilderOption[];
  className?: string;
  placeholder?: string;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn('h-9 justify-between gap-2 font-normal', className)}
          size="sm"
          type="button"
          variant="outline"
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <HugeiconsIcon
            className="size-4 shrink-0 opacity-50"
            icon={UnfoldMoreIcon}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
        {options.map((option) => (
          <DropdownMenuItem
            disabled={option.disabled}
            key={option.value}
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
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
      <BuilderDropdown
        className="w-[160px]"
        onValueChange={(type) => {
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
        options={FILTER_TYPE_OPTIONS}
        value={filter.type}
      />

      {filter.type === 'event_performed' && (
        <>
          <Input
            className="h-9 w-[180px]"
            onChange={(e) =>
              onChange({ ...filter, eventName: e.target.value })
            }
            placeholder="Event name"
            value={filter.eventName}
          />
          <BuilderDropdown
            className="w-[140px]"
            onValueChange={(v) =>
              onChange({ ...filter, performed: v === 'true' })
            }
            options={PERFORMED_OPTIONS}
            value={filter.performed ? 'true' : 'false'}
          />
        </>
      )}

      {filter.type === 'event_property' && (
        <>
          <Input
            className="h-9 w-[140px]"
            onChange={(e) =>
              onChange({ ...filter, eventName: e.target.value })
            }
            placeholder="Event"
            value={filter.eventName}
          />
          <Input
            className="h-9 w-[100px]"
            onChange={(e) => onChange({ ...filter, key: e.target.value })}
            placeholder="Key"
            value={filter.key}
          />
          <BuilderDropdown
            className="w-[100px]"
            onValueChange={(v) =>
              onChange({ ...filter, operator: v as PropertyOperator })
            }
            options={OPERATOR_OPTIONS}
            value={filter.operator}
          />
          <Input
            className="h-9 w-[100px]"
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
          <BuilderDropdown
            className="w-[120px]"
            onValueChange={(field) =>
              onChange({
                ...filter,
                field: field as typeof filter.field,
              })
            }
            options={DEVICE_FIELD_OPTIONS}
            value={filter.field}
          />
          <BuilderDropdown
            className="w-[110px]"
            onValueChange={(operator) =>
              onChange({
                ...filter,
                operator: operator as 'eq' | 'neq',
              })
            }
            options={DEVICE_OPERATOR_OPTIONS}
            value={filter.operator}
          />
          <Input
            className="h-9 w-[120px]"
            onChange={(e) => onChange({ ...filter, value: e.target.value })}
            value={filter.value}
          />
        </>
      )}

      {filter.type === 'device_property' && (
        <>
          <Input
            className="h-9 w-[120px]"
            onChange={(e) => onChange({ ...filter, key: e.target.value })}
            placeholder="Key"
            value={filter.key}
          />
          <BuilderDropdown
            className="w-[100px]"
            onValueChange={(v) =>
              onChange({ ...filter, operator: v as PropertyOperator })
            }
            options={OPERATOR_OPTIONS}
            value={filter.operator}
          />
          <Input
            className="h-9 w-[120px]"
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
