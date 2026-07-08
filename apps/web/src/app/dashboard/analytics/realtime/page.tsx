'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useRef, useState } from 'react';
import { RealtimeActivityFeed } from '@/components/realtime/realtime-activity-feed';
import { RealtimeHeader } from '@/components/realtime/realtime-header';
import { RequireApp } from '@/components/require-app';
import Earth from '@/components/ui/cobe-globe';
import { Sparkles } from '@/components/ui/sparkles';
import type { RealtimeMessage } from '@/lib/api/types';
import { useRealtime } from '@/lib/queries/use-realtime';

export type ActivityItem = {
  id: string;
  type: 'event' | 'session' | 'device' | 'linkClick';
  name: string;
  deviceId: string;
  country: string | null;
  platform: string | null;
  timestamp: string;
  isScreen?: boolean;
  isDebug?: boolean;
  os?: string | null;
  browser?: string | null;
};

type CountryData = {
  lat: number;
  lng: number;
  name: string;
};

const COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

function isValidCountryCode(code: string | null | undefined): code is string {
  return Boolean(code && code.length === 2 && COUNTRY_CODE_REGEX.test(code));
}

type GlobeMarker = {
  location: [number, number];
  color: [number, number, number];
  size: number;
};

function buildMarkersForCountries(
  activeCountries: Set<string>,
  coords: Record<string, CountryData>,
  cache: Record<string, GlobeMarker[]>
): GlobeMarker[] {
  const newMarkers: GlobeMarker[] = [];

  for (const upperCountryCode of activeCountries) {
    if (!cache[upperCountryCode]) {
      const countryCoordsEntry = coords[upperCountryCode];
      if (countryCoordsEntry) {
        const markerCount = Math.floor(Math.random() * 3) + 7;
        const countryMarkers: GlobeMarker[] = [];

        for (let i = 0; i < markerCount; i++) {
          const randomLat = countryCoordsEntry.lat + (Math.random() - 0.5) * 4;
          const randomLng = countryCoordsEntry.lng + (Math.random() - 0.5) * 4;

          countryMarkers.push({
            location: [randomLat, randomLng],
            color: [0, 1, 0],
            size: 0.04,
          });
        }

        cache[upperCountryCode] = countryMarkers;
      }
    }

    if (cache[upperCountryCode]) {
      newMarkers.push(...cache[upperCountryCode]);
    }
  }

  return newMarkers;
}

