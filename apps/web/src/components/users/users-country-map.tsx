'use client';

import type { FeatureCollection, Geometry } from 'geojson';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import {
  ChoroplethChart,
  type ChoroplethFeature,
  ChoroplethFeatureComponent,
  ChoroplethTooltip,
} from '@/components/charts/choropleth';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  ALPHA2_TO_NUMERIC,
  getCountryName,
  NUMERIC_TO_ALPHA2,
} from '@/lib/countries';
import { cn } from '@/lib/utils';

type UsersCountryMapProps = {
  countryStats: Record<string, number>;
  totalDevices: number;
  className?: string;
};

const GEO_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const MAP_COLORS = [
  'var(--chart-map-empty)',
  'var(--chart-map-01)',
  'var(--chart-map-02)',
  'var(--chart-map-03)',
  'var(--chart-map-04)',
] as const;

function getFeatureId(featureItem: ChoroplethFeature): string | null {
  const raw =
    featureItem.id ??
    featureItem.properties?.id ??
    featureItem.properties?.ISO_N3 ??
    featureItem.properties?.iso_n3;

  if (raw === undefined || raw === null) {
    return null;
  }

  return String(raw).padStart(3, '0');
}

function getAlpha2(featureItem: ChoroplethFeature): string | null {
  const numeric = getFeatureId(featureItem);
  if (!numeric) {
    return null;
  }
  return NUMERIC_TO_ALPHA2[numeric] ?? null;
}

function intensityForCount(count: number, maxCount: number): number {
  if (count <= 0 || maxCount <= 0) {
    return 0;
  }
  if (maxCount === 1 || count === 1) {
    return count > 0 ? 1 : 0;
  }
  const ratio = count / maxCount;
  if (ratio <= 0.2) {
    return 1;
  }
  if (ratio <= 0.4) {
    return 2;
  }
  if (ratio <= 0.7) {
    return 3;
  }
  return 4;
}

export function UsersCountryMap({
  countryStats,
  totalDevices,
  className,
}: UsersCountryMapProps) {
  const isMobile = useIsMobile();
  const [geoData, setGeoData] = useState<FeatureCollection<
    Geometry,
    Record<string, unknown>
  > | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(GEO_URL)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Failed to load world atlas');
        }
        return res.json();
      })
      .then((topology: Topology) => {
        if (cancelled) {
          return;
        }
        const countries = topology.objects.countries;
        if (!countries) {
          throw new Error('Missing countries topology object');
        }
        const collection = feature(topology, countries) as FeatureCollection<
          Geometry,
          Record<string, unknown>
        >;
        setGeoData(collection);
      })
      .catch((error) => {
        console.error('Failed to load map geography:', error);
        if (!cancelled) {
          setGeoData(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const countsByNumeric = useMemo(() => {
    const map = new Map<string, { alpha2: string; count: number }>();
    for (const [code, count] of Object.entries(countryStats)) {
      const numeric = ALPHA2_TO_NUMERIC[code];
      if (numeric) {
        map.set(numeric, { alpha2: code, count });
      }
    }
    return map;
  }, [countryStats]);

  const maxCount = useMemo(() => {
    let max = 0;
    for (const entry of countsByNumeric.values()) {
      if (entry.count > max) {
        max = entry.count;
      }
    }
    return max;
  }, [countsByNumeric]);

  const getFeatureColor = useCallback(
    (featureItem: ChoroplethFeature) => {
      const numeric = getFeatureId(featureItem);
      const count = numeric ? (countsByNumeric.get(numeric)?.count ?? 0) : 0;
      return MAP_COLORS[intensityForCount(count, maxCount)];
    },
    [countsByNumeric, maxCount]
  );

  const getFeatureValue = useCallback(
    (featureItem: ChoroplethFeature) => {
      const numeric = getFeatureId(featureItem);
      if (!numeric) {
        return;
      }
      return countsByNumeric.get(numeric)?.count ?? 0;
    },
    [countsByNumeric]
  );

  const getFeatureName = useCallback((featureItem: ChoroplethFeature) => {
    const alpha2 = getAlpha2(featureItem);
    if (alpha2) {
      return getCountryName(alpha2);
    }
    return String(featureItem.properties?.name ?? 'Unknown');
  }, []);

  if (!geoData) {
    return (
      <div className={cn('relative h-full w-full bg-muted/20', className)} />
    );
  }

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <ChoroplethChart
        animationDuration={600}
        aspectRatio="2.2 / 1"
        center={[8, 12]}
        className="h-full w-full"
        data={geoData}
        margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
        scale={isMobile ? 105 : 128}
        zoomEnabled={false}
      >
        <ChoroplethFeatureComponent
          fadedOpacity={0.4}
          getFeatureColor={getFeatureColor}
          stroke="var(--chart-map-stroke)"
          strokeWidth={0.35}
        />
        <ChoroplethTooltip
          content={({ feature: featureItem }) => {
            const alpha2 = getAlpha2(featureItem);
            const count = getFeatureValue(featureItem) ?? 0;
            const percentage = totalDevices
              ? ((count / totalDevices) * 100).toFixed(1)
              : '0';
            const name = getFeatureName(featureItem);

            return (
              <div className="flex min-w-[140px] items-center gap-2 rounded-lg border border-border/60 bg-background/95 px-2.5 py-1.5 shadow-lg backdrop-blur-md">
                {alpha2 ? (
                  <span
                    className={`fi fi-${alpha2.toLowerCase()} rounded-sm text-base`}
                  />
                ) : null}
                <div className="flex flex-col">
                  <span className="font-medium text-xs leading-tight">
                    {name}
                  </span>
                  <span className="text-[10px] text-muted-foreground tabular-nums leading-tight">
                    {count > 0
                      ? `${count.toLocaleString()} users (${percentage}%)`
                      : 'No users yet'}
                  </span>
                </div>
              </div>
            );
          }}
        />
      </ChoroplethChart>

      {Object.keys(countryStats).length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <p className="text-muted-foreground text-sm">No location data yet</p>
        </div>
      )}
    </div>
  );
}
