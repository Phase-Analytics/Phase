'use client';

import { Flag02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { LinkAnalyticsResponse } from '@phase/shared';
import type { ReactNode } from 'react';
import 'flag-icons/css/flag-icons.min.css';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

const COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

function getCountryLabel(countryCode: string) {
  if (!(countryCode && COUNTRY_CODE_REGEX.test(countryCode))) {
    return 'Unknown';
  }

  return (
    new Intl.DisplayNames(['en'], { type: 'region' }).of(
      countryCode.toUpperCase()
    ) || countryCode
  );
}

function GeoBarRow({
  label,
  count,
  total,
  ariaLabel,
}: {
  label: ReactNode;
  count: number;
  total: number;
  ariaLabel: string;
}) {
  const percentage = total ? (count / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">{label}</div>
        <div className="flex shrink-0 items-baseline gap-2">
          <span className="font-semibold text-sm">
            {count.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-xs">
            ({percentage.toFixed(1)}%)
          </span>
        </div>
      </div>
      <div
        aria-label={ariaLabel}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage}
        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function LinkAnalyticsGeoCard({
  countries,
}: {
  countries: LinkAnalyticsResponse['countries'];
}) {
  const countryTotal = countries.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="py-0">
      <CardContent className="space-y-3 p-4">
        <p className="text-muted-foreground text-sm">
          Click distribution by country
        </p>

        <ScrollArea className="h-[220px]">
          <div className="space-y-3 pr-4">
            {countries.length === 0 ? (
              <p className="text-muted-foreground text-sm">No data yet</p>
            ) : (
              countries.map((item) => {
                const isValid =
                  item.key.length === 2 && COUNTRY_CODE_REGEX.test(item.key);
                const label = getCountryLabel(item.key);
                const percentage = countryTotal
                  ? (item.count / countryTotal) * 100
                  : 0;

                return (
                  <GeoBarRow
                    ariaLabel={`${label}: ${percentage.toFixed(1)}% of clicks`}
                    count={item.count}
                    key={`country-${item.key}`}
                    label={
                      <>
                        {isValid ? (
                          <span
                            className={`fi fi-${item.key.toLowerCase()} rounded-xs text-[14px]`}
                            title={label}
                          />
                        ) : (
                          <HugeiconsIcon
                            className="size-3.5 shrink-0 text-muted-foreground"
                            icon={Flag02Icon}
                          />
                        )}
                        <span className="truncate font-medium text-sm">
                          {label}
                        </span>
                      </>
                    }
                    total={countryTotal}
                  />
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
