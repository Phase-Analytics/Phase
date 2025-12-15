'use client';

import { Flag02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { useState } from 'react';
import 'flag-icons/css/flag-icons.min.css';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeviceLocationOverviewResponse } from '@/lib/queries';

const COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

function getCountryLabel(countryCode: string) {
  return (
    new Intl.DisplayNames(['en'], {
      type: 'region',
    }).of(countryCode) || countryCode
  );
}

export function UsersTopCountries() {
  const [appId] = useQueryState('app', parseAsString);
  const [activeTab, setActiveTab] = useState<'country' | 'city'>('country');
  const { data: overview } = useDeviceLocationOverviewResponse(appId || '');

  if (!appId) {
    return null;
  }

  const countryStats = (overview?.countryStats || {}) as Record<string, number>;
  const cityStats = (overview?.cityStats || {}) as Record<
    string,
    { count: number; country: string }
  >;

  const sortedCountries = Object.entries(countryStats)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  const sortedCities = Object.entries(cityStats)
    .filter(([, data]) => data.count > 0)
    .sort(([, a], [, b]) => b.count - a.count);

  const totalDevices = overview?.totalDevices || 0;

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <Tabs
          onValueChange={(v) => setActiveTab(v as 'country' | 'city')}
          value={activeTab}
        >
          <TabsList className="h-8">
            <TabsTrigger
              className="text-muted-foreground text-xs uppercase"
              value="country"
            >
              <span className="sm:hidden">Countries</span>
              <span className="hidden sm:inline">Countries</span>
            </TabsTrigger>
            <TabsTrigger
              className="text-muted-foreground text-xs uppercase"
              value="city"
            >
              <span className="sm:hidden">Cities</span>
              <span className="hidden sm:inline">Cities</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-muted-foreground text-sm">
          {activeTab === 'country'
            ? 'User distribution by country'
            : 'User distribution by city'}
        </p>

        <ScrollArea className="h-[130px]">
          <div className="space-y-3 pr-4">
            {activeTab === 'country' &&
              sortedCountries.length > 0 &&
              sortedCountries.map(([country, count]) => {
                const percentage = totalDevices
                  ? (count / totalDevices) * 100
                  : 0;

                return (
                  <div className="space-y-1.5" key={country}>
                    <div className="flex items-center justify-between">
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

            {activeTab === 'country' && sortedCountries.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <HugeiconsIcon
                  className="size-10 text-muted-foreground opacity-40"
                  icon={Flag02Icon}
                />
                <p className="text-center font-medium text-muted-foreground text-sm">
                  No country data available
                </p>
              </div>
            )}

            {activeTab === 'city' &&
              sortedCities.length > 0 &&
              sortedCities.map(([city, data]) => {
                const percentage = totalDevices
                  ? (data.count / totalDevices) * 100
                  : 0;

                return (
                  <div className="space-y-1.5" key={city}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {!data.country ||
                        data.country.length !== 2 ||
                        !COUNTRY_CODE_REGEX.test(data.country) ? (
                          <HugeiconsIcon
                            className="size-3.5 text-muted-foreground"
                            icon={Flag02Icon}
                          />
                        ) : (
                          <span
                            className={`fi fi-${data.country.toLowerCase()} rounded-sm text-[14px]`}
                            title={getCountryLabel(data.country)}
                          />
                        )}
                        <span className="font-medium text-sm">{city}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm">
                          {data.count.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div
                      aria-label={`${city}: ${percentage.toFixed(1)}% of users`}
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

            {activeTab === 'city' && sortedCities.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-8">
                <HugeiconsIcon
                  className="size-10 text-muted-foreground opacity-40"
                  icon={Flag02Icon}
                />
                <p className="text-center font-medium text-muted-foreground text-sm">
                  No city data available
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
