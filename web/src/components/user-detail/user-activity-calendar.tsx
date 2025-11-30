'use client';

import { Calendar03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDeviceActivityTimeseries } from '@/lib/queries';
import { cn } from '@/lib/utils';
import { UserActivityCalendarSkeleton } from './user-detail-skeletons';

type UserActivityCalendarProps = {
  deviceId: string;
};

type DayData = {
  date: string;
  sessionCount: number;
  formattedDate: string;
};

function getIntensityClass(sessionCount: number): string {
  if (sessionCount === 0) {
    return 'bg-muted hover:bg-muted/80';
  }
  if (sessionCount === 1) {
    return 'bg-chart-2/20 hover:bg-chart-2/30';
  }
  if (sessionCount === 2) {
    return 'bg-chart-2/40 hover:bg-chart-2/50';
  }
  if (sessionCount === 3) {
    return 'bg-chart-2/60 hover:bg-chart-2/70';
  }
  return 'bg-chart-2 hover:bg-chart-2/90';
}

export function UserActivityCalendar({ deviceId }: UserActivityCalendarProps) {
  const [appId] = useQueryState('app', parseAsString);

  const { data, isPending } = useDeviceActivityTimeseries(
    deviceId,
    appId || ''
  );

  const calendarData = useMemo<DayData[]>(() => {
    if (!data?.data) {
      return [];
    }

    const dataMap = new Map(
      data.data.map((item) => [item.date, item.sessionCount])
    );

    const days: DayData[] = [];
    const now = new Date();

    for (let i = 179; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      days.push({
        date: dateStr,
        sessionCount: dataMap.get(dateStr) || 0,
        formattedDate: date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      });
    }

    return days;
  }, [data]);

  if (isPending) {
    return <UserActivityCalendarSkeleton />;
  }

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">Activity Calendar</h2>
          <span className="text-muted-foreground text-sm">(Last 6 months)</span>
        </div>

        <TooltipProvider>
          <div className="flex flex-wrap gap-1">
            {calendarData.map((day) => (
              <Tooltip key={day.date}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'size-3 cursor-pointer rounded-sm transition-colors',
                      getIntensityClass(day.sessionCount)
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent
                  className="border-border bg-background p-3 text-foreground"
                  side="top"
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-1.5 font-mono text-muted-foreground text-xs">
                      <HugeiconsIcon
                        className="size-3.5"
                        icon={Calendar03Icon}
                      />
                      {day.formattedDate}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <div className="font-mono font-semibold text-base text-foreground tabular-nums">
                        {day.sessionCount === 0
                          ? 'No Sessions'
                          : `${day.sessionCount} Session${day.sessionCount > 1 ? 's' : ''}`}
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Less</span>
          <div className="flex gap-1">
            <div className="size-3 rounded-sm bg-muted" />
            <div className="size-3 rounded-sm bg-chart-2/20" />
            <div className="size-3 rounded-sm bg-chart-2/40" />
            <div className="size-3 rounded-sm bg-chart-2/60" />
            <div className="size-3 rounded-sm bg-chart-2" />
          </div>
          <span className="text-muted-foreground">More</span>
        </div>
      </CardContent>
    </Card>
  );
}
