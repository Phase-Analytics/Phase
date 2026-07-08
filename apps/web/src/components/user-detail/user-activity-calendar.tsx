'use client';

import {
  Calendar03Icon,
  PlaySquareIcon,
  Time03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import {
  type HeatmapBin,
  HeatmapCells,
  HeatmapChart,
  type HeatmapColumn,
  HeatmapInteractionBoundary,
  HeatmapInteractionProvider,
  HeatmapLegend,
  HeatmapTooltip,
  HeatmapXAxis,
  HeatmapYAxis,
} from '@/components/charts/heatmap';
import { ClientDate, ClientDuration } from '@/components/client-date';
import { Card, CardContent } from '@/components/ui/card';
import { useDeviceActivityTimeseries } from '@/lib/queries';
import { UserActivityCalendarSkeleton } from './user-detail-skeletons';

type UserActivityCalendarProps = {
  deviceId: string;
};

const LEVEL_STYLES = [
  { color: 'var(--chart-scale-01)', fillMode: 'solid' },
  { color: 'var(--chart-scale-02)', fillMode: 'solid' },
  { color: 'var(--chart-scale-03)', fillMode: 'solid' },
  { color: 'var(--chart-scale-04)', fillMode: 'solid' },
  { color: 'var(--chart-scale-05)', fillMode: 'solid' },
] as const;

function buildHeatmapColumns(
  sessionByDate: Map<string, number>,
  endDate: Date
): HeatmapColumn[] {
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);

  const columns: HeatmapColumn[] = [];
  const cursor = new Date(start);
  let columnIndex = 0;

  while (cursor <= end) {
    const bins: HeatmapBin[] = [];
    for (let day = 0; day < 7; day++) {
      const cellDate = new Date(cursor);
      cellDate.setDate(cursor.getDate() + day);
      cellDate.setHours(0, 0, 0, 0);

      const dateStr = cellDate.toISOString().slice(0, 10);
      const inRange = cellDate >= start && cellDate <= end;

      bins.push({
        bin: day,
        count: inRange ? (sessionByDate.get(dateStr) ?? 0) : 0,
        date: cellDate,
      });
    }

    columns.push({
      bin: columnIndex,
      bins,
    });

    cursor.setDate(cursor.getDate() + 7);
    columnIndex += 1;
  }

  return columns;
}

export function UserActivityCalendar({ deviceId }: UserActivityCalendarProps) {
  const [appId] = useQueryState('app', parseAsString);

  const { data, isPending } = useDeviceActivityTimeseries(
    deviceId,
    appId || ''
  );

  const heatmapData = useMemo(() => {
    const sessionByDate = new Map(
      (data?.data ?? []).map((item) => [item.date, item.sessionCount])
    );
    return buildHeatmapColumns(sessionByDate, new Date());
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
              <span className="tabular-nums">{data?.totalSessions ?? 0}</span>
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

        <div className="overflow-x-auto">
          <HeatmapInteractionProvider>
            <HeatmapInteractionBoundary className="min-w-[680px]">
              <HeatmapChart
                data={heatmapData}
                gap={3}
                layout="fluid"
                levelStyles={LEVEL_STYLES}
                margin={{ top: 20, right: 8, bottom: 0, left: 28 }}
                status="ready"
              >
                <HeatmapCells cornerRadius={2} />
                <HeatmapXAxis />
                <HeatmapYAxis labelFormat="initial" tickFilter="odd" />
                <HeatmapTooltip
                  formatLabel={(count) =>
                    count === 1 ? '1 Session' : `${count} Sessions`
                  }
                />
              </HeatmapChart>
              <div className="mt-3">
                <HeatmapLegend levelStyles={LEVEL_STYLES} />
              </div>
            </HeatmapInteractionBoundary>
          </HeatmapInteractionProvider>
        </div>
      </CardContent>
    </Card>
  );
}
