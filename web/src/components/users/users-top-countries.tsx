'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { Card, CardContent } from '@/components/ui/card';
import { useDeviceOverview } from '@/lib/queries';

const COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

function getCountryFlag(countryCode: string) {
  if (
    !countryCode ||
    countryCode.length !== 2 ||
    !COUNTRY_CODE_REGEX.test(countryCode)
  ) {
    return '🏳️';
  }
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

export function UsersTopCountries() {
  const [appId] = useQueryState('app', parseAsString);
  const { data: overview } = useDeviceOverview(appId || '');

  if (!appId) {
    return null;
  }

  const hasCountryData =
    overview?.countryStats && Object.keys(overview.countryStats).length > 0;

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="font-semibold text-lg">Top Countries</h2>
          <p className="text-muted-foreground text-sm">
            User distribution by country
          </p>
        </div>

        {hasCountryData ? (
          <div className="space-y-3">
            {Object.entries(overview.countryStats)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([country, count]) => {
                const percentage = overview.totalDevices
                  ? (count / overview.totalDevices) * 100
                  : 0;

                return (
                  <div className="space-y-1.5" key={country}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg leading-none">
                          {getCountryFlag(country)}
                        </span>
                        <span className="font-medium text-sm">
                          {getCountryLabel(country)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm">
                          {count.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div
                      aria-label={`${getCountryLabel(country)}: ${percentage.toFixed(1)}% of users`}
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
              })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No country data available yet.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
