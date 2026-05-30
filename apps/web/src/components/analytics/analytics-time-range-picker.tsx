'use client';

import {
  Calendar03Icon,
  CheckmarkSquare01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ANALYTICS_TIME_RANGE_OPTIONS,
  getAnalyticsTimeRangeLabel,
  isAnalyticsTimeRange,
} from '@/lib/analytics-time-range';

type AnalyticsTimeRangePickerProps = {
  value?: string;
  onValueChange?: (value: string) => void;
};

export function AnalyticsTimeRangePicker({
  value: controlledValue,
  onValueChange,
}: AnalyticsTimeRangePickerProps = {}) {
  const [urlRange, setUrlRange] = useQueryState(
    'range',
    parseAsString.withDefault('7d')
  );

  const isControlled = controlledValue !== undefined && onValueChange !== undefined;
  const value = isControlled ? controlledValue : urlRange;
  const setValue = isControlled ? onValueChange : setUrlRange;

  const safeValue = isAnalyticsTimeRange(value) ? value : '7d';
  const currentLabel = getAnalyticsTimeRangeLabel(safeValue);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" type="button" variant="outline">
          <HugeiconsIcon icon={Calendar03Icon} />
          {currentLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ANALYTICS_TIME_RANGE_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setValue(option.value)}
          >
            <HugeiconsIcon
              className={
                safeValue === option.value ? 'opacity-100' : 'opacity-0'
              }
              icon={CheckmarkSquare01Icon}
            />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
