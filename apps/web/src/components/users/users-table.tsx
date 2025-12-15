'use client';

import {
  AndroidIcon,
  AnonymousIcon,
  AppleIcon,
  Calendar03Icon,
  ComputerPhoneSyncIcon,
  Flag02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ColumnDef } from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import 'flag-icons/css/flag-icons.min.css';
import { ClientDate } from '@/components/client-date';
import { DataTableServer } from '@/components/ui/data-table-server';
import { getGeneratedName, UserAvatar } from '@/components/user-profile';
import type { DeviceListItem } from '@/lib/api/types';
import { useDevices } from '@/lib/queries';
import { usePaginationStore } from '@/stores/pagination-store';

const COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

function getPlatformIcon(platform: string) {
  switch (platform) {
    case 'android':
      return AndroidIcon;
    case 'ios':
      return AppleIcon;
    default:
      return AnonymousIcon;
  }
}

function getPlatformLabel(platform: string) {
  switch (platform) {
    case 'android':
      return 'Android';
    case 'ios':
      return 'iOS';
    default:
      return 'Unknown';
  }
}

function getCountryLabel(countryCode: string) {
  return (
    new Intl.DisplayNames(['en'], {
      type: 'region',
    }).of(countryCode) || countryCode
  );
}

const columns: ColumnDef<DeviceListItem>[] = [
  {
    accessorKey: 'deviceId',
    header: 'User',
    size: 350,
    cell: ({ row }) => {
      const deviceId = row.getValue('deviceId') as string;
      const generatedName = getGeneratedName(deviceId);
      return (
        <div
          className="flex max-w-xs items-center gap-2 lg:max-w-sm"
          title={deviceId}
        >
          <UserAvatar seed={deviceId} size={20} />
          <span className="truncate text-sm">{generatedName}</span>
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
            icon={AnonymousIcon}
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

      return (
        <div className="flex items-center gap-1.5">
          {!country ||
          country.length !== 2 ||
          !COUNTRY_CODE_REGEX.test(country) ? (
            <HugeiconsIcon
              className="size-3.5 text-muted-foreground"
              icon={Flag02Icon}
            />
          ) : (
            <span
              className={`fi fi-${country.toLowerCase()} rounded-xs text-[14px]`}
              title={getCountryLabel(country)}
            />
          )}
          <span className="text-sm">
            {country ? getCountryLabel(country) : 'Unknown'}
          </span>
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
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon
            className="size-3.5 text-muted-foreground"
            icon={Calendar03Icon}
          />
          <ClientDate className="text-sm" date={timestamp} />
        </div>
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
  const [startDate] = useQueryState('startDate', parseAsString);
  const [endDate] = useQueryState('endDate', parseAsString);

  const { pageSize } = usePaginationStore();

  const { data: devicesData, isLoading } = useDevices(appId || '', {
    page: page.toString(),
    pageSize: pageSize.toString(),
    platform: filter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
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
          pageSize,
          totalPages: 0,
        }
      }
      searchKey="deviceId"
      searchPlaceholder="Search User"
    />
  );
}