export default function RealtimePage() {
  const [appId] = useQueryState('app', parseAsString);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [appName, setAppName] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<number>(0);
  const [platforms, setPlatforms] = useState<{
    ios?: number;
    android?: number;
    web?: number;
  }>({});
  const [countryCoords, setCountryCoords] = useState<
    Record<string, CountryData>
  >({});
  const [markers, setMarkers] = useState<
    Array<{
      location: [number, number];
      size?: number;
      color?: [number, number, number];
    }>
  >([]);
  const countryMarkersCache = useRef<Record<string, GlobeMarker[]>>({});
  const activeCountryCodesRef = useRef<Set<string>>(new Set());

  const syncGlobeMarkers = (coords: Record<string, CountryData>) => {
    if (
      activeCountryCodesRef.current.size === 0 ||
      Object.keys(coords).length === 0
    ) {
      return;
    }

    setMarkers(
      buildMarkersForCountries(
        activeCountryCodesRef.current,
        coords,
        countryMarkersCache.current
      )
    );
  };

  const trackActivityCountries = (
    codes: Array<string | null | undefined>,
    coords: Record<string, CountryData>
  ) => {
    let changed = false;

    for (const code of codes) {
      if (!isValidCountryCode(code)) {
        continue;
      }

      const upperCountryCode = code.toUpperCase();
      if (!activeCountryCodesRef.current.has(upperCountryCode)) {
        activeCountryCodesRef.current.add(upperCountryCode);
        changed = true;
      }
    }

    if (changed) {
      syncGlobeMarkers(coords);
    }
  };

  useEffect(() => {
    fetch('/countries.json')
      .then((res) => res.json())
      .then((data: Record<string, CountryData>) => {
        setCountryCoords(data);
      })
      .catch((error) => {
        console.error('Failed to load country coordinates:', error);
      });
  }, []);

  useEffect(() => {
    if (
      Object.keys(countryCoords).length === 0 ||
      activeCountryCodesRef.current.size === 0
    ) {
      return;
    }

    setMarkers(
      buildMarkersForCountries(
        activeCountryCodesRef.current,
        countryCoords,
        countryMarkersCache.current
      )
    );
  }, [countryCoords]);

  const handleMessage = (data: RealtimeMessage) => {
    if (data.appName && !appName) {
      setAppName(data.appName);
    }

    if (data.onlineUsers) {
      setOnlineUsers(data.onlineUsers.total);
      setPlatforms(data.onlineUsers.platforms);
    }

    const newActivities: ActivityItem[] = [];
    const activityCountries: Array<string | null | undefined> = [];

    for (const event of data.events) {
      activityCountries.push(event.country);
      newActivities.push({
        id: event.eventId,
        type: 'event',
        name: event.name,
        deviceId: event.deviceId,
        country: event.country,
        platform: event.platform,
        timestamp: event.timestamp,
        isScreen: event.isScreen,
        isDebug: event.isDebug,
      });
    }

    for (const session of data.sessions) {
      activityCountries.push(session.country);
      newActivities.push({
        id: session.sessionId,
        type: 'session',
        name: 'New Session',
        deviceId: session.deviceId,
        country: session.country,
        platform: session.platform,
        timestamp: session.startedAt,
      });
    }

    for (const device of data.devices) {
      activityCountries.push(device.country);
      newActivities.push({
        id: device.deviceId,
        type: 'device',
        name: 'New User',
        deviceId: device.deviceId,
        country: device.country,
        platform: device.platform,
        timestamp: data.timestamp,
      });
    }

    for (const click of data.linkClicks ?? []) {
      activityCountries.push(click.countryCode);
      newActivities.push({
        id: click.clickId,
        type: 'linkClick',
        name: `${click.linkName} Click`,
        deviceId: click.linkId,
        country: click.countryCode,
        platform: null,
        os: click.os,
        browser: click.browser,
        timestamp: click.timestamp,
      });
    }

    if (activityCountries.length > 0) {
      trackActivityCountries(activityCountries, countryCoords);
    }

    if (newActivities.length > 0) {
      setActivities((prev) => [...newActivities, ...prev]);
    }
  };

  const { status, pause, resume } = useRealtime(appId ?? undefined, {
    enabled: Boolean(appId),
    onMessage: handleMessage,
  });

  const handlePause = () => {
    pause();
    setActivities([]);
    setOnlineUsers(0);
    setPlatforms({});
    setMarkers([]);
    countryMarkersCache.current = {};
    activeCountryCodesRef.current = new Set();
  };

  const handleResume = () => {
    resume();
  };

  return (
    <RequireApp>
      <div className="relative isolate h-full">
        <div className="-z-10 pointer-events-none absolute inset-0">
          <Sparkles
            className="absolute inset-0"
            density={200}
            opacity={0.7}
            size={1.15}
            speed={0.4}
          />
        </div>
        <div className="relative flex h-full flex-col gap-6 lg:grid lg:grid-cols-2">
          <div className="order-1">
            <RealtimeHeader
              appName={appName || undefined}
              onlineUsers={onlineUsers}
              onPause={handlePause}
              onResume={handleResume}
              platforms={platforms}
              status={status}
            />
          </div>

          <div className="order-2 flex items-center justify-center lg:row-span-2">
            <Earth
              className="relative aspect-square w-full max-w-[500px] lg:max-w-[700px] xl:max-w-[800px] 2xl:max-w-[900px]"
              markers={markers}
            />
          </div>

          <div className="order-3 flex-1 lg:flex-none lg:self-end">
            <RealtimeActivityFeed activities={activities} appId={appId || ''} />
          </div>
        </div>
      </div>
    </RequireApp>
  );
}
