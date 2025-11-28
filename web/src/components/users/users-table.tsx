'use client';

import {
  AndroidIcon,
  AppleIcon,
  BrowserIcon,
  ComputerPhoneSyncIcon,
  Flag02Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { Badge } from '@/components/ui/badge';
import { DataTableServer } from '@/components/ui/data-table-server';
import type { Device } from '@/lib/api/types';
import { formatDateTime } from '@/lib/date-utils';
import { useDevices } from '@/lib/queries';
import { usePaginationStore } from '@/stores/pagination-store';

function getPlatformIcon(platform: string) {
  switch (platform) {
    case 'android':
      return AndroidIcon;
    case 'ios':
      return AppleIcon;
    case 'web':
      return BrowserIcon;
    default:
      return Flag02Icon;
  }
}

function getPlatformLabel(platform: string) {
  switch (platform) {
    case 'android':
      return 'Android';
    case 'ios':
      return 'iOS';
    case 'web':
      return 'Web';
    default:
      return 'Unknown';
  }
}

function getCountryFlag(countryCode: string) {
  return String.fromCodePoint(
    ...[...countryCode.toUpperCase()].map(
      (char) => 0x1_f1_e6 - 65 + char.charCodeAt(0)
    )
  );
}

function getCountryLabel(countryCode: string) {
  return (
    new Intl.DisplayNames(['en'], {
      type: 'region',
    }).of(countryCode) || countryCode
  );
}

function getColumns(appId: string): ColumnDef<Device>[] {
  return [
    {
      accessorKey: 'deviceId',
      header: 'User ID',
      size: 300,
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
      accessorKey: 'identifier',
      header: 'Identifier',
      size: 250,
      cell: ({ row }) => {
        const identifier = row.getValue('identifier') as string | null;
        return (
          <div
            className="max-w-xs truncate lg:max-w-sm"
            title={identifier || 'Anonymous'}
          >
            {identifier ? (
              <span className="text-sm">{identifier}</span>
            ) : (
              <span className="text-muted-foreground text-sm">Anonymous</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'platform',
      header: 'Platform',
      size: 120,
      cell: ({ row }) => {
        const platform = row.getValue('platform') as string | null;

        return platform ? (
          <Badge
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
            variant="outline"
          >
            <HugeiconsIcon
              className="size-3.5"
              icon={getPlatformIcon(platform)}
            />
            {getPlatformLabel(platform)}
          </Badge>
        ) : (
          <Badge
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs"
            variant="outline"
          >
            <HugeiconsIcon className="size-3.5" icon={Flag02Icon} />
            Unknown
          </Badge>
        );
      },
    },
    {
      accessorKey: 'country',
      header: 'Country',
      size: 150,
      cell: ({ row }) => {
        const country = row.getValue('country') as string | null;

        if (!country) {
          return (
            <div className="flex items-center gap-2">
              <HugeiconsIcon
                className="size-3.5 text-muted-foreground"
                icon={Flag02Icon}
              />
              <span className="text-muted-foreground text-xs">Unknown</span>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <span className="text-base leading-none">
              {getCountryFlag(country)}
            </span>
            <span className="text-xs">{getCountryLabel(country)}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'firstSeen',
      header: 'First Seen',
      size: 200,
      cell: ({ row }) => {
        const timestamp = row.getValue('firstSeen') as string;
        return (
          <span className="text-muted-foreground text-xs">
            {formatDateTime(timestamp)}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      size: 50,
      minSize: 50,
      cell: ({ row }) => (
        <div className="flex h-full w-full items-center justify-center">
          <Link
            className="text-muted-foreground transition-colors hover:text-foreground"
            href={`/dashboard/analytics/users/${row.original.deviceId}?app=${appId}`}
          >
            <HugeiconsIcon className="size-4" icon={ViewIcon} />
          </Link>
        </div>
      ),
    },
  ];
}

export function UsersTable() {
  const [appId] = useQueryState('app', parseAsString);
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));
  const [search] = useQueryState('search', parseAsString.withDefault(''));
  const [filter] = useQueryState('filter', parseAsString.withDefault(''));

  const { pageSize } = usePaginationStore();

  const { data: devicesData, isLoading } = useDevices(appId || '', {
    page: page.toString(),
    pageSize: pageSize.toString(),
    identifier: search || undefined,
    platform: filter || undefined,
  });

  return (
    <DataTableServer
      columns={getColumns(appId || '')}
      data={devicesData?.devices || []}
      filterAllIcon={ComputerPhoneSyncIcon}
      filterKey="platform"
      filterOptions={[
        { label: 'Android', value: 'android', icon: AndroidIcon },
        { label: 'iOS', value: 'ios', icon: AppleIcon },
        { label: 'Web', value: 'web', icon: BrowserIcon },
      ]}
      filterPlaceholder="Platform"
      isLoading={isLoading}
      pagination={
        devicesData?.pagination || {
          total: 0,
          page: 1,
          pageSize: 5,
          totalPages: 0,
        }
      }
      searchKey="identifier"
      searchPlaceholder="Search UserID / Identifier"
    />
  );
}
