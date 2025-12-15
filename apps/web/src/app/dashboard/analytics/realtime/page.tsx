'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useRef, useState } from 'react';
import { RealtimeActivityFeed } from '@/components/realtime/realtime-activity-feed';
import { RealtimeHeader } from '@/components/realtime/realtime-header';
import { RequireApp } from '@/components/require-app';
import Earth from '@/components/ui/cobe-globe';
import { useSidebar } from '@/components/ui/sidebar';
import { Sparkles } from '@/components/ui/sparkles';
import type { RealtimeMessage } from '@/lib/api/types';
import { useRealtime } from '@/lib/queries/use-realtime';

export type ActivityItem = {
  id: string;
  type: 'event' | 'session' | 'device';
  name: string;
  deviceId: string;
  country: string | null;
  platform: string | null;
  timestamp: string;
};

type CountryData = {
  lat: number;
  lng: number;
  name: string;
};

export default function RealtimePage() {
  const { setOpen, isMobile } = useSidebar();
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
  const countryMarkersCache = useRef<
    Record<
      string,
      Array<{
        location: [number, number];
        color: [number, number, number];
        size: number;
      }>
    >
  >({});

  useEffect(() => {
    if (!isMobile) {
      setOpen(false);
    }
  }, [isMobile, setOpen]);

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

  const handleMessage = (data: RealtimeMessage) => {
    if (data.appName && !appName) {
      setAppName(data.appName);
    }

    if (data.onlineUsers) {
      setOnlineUsers(data.onlineUsers.total);
      setPlatforms(data.onlineUsers.platforms);

      if (Object.keys(countryCoords).length > 0) {
        const newMarkers: Array<{
          location: [number, number];
          color: [number, number, number];
          size: number;
        }> = [];

        for (const countryCode of Object.keys(data.onlineUsers.countries)) {
          const upperCountryCode = countryCode.toUpperCase();

          if (!countryMarkersCache.current[upperCountryCode]) {
            const coords = countryCoords[upperCountryCode];
            if (coords) {
              const markerCount = Math.floor(Math.random() * 2) + 5;
              const countryMarkers: Array<{
                location: [number, number];
                color: [number, number, number];
                size: number;
              }> = [];

              for (let i = 0; i < markerCount; i++) {
                const randomLat = coords.lat + (Math.random() - 0.5) * 3;
                const randomLng = coords.lng + (Math.random() - 0.5) * 3;

                countryMarkers.push({
                  location: [randomLat, randomLng],
                  color: [0, 1, 0],
                  size: 0.04,
                });
              }

              countryMarkersCache.current[upperCountryCode] = countryMarkers;
            }
          }

          if (countryMarkersCache.current[upperCountryCode]) {
            newMarkers.push(...countryMarkersCache.current[upperCountryCode]);
          }
        }

        setMarkers(newMarkers);
      }
    }

    const newActivities: ActivityItem[] = [];

    for (const event of data.events) {
      newActivities.push({
        id: event.eventId,
        type: 'event',
        name: event.name,
        deviceId: event.deviceId,
        country: event.country,
        platform: event.platform,
        timestamp: event.timestamp,
      });
    }

    for (const session of data.sessions) {
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
