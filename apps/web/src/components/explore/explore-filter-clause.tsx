'use client';

import { Delete02Icon, UnfoldMoreIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ExploreFilter, PropertyOperator } from '@phase/shared';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type BuilderOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export const FILTER_TYPE_OPTIONS: BuilderOption[] = [
  { value: 'event_performed', label: 'Event performed' },
  { value: 'event_property', label: 'Event property' },
  { value: 'device', label: 'Device attribute' },
  { value: 'device_property', label: 'Device property' },
];

export const PERFORMED_OPTIONS: BuilderOption[] = [
  { value: 'true', label: 'performed' },
  { value: 'false', label: 'did not perform' },
];

export const DEVICE_FIELD_OPTIONS: BuilderOption[] = [
  { value: 'platform', label: 'platform' },
  { value: 'country', label: 'country' },
  { value: 'city', label: 'city' },
  { value: 'locale', label: 'locale' },
];

export const DEVICE_OPERATOR_OPTIONS: BuilderOption[] = [
  { value: 'eq', label: 'is' },
  { value: 'neq', label: 'is not' },
];

export const OPERATOR_OPTIONS: BuilderOption[] = [
  { value: 'eq', label: 'is' },
  { value: 'neq', label: 'is not' },
  { value: 'gt', label: '>' },
  { value: 'gte', label: '≥' },
  { value: 'lt', label: '<' },
  { value: 'lte', label: '≤' },
  { value: 'contains', label: 'contains' },
];

export function BuilderDropdown({
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
          className={cn(
            'h-8 justify-between gap-2 bg-background font-normal shadow-xs',
            className
          )}
          size="sm"
          type="button"
          variant="outline"
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <HugeiconsIcon
            className="size-3.5 shrink-0 opacity-50"
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

type ExploreFilterClauseProps = {
  filter: ExploreFilter;
  onChange: (filter: ExploreFilter) => void;
  onRemove: () => void;
  catalog?: {
    eventNames: string[];
    deviceFields: { platforms: string[]; countries: string[] };
  };
};

export function ExploreFilterClause({
  filter,
  onChange,
  onRemove,
  catalog,
}: ExploreFilterClauseProps) {
  return (
    <div className="flex flex-1 flex-wrap items-center gap-1.5 rounded-lg border border-dashed bg-background/80 px-2 py-1.5">
      <BuilderDropdown
        className="min-w-[140px]"
        onValueChange={(type) => {
          if (type === 'event_performed') {
            onChange({
              type: 'event_performed',
              eventName: catalog?.eventNames[0] ?? 'app_opened',
              performed: true,
            });
          } else if (type === 'event_property') {
            onChange({
              type: 'event_property',
              eventName: catalog?.eventNames[0] ?? 'app_opened',
              key: 'duration',
              operator: 'gt',
              value: 0,
            });
          } else if (type === 'device') {
            onChange({
              type: 'device',
              field: 'platform',
              operator: 'eq',
              value: catalog?.deviceFields.platforms[0] ?? 'ios',
            });
          } else {
            onChange({
              type: 'device_property',
              key: 'tier',
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
          <BuilderDropdown
            className="w-[130px]"
            onValueChange={(v) =>
              onChange({ ...filter, performed: v === 'true' })
            }
            options={PERFORMED_OPTIONS}
            value={filter.performed ? 'true' : 'false'}
          />
          <Input
            className="h-8 w-[min(200px,40vw)] font-mono text-xs"
            list="explore-event-names"
            onChange={(e) => onChange({ ...filter, eventName: e.target.value })}
            placeholder="event_name"
            value={filter.eventName}
          />
        </>
      )}

      {filter.type === 'event_property' && (
        <>
          <Input
            className="h-8 w-[min(140px,32vw)] font-mono text-xs"
            list="explore-event-names"
            onChange={(e) => onChange({ ...filter, eventName: e.target.value })}
            placeholder="event"
            value={filter.eventName}
          />
          <Input
            className="h-8 w-24 font-mono text-xs"
            onChange={(e) => onChange({ ...filter, key: e.target.value })}
            placeholder="key"
            value={filter.key}
          />
          <BuilderDropdown
            className="w-24"
            onValueChange={(v) =>
              onChange({ ...filter, operator: v as PropertyOperator })
            }
            options={OPERATOR_OPTIONS}
            value={filter.operator}
          />
          <Input
            className="h-8 w-24 font-mono text-xs"
            onChange={(e) =>
              onChange({
                ...filter,
                value: Number.isNaN(Number(e.target.value))
                  ? e.target.value
                  : Number(e.target.value),
              })
            }
            placeholder="value"
            value={String(filter.value ?? '')}
          />
        </>
      )}

      {filter.type === 'device' && (
        <>
          <BuilderDropdown
            className="w-28"
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
            className="w-24"
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
            className="h-8 w-28 font-mono text-xs"
            onChange={(e) => onChange({ ...filter, value: e.target.value })}
            value={filter.value}
          />
        </>
      )}

      {filter.type === 'device_property' && (
        <>
          <Input
            className="h-8 w-28 font-mono text-xs"
            onChange={(e) => onChange({ ...filter, key: e.target.value })}
            placeholder="key"
            value={filter.key}
          />
          <BuilderDropdown
            className="w-24"
            onValueChange={(v) =>
              onChange({ ...filter, operator: v as PropertyOperator })
            }
            options={OPERATOR_OPTIONS}
            value={filter.operator}
          />
          <Input
            className="h-8 w-28 font-mono text-xs"
            onChange={(e) =>
              onChange({
                ...filter,
                value: Number.isNaN(Number(e.target.value))
                  ? e.target.value
                  : Number(e.target.value),
              })
            }
            placeholder="value"
            value={String(filter.value ?? '')}
          />
        </>
      )}

      <Button
        className="size-8 shrink-0"
        onClick={onRemove}
        size="icon"
        type="button"
        variant="ghost"
      >
        <HugeiconsIcon className="size-3.5" icon={Delete02Icon} />
      </Button>

    </div>
  );
}
