'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeviceLocationOverview } from '@/lib/queries';

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
  const [activeTab, setActiveTab] = useState<'country' | 'city'>('country');
  const { data: overview } = useDeviceLocationOverview(appId || '');

  if (!appId) {
    return null;
  }

  const countryStats = (overview?.countryStats || {}) as Record<string, number>;
  const cityStats = (overview?.cityStats || {}) as Record<string, number>;

  const sortedCountries = Object.entries(countryStats)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  const sortedCities = Object.entries(cityStats)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  const totalDevices = overview?.totalDevices || 0;

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <Tabs
          onValueChange={(v) => setActiveTab(v as 'country' | 'city')}
          value={activeTab}
        >
          <TabsList className="h-8">
            <TabsTrigger className="text-xs" value="country">
              <span className="sm:hidden">Countries</span>
              <span className="hidden sm:inline">Top Countries</span>
            </TabsTrigger>
            <TabsTrigger className="text-xs" value="city">
              <span className="sm:hidden">Cities</span>
              <span className="hidden sm:inline">Top Cities</span>
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
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-4 text-center text-base leading-none">
                          {getCountryFlag(country)}
                        </span>
                        <span className="font-medium text-sm">
                          {getCountryLabel(country)}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono font-semibold text-sm">
                          {count.toLocaleString()}
                        </span>
                        <span className="font-mono text-muted-foreground text-xs">
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
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  No country data available yet.
                </p>
              </div>
            )}

            {activeTab === 'city' &&
              sortedCities.length > 0 &&
              sortedCities.map(([city, count]) => {
                const percentage = totalDevices
                  ? (count / totalDevices) * 100
                  : 0;

                return (
                  <div className="space-y-1.5" key={city}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{city}</span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono font-semibold text-sm">
                          {count.toLocaleString()}
                        </span>
                        <span className="font-mono text-muted-foreground text-xs">
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
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  No city data available yet.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
