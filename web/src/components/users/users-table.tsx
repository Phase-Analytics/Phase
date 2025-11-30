'use client';

import {
  AndroidIcon,
  AppleIcon,
  BrowserIcon,
  ComputerPhoneSyncIcon,
  Flag02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
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

const columns: ColumnDef<Device>[] = [
  {
    accessorKey: 'deviceId',
    header: 'User ID',
    size: 350,
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
    accessorKey: 'platform',
    header: 'Platform',
    size: 120,
    cell: ({ row }) => {
      const platform = row.getValue('platform') as string | null;

      return platform ? (
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon
            className="size-3.5 text-muted-foreground"
            icon={getPlatformIcon(platform)}
          />
          <span className="text-sm">{getPlatformLabel(platform)}</span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon
            className="size-3.5 text-muted-foreground"
            icon={Flag02Icon}
          />
          <span className="text-sm">Unknown</span>
        </div>
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
          <div className="flex items-center gap-1.5">
            <HugeiconsIcon
              className="size-3.5 text-muted-foreground"
              icon={Flag02Icon}
            />
            <span className="text-sm">Unknown</span>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-1.5">
          <span className="text-base leading-none">
            {getCountryFlag(country)}
          </span>
          <span className="text-sm">{getCountryLabel(country)}</span>
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
];

export function UsersTable() {
  const router = useRouter();
  const [appId] = useQueryState('app', parseAsString);
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));
  const [_search] = useQueryState('search', parseAsString.withDefault(''));
  const [filter] = useQueryState('filter', parseAsString.withDefault(''));

  const { pageSize } = usePaginationStore();

  const { data: devicesData, isLoading } = useDevices(appId || '', {
    page: page.toString(),
    pageSize: pageSize.toString(),
    platform: filter || undefined,
  });

  return (
    <DataTableServer
      columns={columns}
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
      onRowClick={(row) => {
        router.push(`/dashboard/analytics/users/${row.deviceId}?app=${appId}`);
      }}
      pagination={
        devicesData?.pagination || {
          total: 0,
          page: 1,
          pageSize: 5,
          totalPages: 0,
        }
      }
      searchKey="deviceId"
      searchPlaceholder="Search User ID"
    />
  );
}
