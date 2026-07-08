'use client';

import {
  Calendar03Icon,
  PlaySquareIcon,
  Time03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { ClientDate, ClientDuration } from '@/components/client-date';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDate } from '@/lib/date-utils';
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

function getSessionLabel(sessionCount: number): string {
  if (sessionCount === 0) {
    return 'No Sessions';
  }
  if (sessionCount === 1) {
    return 'Session';
  }
  return 'Sessions';
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

    for (let i = 364; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      days.push({
        date: dateStr,
        sessionCount: dataMap.get(dateStr) || 0,
        formattedDate: formatDate(dateStr),
      });
    }

    return days;
  }, [data]);

  if (isPending) {
    return <UserActivityCalendarSkeleton />;
  }

  return (
    <Card className="min-w-0 py-0">
      <CardContent className="min-w-0 space-y-4 p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-muted-foreground text-sm uppercase">
            Activity Calendar
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs uppercase">
              Total Sessions
            </p>
            <p className="mt-1 flex items-center gap-1.5 font-medium text-sm">
              <HugeiconsIcon
                className="size-4 text-muted-foreground"
                icon={PlaySquareIcon}
              />
              <span>{data?.totalSessions ?? 0}</span>
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">
              Avg Session Duration
            </p>
            <p className="mt-1 flex items-center gap-1.5 font-medium text-sm">
              <HugeiconsIcon
                className="size-4 text-muted-foreground"
                icon={Time03Icon}
              />
              <ClientDuration seconds={data?.avgSessionDuration ?? null} />
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs uppercase">
              First Seen
            </p>
            <p className="mt-1 flex items-center gap-1.5 font-medium text-sm">
              <HugeiconsIcon
                className="size-4 text-muted-foreground"
                icon={Calendar03Icon}
              />
              {data?.firstSeen ? (
                <ClientDate date={data.firstSeen} />
              ) : (
                <span>Unknown</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase">
              Last Activity
            </p>
            <p className="mt-1 flex items-center gap-1.5 font-medium text-sm">
              <HugeiconsIcon
                className="size-4 text-muted-foreground"
                icon={Calendar03Icon}
              />
              {data?.lastActivityAt ? (
                <ClientDate date={data.lastActivityAt} />
              ) : (
                <span>Never</span>
              )}
            </p>
          </div>
        </div>

        <TooltipProvider>
          <div className="overflow-x-auto">
            <div className="flex flex-wrap gap-1">
              {calendarData.map((day) => (
                <Tooltip key={day.date}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'size-3 cursor-pointer rounded-[2px] transition-colors',
                        getIntensityClass(day.sessionCount)
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent
                    className="border-border bg-background px-2.5 py-1.5 text-foreground"
                    side="top"
                  >
                    <div className="flex flex-col gap-1.5">
                      <span className="flex items-center gap-1.5">
                        <HugeiconsIcon
                          className="size-3.5"
                          icon={Calendar03Icon}
                        />
                        <span>{day.formattedDate}</span>
                      </span>
                      <div className="flex flex-col gap-0.5">
                        <div className="font-semibold text-base tabular-nums">
                          {day.sessionCount === 0 ? '0' : day.sessionCount}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {getSessionLabel(day.sessionCount)}
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </TooltipProvider>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Less</span>
          <div className="flex gap-1">
            <div className="size-3 rounded-[2px] bg-muted" />
            <div className="size-3 rounded-[2px] bg-chart-2/20" />
            <div className="size-3 rounded-[2px] bg-chart-2/40" />
            <div className="size-3 rounded-[2px] bg-chart-2/60" />
            <div className="size-3 rounded-[2px] bg-chart-2" />
          </div>
          <span className="text-muted-foreground">More</span>
        </div>
      </CardContent>
    </Card>
  );
}
