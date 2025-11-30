'use client';

import {
  Calendar03Icon,
  PlaySquareIcon,
  Time03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { getGeneratedName, UserAvatar } from '@/components/user-profile';
import { formatDateTime } from '@/lib/date-utils';
import { useDevice } from '@/lib/queries';

function formatDuration(seconds: number | null) {
  if (seconds === null || seconds === 0) {
    return (
      <>
        0<span>s</span>
      </>
    );
  }

  const totalSeconds = Math.floor(seconds);

  if (totalSeconds < 60) {
    return (
      <>
        {totalSeconds}
        <span>s</span>
      </>
    );
  }
  if (totalSeconds < 3600) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return secs > 0 ? (
      <>
        {mins}
        <span>m</span> {secs}
        <span>s</span>
      </>
    ) : (
      <>
        {mins}
        <span>m</span>
      </>
    );
  }
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  return mins > 0 ? (
    <>
      {hours}
      <span>h</span> {mins}
      <span>m</span>
    </>
  ) : (
    <>
      {hours}
      <span>h</span>
    </>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) {
    return null;
  }
  return formatDateTime(dateStr);
}

type UserInformationCardProps = {
  deviceId: string;
};

export function UserInformationCard({ deviceId }: UserInformationCardProps) {
  const [appId] = useQueryState('app', parseAsString);
  const { data: device } = useDevice(deviceId, appId || '');

  const generatedName = useMemo(() => {
    if (!device?.deviceId) {
      return '';
    }
    return getGeneratedName(device.deviceId);
  }, [device?.deviceId]);

  if (!(appId && device)) {
    return null;
  }

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full">
            <UserAvatar seed={device.deviceId} size={48} variant="marble" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-semibold text-lg">{generatedName}</h2>
            <p className="text-muted-foreground text-sm">User Information</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <CopyButton
                className="size-4 [&_svg]:size-4"
                content={device.deviceId}
                variant="ghost"
              />
              <p className="text-muted-foreground text-sm">User ID</p>
            </div>
            <p
              className="mt-1 truncate font-mono font-semibold text-sm"
              title={device.deviceId}
            >
              {device.deviceId}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={Calendar03Icon} />
              <p className="text-muted-foreground text-sm">First Seen</p>
            </div>
            <p className="mt-1 font-mono text-muted-foreground text-xs">
              {formatDate(device.firstSeen)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={Calendar03Icon} />
              <p className="text-muted-foreground text-sm">Last Activity</p>
            </div>
            <p className="mt-1 font-mono text-muted-foreground text-xs">
              {formatDate(device.lastActivityAt) ||
                formatDate(device.firstSeen)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={PlaySquareIcon} />
              <p className="text-muted-foreground text-sm">Total Sessions</p>
            </div>
            <p className="mt-1 font-medium font-mono text-sm">
              {device.totalSessions}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={Time03Icon} />
              <p className="text-muted-foreground text-sm">
                Avg Session Duration
              </p>
            </div>
            <p className="mt-1 font-mono text-xs">
              {formatDuration(device.avgSessionDuration)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
