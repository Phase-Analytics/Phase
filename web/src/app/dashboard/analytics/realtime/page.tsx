'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { useEffect, useState } from 'react';
import { RealtimeActivityFeed } from '@/components/realtime/realtime-activity-feed';
import { RealtimeHeader } from '@/components/realtime/realtime-header';
import { RequireApp } from '@/components/require-app';
import { useSidebar } from '@/components/ui/sidebar';
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

  useEffect(() => {
    if (!isMobile) {
      setOpen(false);
    }
  }, [isMobile, setOpen]);

  const handleMessage = (data: RealtimeMessage) => {
    if (data.appName && !appName) {
      setAppName(data.appName);
    }

    if (data.onlineUsers) {
      setOnlineUsers(data.onlineUsers.total);
      setPlatforms(data.onlineUsers.platforms);
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
  };

  const handleResume = () => {
    resume();
  };

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col justify-between">
        <RealtimeHeader
          appName={appName || undefined}
          onlineUsers={onlineUsers}
          onPause={handlePause}
          onResume={handleResume}
          platforms={platforms}
          status={status}
        />
        <RealtimeActivityFeed activities={activities} />
      </div>
    </RequireApp>
  );
}
