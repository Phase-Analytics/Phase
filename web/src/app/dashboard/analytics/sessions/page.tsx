'use client';

import { ChartDownIcon, ChartUpIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ColumnDef } from '@tanstack/react-table';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { RequireApp } from '@/components/require-app';
import { TimescaleChart } from '@/components/timescale-chart';
import { Card, CardContent } from '@/components/ui/card';
import { DataTableServer } from '@/components/ui/data-table-server';
import { Skeleton } from '@/components/ui/skeleton';
import type { Session, TimeRange } from '@/lib/api/types';
import {
  useSessionOverview,
  useSessions,
  useSessionTimeseries,
} from '@/lib/queries';
import { cn } from '@/lib/utils';

const formatDurationTable = (startedAt: string, lastActivityAt: string) => {
  const start = new Date(startedAt).getTime();
  const end = new Date(lastActivityAt).getTime();
  const seconds = Math.floor((end - start) / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const columns: ColumnDef<Session>[] = [
  {
    accessorKey: 'deviceId',
    header: 'User ID',
    size: 400,
    cell: ({ row }) => (
      <div
        className="max-w-xs truncate font-mono text-xs lg:max-w-sm"
        title={row.getValue('deviceId')}
      >
        {row.getValue('deviceId')}
      </div>
    ),
  },
  {
    accessorKey: 'startedAt',
    header: 'Date',
    size: 250,
    cell: ({ row }) => {
      const date = new Date(row.getValue('startedAt'));
      return (
        <div className="text-sm">
          {date.toLocaleDateString()}{' '}
          {date.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      );
    },
  },
  {
    accessorKey: 'lastActivityAt',
    header: 'Duration',
    size: 150,
    cell: ({ row }) => {
      const duration = formatDurationTable(
        row.original.startedAt,
        row.original.lastActivityAt
      );
      return <div className="text-sm">{duration}</div>;
    },
  },
];

export default function SessionsPage() {
  const [appId] = useQueryState('app', parseAsString);
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));
  const [pageSize] = useQueryState('pageSize', parseAsInteger.withDefault(10));
  const [search] = useQueryState('search', parseAsString.withDefault(''));
  const [timeRange, setTimeRange] = useQueryState(
    'range',
    parseAsString.withDefault('7d')
  );
  const [metric, setMetric] = useQueryState(
    'metric',
    parseAsString.withDefault('daily_sessions')
  );

  const { data: overview, isPending: overviewLoading } = useSessionOverview(
    appId || ''
  );
  const { data: sessionsData, isPending: sessionsLoading } = useSessions(
    appId || '',
    {
      page: page.toString(),
      pageSize: pageSize.toString(),
      deviceId: search || undefined,
    }
  );

  const { data: dailySessionsData, isPending: dailySessionsPending } =
    useSessionTimeseries(
      appId || '',
      timeRange as TimeRange,
      'daily_sessions',
      metric === 'daily_sessions'
    );
  const { data: avgDurationData, isPending: avgDurationPending } =
    useSessionTimeseries(
      appId || '',
      timeRange as TimeRange,
      'avg_duration',
      metric === 'avg_duration'
    );

  const timeseriesData =
    metric === 'daily_sessions' ? dailySessionsData : avgDurationData;
  const timeseriesPending =
    metric === 'daily_sessions' ? dailySessionsPending : avgDurationPending;

  const getChangeColor = (change: number) => {
    if (change === 0) {
      return 'text-muted-foreground';
    }
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds === 0) {
      return '0s';
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  const chartData = (() => {
    if (!(timeseriesData?.data && timeseriesData.period)) {
      return [];
    }

    const valueKey =
      metric === 'daily_sessions' ? 'dailySessions' : 'avgDuration';
    const dataMap = new Map(
      timeseriesData.data.map((item) => [item.date, item[valueKey] || 0])
    );

    const startDate = new Date(timeseriesData.period.startDate);
    const endDate = new Date(timeseriesData.period.endDate);
    const allDates: Array<{ date: string; value: number }> = [];

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      allDates.push({
        date: dateStr,
        value: dataMap.get(dateStr) || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return allDates;
  })();

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="font-bold text-2xl">Sessions</h1>
          <p className="text-muted-foreground text-sm">
            Track and analyze user sessions in your application
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="py-0">
            <CardContent className="p-4">
              {overviewLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">
                    Total Sessions
                  </p>
                  <p className="font-bold text-3xl">
                    {overview?.totalSessions.toLocaleString() || 0}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    {(overview?.totalSessionsChange24h || 0) !== 0 && (
                      <HugeiconsIcon
                        className={cn(
                          'size-3',
                          getChangeColor(overview?.totalSessionsChange24h || 0)
                        )}
                        icon={
                          (overview?.totalSessionsChange24h || 0) > 0
                            ? ChartUpIcon
                            : ChartDownIcon
                        }
                      />
                    )}
                    <span
                      className={cn(
                        'font-medium',
                        getChangeColor(overview?.totalSessionsChange24h || 0)
                      )}
                    >
                      {Math.abs(overview?.totalSessionsChange24h || 0)}%
                    </span>
                    <span className="text-muted-foreground">
                      from yesterday
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardContent className="p-4">
              {overviewLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">
                    Daily Sessions
                  </p>
                  <p className="font-bold text-3xl">
                    {overview?.activeSessions24h.toLocaleString() || 0}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    {(overview?.activeSessions24hChange || 0) !== 0 && (
                      <HugeiconsIcon
                        className={cn(
                          'size-3',
                          getChangeColor(overview?.activeSessions24hChange || 0)
                        )}
                        icon={
                          (overview?.activeSessions24hChange || 0) > 0
                            ? ChartUpIcon
                            : ChartDownIcon
                        }
                      />
                    )}
                    <span
                      className={cn(
                        'font-medium',
                        getChangeColor(overview?.activeSessions24hChange || 0)
                      )}
                    >
                      {Math.abs(overview?.activeSessions24hChange || 0)}%
                    </span>
                    <span className="text-muted-foreground">
                      from yesterday
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardContent className="p-4">
              {overviewLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">
                    Average Session Duration
                  </p>
                  <p className="font-bold text-3xl">
                    {formatDuration(overview?.averageSessionDuration || null)}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground">
                      Avg time per session
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {appId && (
          <TimescaleChart
            chartColor="var(--color-chart-2)"
            data={chartData}
            dataKey="value"
            dataLabel={
              metric === 'daily_sessions' ? 'Sessions' : 'Avg Duration'
            }
            description={
              metric === 'daily_sessions'
                ? 'Number of sessions started each day'
                : 'Average session duration in seconds per day'
            }
            isPending={timeseriesPending}
            metric={metric}
            metricOptions={[
              { value: 'daily_sessions', label: 'Daily Sessions' },
              { value: 'avg_duration', label: 'Average Duration' },
            ]}
            onMetricChange={setMetric}
            onTimeRangeChange={setTimeRange}
            timeRange={timeRange}
            timeRangeOptions={[
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '1 Month' },
              { value: '180d', label: '6 Months' },
              { value: '360d', label: '1 Year' },
            ]}
            title="Session Activity"
            valueFormatter={
              metric === 'avg_duration'
                ? (value) => {
                    const seconds = Math.floor(value);
                    if (seconds < 60) {
                      return `${seconds}s`;
                    }
                    if (seconds < 3600) {
                      const mins = Math.floor(seconds / 60);
                      const secs = seconds % 60;
                      return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
                    }
                    const hours = Math.floor(seconds / 3600);
                    const mins = Math.floor((seconds % 3600) / 60);
                    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                  }
                : undefined
            }
          />
        )}

        <Card className="py-0">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="font-semibold text-lg">All Sessions</h2>
              <p className="text-muted-foreground text-sm">
                Complete list of all sessions
              </p>
            </div>

            <DataTableServer
              columns={columns}
              data={sessionsData?.sessions || []}
              isLoading={sessionsLoading}
              pagination={
                sessionsData?.pagination || {
                  total: 0,
                  page: 1,
                  pageSize: 10,
                  totalPages: 0,
                }
              }
              searchKey="deviceId"
              searchPlaceholder="Search User ID"
            />
          </CardContent>
        </Card>
      </div>
    </RequireApp>
  );
}
