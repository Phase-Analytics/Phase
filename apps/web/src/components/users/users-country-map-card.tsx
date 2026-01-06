'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDeviceOverviewResponse } from '@/lib/queries';
import { UsersCountryMap } from './users-country-map';

export function UsersCountryMapCard() {
  const [appId] = useQueryState('app', parseAsString);
  const { data: overview } = useDeviceOverviewResponse(appId || '');

  if (!appId) {
    return null;
  }

  const countryStats = (overview?.countryStats || {}) as Record<string, number>;
  const totalDevices = overview?.totalDevices || 0;

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <Tabs value="map">
          <TabsList className="h-8">
            <TabsTrigger
              className="text-muted-foreground text-xs uppercase"
              value="map"
            >
              <span className="sm:hidden">Map</span>
              <span className="hidden sm:inline">Geographic Map</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <p className="text-muted-foreground text-sm">
          User distribution by location
        </p>

        <div className="h-[220px]">
          <UsersCountryMap
            countryStats={countryStats}
            totalDevices={totalDevices}
          />
        </div>
      </CardContent>
    </Card>
  );
}
