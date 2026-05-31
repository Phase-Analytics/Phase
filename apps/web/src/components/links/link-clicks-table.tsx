'use client';

import {
  AndroidIcon,
  AppleIcon,
  BrowserIcon,
  Calendar03Icon,
  CursorPointer02Icon,
  Flag02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { LinkClickItem } from '@phase/shared';
import type { ColumnDef } from '@tanstack/react-table';
import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import 'flag-icons/css/flag-icons.min.css';
import { ClientDate } from '@/components/client-date';
import { Card, CardContent } from '@/components/ui/card';
import { DataTableServer } from '@/components/ui/data-table-server';
import { useLinkClicks } from '@/lib/queries/use-links';
import { usePaginationStore } from '@/stores/pagination-store';

const COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

function getPlatformIcon(platform: LinkClickItem['platform']) {
  switch (platform) {
    case 'android':
      return AndroidIcon;
    case 'ios':
      return AppleIcon;
    default:
      return BrowserIcon;
  }
}

function getPlatformLabel(platform: LinkClickItem['platform']) {
  switch (platform) {
    case 'android':
      return 'Android';
    case 'ios':
      return 'iOS';
    default:
      return 'Other';
  }
}

function getCountryLabel(countryCode: string) {
  return (
    new Intl.DisplayNames(['en'], {
      type: 'region',
    }).of(countryCode) || countryCode
  );
}

const columns: ColumnDef<LinkClickItem>[] = [
  {
    id: 'event',
    header: 'Event',
    size: 200,
    cell: () => (
      <div
        className="flex max-w-xs items-center gap-2 lg:max-w-sm"
        title="New Click"
      >
        <HugeiconsIcon
          className="shrink-0 text-muted-foreground"
          icon={CursorPointer02Icon}
          size={16}
        />
        <span className="truncate font-medium text-primary text-sm">
          New Click
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'timestamp',
    header: 'Date',
    size: 200,
    cell: ({ row }) => {
      const timestamp = row.getValue('timestamp') as string;
      return (
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            className="text-muted-foreground"
            icon={Calendar03Icon}
            size={16}
          />
          <ClientDate className="text-primary text-sm" date={timestamp} />
        </div>
      );
    },
  },
  {
    accessorKey: 'platform',
    header: 'Platform',
    size: 120,
    cell: ({ row }) => {
      const platform = row.getValue('platform') as LinkClickItem['platform'];

      return (
        <div className="flex items-center gap-1.5">
          <HugeiconsIcon
            className="size-3.5 text-muted-foreground"
            icon={getPlatformIcon(platform)}
          />
          <span className="text-sm">{getPlatformLabel(platform)}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'countryCode',
    header: 'Country',
    size: 150,
    cell: ({ row }) => {
      const country = row.getValue('countryCode') as string | null;

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
];

type LinkClicksTableProps = {
  appId: string;
  linkId: string;
};

export function LinkClicksTable({ appId, linkId }: LinkClicksTableProps) {
  const [page] = useQueryState('page', parseAsInteger.withDefault(1));
  const [startDate] = useQueryState('startDate', parseAsString);
  const [endDate] = useQueryState('endDate', parseAsString);
  const { pageSize } = usePaginationStore();

  const { data, isLoading } = useLinkClicks(appId, linkId, {
    page: page.toString(),
    pageSize: pageSize.toString(),
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="font-semibold text-muted-foreground text-sm uppercase">
            Clicks
          </h2>
          <p className="text-muted-foreground text-sm">
            Recent link click activity
          </p>
        </div>

        <DataTableServer
          columns={columns}
          data={data?.clicks ?? []}
          isLoading={isLoading}
          pagination={
            data?.pagination ?? {
              total: 0,
              page: 1,
              pageSize,
              totalPages: 0,
            }
          }
        />
      </CardContent>
    </Card>
  );
}
