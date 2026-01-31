'use client';

import {
  Calendar04Icon,
  Download01Icon,
  Loading03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { format } from 'date-fns';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { downloadJson, getExportFileName } from '@/lib/utils/export-utils';

type ExportButtonProps<T> = {
  filePrefix: string;
  fetchData: (startDate: string, endDate: string) => Promise<T>;
  disabled?: boolean;
};

function normalizeStartOfDay(date: Date): string {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString();
}

function normalizeEndOfDay(date: Date): string {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized.toISOString();
}

export function ExportButton<T>({
  filePrefix,
  fetchData,
  disabled = false,
}: ExportButtonProps<T>) {
  const [isExporting, setIsExporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  async function handleExport() {
    if (!(dateRange?.from && dateRange?.to)) {
      toast.error('Please select a date range');
      return;
    }

    setIsExporting(true);

    try {
      const startDate = normalizeStartOfDay(dateRange.from);
      const endDate = normalizeEndOfDay(dateRange.to);

      const data = await fetchData(startDate, endDate);

      const rangeLabel = `${format(dateRange.from, 'yyyy-MM-dd')}_${format(dateRange.to, 'yyyy-MM-dd')}`;
      const filename = getExportFileName(filePrefix, rangeLabel);
      downloadJson(data, filename);
      toast.success('Export downloaded successfully');
      setIsOpen(false);
    } catch {
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  }

  function handleClear() {
    setDateRange(undefined);
  }

  const hasDateRange = dateRange?.from && dateRange?.to;

  const getButtonLabel = () => {
    if (hasDateRange && dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`;
    }
    return 'Export';
  };

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <Button
          className={hasDateRange ? 'shadow-[0_0_0_2px] shadow-primary/30' : ''}
          disabled={disabled || isExporting}
          size="sm"
          variant={hasDateRange ? 'default' : 'outline'}
        >
          {isExporting ? (
            <HugeiconsIcon
              className="size-4 animate-spin"
              icon={Loading03Icon}
            />
          ) : (
            <HugeiconsIcon className="size-4" icon={Download01Icon} />
          )}
          <span>{getButtonLabel()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <div className="flex items-center gap-2 border-b p-3">
          <HugeiconsIcon
            className="size-4 text-muted-foreground"
            icon={Calendar04Icon}
          />
          <span className="font-medium text-sm">
            Select date range to export
          </span>
        </div>
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
            disabled={!hasDateRange || isExporting}
            onClick={handleExport}
            size="sm"
            type="button"
          >
            {isExporting ? (
              <HugeiconsIcon
                className="size-4 animate-spin"
                icon={Loading03Icon}
              />
            ) : (
              <HugeiconsIcon className="size-4" icon={Download01Icon} />
            )}
            <span>Download</span>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
