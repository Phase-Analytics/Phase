'use client';

import {
  Calendar03Icon,
  PlaySquareIcon,
  Time03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { parseAsString, useQueryState } from 'nuqs';
import { Card, CardContent } from '@/components/ui/card';
import { CopyButton } from '@/components/ui/copy-button';
import { formatDateTime } from '@/lib/date-utils';
import { useDevice } from '@/lib/queries';

function formatDuration(seconds: number | null) {
  if (seconds === null || seconds === 0) {
    return (
      <>
        0<span className="text-muted-foreground">s</span>
      </>
    );
  }

  const totalSeconds = Math.floor(seconds);

  if (totalSeconds < 60) {
    return (
      <>
        {totalSeconds}
        <span className="text-muted-foreground">s</span>
      </>
    );
  }
  if (totalSeconds < 3600) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return secs > 0 ? (
      <>
        {mins}
        <span className="text-muted-foreground">m</span> {secs}
        <span className="text-muted-foreground">s</span>
      </>
    ) : (
      <>
        {mins}
        <span className="text-muted-foreground">m</span>
      </>
    );
  }
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  return mins > 0 ? (
    <>
      {hours}
      <span className="text-muted-foreground">h</span> {mins}
      <span className="text-muted-foreground">m</span>
    </>
  ) : (
    <>
      {hours}
      <span className="text-muted-foreground">h</span>
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

  if (!(appId && device)) {
    return null;
  }

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">User Information</h2>
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
          {device.identifier && (
            <div>
              <div className="flex items-center gap-2">
                <CopyButton
                  className="size-4 [&_svg]:size-4"
                  content={device.identifier}
                  variant="ghost"
                />
                <p className="text-muted-foreground text-sm">Identifier</p>
              </div>
              <p
                className="mt-1 truncate font-mono font-semibold text-sm"
                title={device.identifier}
              >
                {device.identifier}
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={Calendar03Icon} />
              <p className="text-muted-foreground text-sm">First Seen</p>
            </div>
            <p className="mt-1 font-medium text-sm">
              {formatDate(device.firstSeen)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={Calendar03Icon} />
              <p className="text-muted-foreground text-sm">Last Activity</p>
            </div>
            <p className="mt-1 font-medium text-sm">
              {formatDate(device.lastActivityAt) ||
                formatDate(device.firstSeen)}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={PlaySquareIcon} />
              <p className="text-muted-foreground text-sm">Total Sessions</p>
            </div>
            <p className="mt-1 font-medium text-sm">{device.totalSessions}</p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={Time03Icon} />
              <p className="text-muted-foreground text-sm">
                Avg Session Duration
              </p>
            </div>
            <p className="mt-1 font-medium text-sm">
              {formatDuration(device.avgSessionDuration)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
