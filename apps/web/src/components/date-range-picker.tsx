'use client';

import { Calendar04Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type DateRangePickerProps = {
  startDate?: string;
  endDate?: string;
  onDateRangeChange: (startDate: string | null, endDate: string | null) => void;
  isLoading?: boolean;
};

export function DateRangePicker({
  startDate,
  endDate,
  onDateRangeChange,
  isLoading = false,
}: DateRangePickerProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (startDate && endDate) {
      setDateRange({
        from: new Date(startDate),
        to: new Date(endDate),
      });
    } else {
      setDateRange(undefined);
    }
  }, [startDate, endDate]);

  const handleApply = () => {
    if (dateRange?.from && dateRange?.to) {
      const normalizedStart = new Date(dateRange.from);
      normalizedStart.setHours(0, 0, 0, 0);

      const normalizedEnd = new Date(dateRange.to);
      normalizedEnd.setHours(23, 59, 59, 999);

      onDateRangeChange(
        normalizedStart.toISOString(),
        normalizedEnd.toISOString()
      );
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    setDateRange(undefined);
    onDateRangeChange(null, null);
    setIsOpen(false);
  };

  const getButtonLabel = () => {
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;
    }
    return 'Date Range';
  };

  const hasDateRange = dateRange?.from && dateRange?.to;

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <Button
          className={`w-full flex-shrink-0 sm:w-auto ${hasDateRange ? 'shadow-[0_0_0_2px] shadow-primary/30' : ''}`}
          disabled={isLoading}
          size="sm"
          variant={hasDateRange ? 'default' : 'outline'}
        >
          <HugeiconsIcon icon={Calendar04Icon} />
          <span className="hidden sm:inline">{getButtonLabel()}</span>
          <span className="sm:hidden">{hasDateRange ? 'Date' : 'Range'}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          className="rounded-lg"
          defaultMonth={dateRange?.from}
          mode="range"
          onSelect={setDateRange}
          selected={dateRange}
        />
        <div className="flex items-center gap-2 border-t p-3">
          <Button
            className="flex-1"
            disabled={!hasDateRange}
            onClick={handleClear}
            size="sm"
            type="button"
            variant="outline"
          >
            Clear
          </Button>
          <Button
            className="flex-1"
            disabled={!hasDateRange}
            onClick={handleApply}
            size="sm"
            type="button"
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
