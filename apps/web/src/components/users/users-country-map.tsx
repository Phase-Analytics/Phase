'use client';

import { useTheme } from 'next-themes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  ALPHA2_TO_NUMERIC,
  getCountryName,
  NUMERIC_TO_ALPHA2,
} from '@/lib/countries';
import { cn } from '@/lib/utils';

type CountryData = {
  lat: number;
  lng: number;
  name: string;
};

type UsersCountryMapProps = {
  countryStats: Record<string, number>;
  totalDevices: number;
  className?: string;
};

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

export function UsersCountryMap({
  countryStats,
  totalDevices,
  className,
}: UsersCountryMapProps) {
  const { resolvedTheme } = useTheme();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [countriesData, setCountriesData] = useState<Record<
    string,
    CountryData
  > | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [position, setPosition] = useState<{
    coordinates: [number, number];
    zoom: number;
  }>({
    coordinates: [10, 15],
    zoom: 1,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
  useEffect(() => {
    fetch('/countries.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load countries data');
        return res.json();
      })
      .then((data: Record<string, CountryData>) => setCountriesData(data))
      .catch((err) => {
        console.error('Failed to load countries data:', err);
        setCountriesData(null);
      });
  }, []);

  const isDark = mounted ? resolvedTheme === 'dark' : false;

  const countryData = useMemo(() => {
    const map = new Map<string, { countryCode: string; count: number }>();
    for (const [code, count] of Object.entries(countryStats)) {
      const numericCode = ALPHA2_TO_NUMERIC[code];
      if (numericCode) {
        map.set(numericCode, { countryCode: code, count });
      }
    }
    return map;
  }, [countryStats]);

  const getColor = useCallback(
    (count: number, isSelected: boolean) => {
      if (isSelected) {
        return isDark ? '#60a5fa' : '#2563eb';
      }
      if (count > 0) {
        return isDark ? '#93c5fd' : '#60a5fa';
      }
      return isDark ? '#27272a' : '#e4e4e7';
    },
    [isDark]
  );

  const getHoverColor = useCallback(
    (count: number) => {
      if (count > 0) {
        return isDark ? '#a5d0fe' : '#3b82f6';
      }
      return isDark ? '#3f3f46' : '#d4d4d8';
    },
    [isDark]
  );

  const handleClose = useCallback(() => {
    setSelectedCountry(null);
    setPosition({ coordinates: [10, 15], zoom: 1 });
  }, []);

  const handleCountrySelect = useCallback(
    (countryCode: string) => {
      if (countryCode === selectedCountry) {
        handleClose();
      } else if (countriesData) {
        setSelectedCountry(countryCode);
        const country = countriesData[countryCode];
        if (country) {
          setPosition({ coordinates: [country.lng, country.lat], zoom: 4 });
        }
      }
    },
    [selectedCountry, countriesData, handleClose]
  );

  const tooltipCountry = hoveredCountry || selectedCountry;
  const tooltipCount = tooltipCountry ? countryStats[tooltipCountry] || 0 : 0;
  const tooltipPercentage = totalDevices
    ? ((tooltipCount / totalDevices) * 100).toFixed(1)
    : '0';

  if (!mounted) {
    return (
      <div className={cn('relative h-full w-full bg-muted/20', className)} />
    );
  }

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{
          scale: isMobile ? 200 : 240,
          center: [0, 20],
        }}
        style={{ width: '100%', height: '100%' }}
      >
        <ZoomableGroup
          center={position.coordinates}
          filterZoomEvent={() => false}
          maxZoom={6}
          minZoom={1}
          onMoveEnd={setPosition}
          translateExtent={[
            [-100, -50],
            [900, 450],
          ]}
          zoom={position.zoom}
        >
          {/* biome-ignore lint/a11y/noStaticElementInteractions: SVG background needs click handler */}
          <rect
            fill="transparent"
            height="200%"
            onClick={() => selectedCountry && handleClose()}
            width="200%"
            x="-50%"
            y="-50%"
          />
          <Geographies geography={geoUrl}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const countryInfo = countryData.get(geo.id);
                const alpha2 = NUMERIC_TO_ALPHA2[geo.id];
                const count = countryInfo?.count || 0;
                const isSelected = alpha2 === selectedCountry;
                const fillColor = getColor(count, isSelected);

                return (
                  <Geography
                    fill={fillColor}
                    geography={geo}
                    key={geo.rsmKey}
                    onClick={() => {
                      if (alpha2) {
                        handleCountrySelect(alpha2);
                      } else if (selectedCountry) {
                        handleClose();
                      }
                    }}
                    onMouseEnter={() => {
                      if (alpha2) {
                        setHoveredCountry(alpha2);
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredCountry(null);
                    }}
                    stroke={isDark ? '#3f3f46' : '#d4d4d8'}
                    strokeWidth={0.4}
                    style={{
                      default: {
                        outline: 'none',
                        transition: 'fill 0.2s ease',
                      },
                      hover: {
                        fill: getHoverColor(count),
                        outline: 'none',
                        cursor: 'pointer',
                        transition: 'fill 0.2s ease',
                      },
                      pressed: { outline: 'none' },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {tooltipCountry && (
        <div className="fade-in slide-in-from-bottom-1 absolute bottom-2 left-2 flex animate-in items-center gap-2 rounded-lg border bg-background/90 px-2.5 py-1.5 shadow-lg backdrop-blur-md duration-150">
          <span
            className={`fi fi-${tooltipCountry.toLowerCase()} rounded-sm text-base`}
          />
          <div className="flex flex-col">
            <span className="font-medium text-xs leading-tight">
              {getCountryName(tooltipCountry)}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              {tooltipCount > 0
                ? `${tooltipCount.toLocaleString()} users (${tooltipPercentage}%)`
                : 'No users yet'}
            </span>
          </div>
        </div>
      )}

      {Object.keys(countryStats).length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50">
          <p className="text-muted-foreground text-sm">No location data yet</p>
        </div>
      )}

      <style global jsx>{`
        .rsm-zoomable-group {
          transition: transform 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
