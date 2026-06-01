'use client';

import {
  ComputerPhoneSyncIcon,
  CursorPointer02Icon,
  Flag02Icon,
  PlaySquareIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { useMemo, useState } from 'react';
import 'flag-icons/css/flag-icons.min.css';
import type { ActivityItem } from '@/app/dashboard/analytics/realtime/page';
import { ClientDate } from '@/components/client-date';
import { DebugDataBadge } from '@/components/debug-data-badge';
import { EventsSheet } from '@/components/events/event-details-sheet';
import { SessionDetailsDialog } from '@/components/sessions/session-details-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getGeneratedName, UserAvatar } from '@/components/user-profile';
import { getLinkOsIcon } from '@/lib/link-os-icon';

const COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

function getCountryLabel(countryCode: string) {
  return (
    new Intl.DisplayNames(['en'], {
      type: 'region',
    }).of(countryCode) || countryCode
  );
}

type RealtimeActivityFeedProps = {
  activities: ActivityItem[];
  appId: string;
};

export function RealtimeActivityFeed({
  activities,
  appId,
}: RealtimeActivityFeedProps) {
  const router = useRouter();
  const [_eventId, setEventId] = useQueryState('event', parseAsString);
  const [selectedSession, setSelectedSession] = useState<{
    sessionId: string;
    deviceId: string;
    startedAt: string;
    lastActivityAt: string;
  } | null>(null);

  const displayActivities = useMemo(
    () => activities.slice(0, 50),
    [activities]
  );

  const handleActivityClick = (activity: ActivityItem) => {
    if (activity.type === 'linkClick') {
      return;
    }

    if (activity.type === 'event') {
      setEventId(activity.id);
    } else if (activity.type === 'session') {
      setSelectedSession({
        sessionId: activity.id,
        deviceId: activity.deviceId,
        startedAt: activity.timestamp,
        lastActivityAt: activity.timestamp,
      });
    } else if (activity.type === 'device') {
      router.push(
        `/dashboard/analytics/users/${activity.deviceId}?app=${appId}`
      );
    }
  };

  return (
    <>
      <ScrollArea className="h-[300px] w-[386px]">
        <div className="space-y-2 pr-4">
          <AnimatePresence initial={false} mode="popLayout">
            {displayActivities.map((activity, index) => {
              const isLinkClick = activity.type === 'linkClick';
              const motionProps = {
                animate: { opacity: 1, y: 0, scale: 1 },
                exit: { opacity: 0, scale: 0.9, y: -10 },
                initial: { opacity: 0, y: -25, scale: 0.95 },
                layout: true,
                transition: {
                  duration: 0.4,
                  delay: Math.min(index * 0.06, 0.4),
                  ease: [0.16, 1, 0.3, 1] as const,
                  layout: { duration: 0.35, ease: 'easeInOut' as const },
                },
              };

              const content = (
                <>
                  <div className="flex items-center gap-1.5">
                    {activity.type === 'event' && (
                      <HugeiconsIcon
                        className="size-3.5 text-muted-foreground"
                        icon={
                          activity.isScreen ? ViewIcon : CursorPointer02Icon
                        }
                      />
                    )}
                    {activity.type === 'session' && (
                      <HugeiconsIcon
                        className="size-3.5 text-muted-foreground"
                        icon={PlaySquareIcon}
                      />
                    )}
                    {activity.type === 'device' && (
                      <HugeiconsIcon
                        className="size-3.5 text-muted-foreground"
                        icon={ComputerPhoneSyncIcon}
                      />
                    )}
                    {activity.type === 'linkClick' && (
                      <HugeiconsIcon
                        className="size-3.5 text-muted-foreground"
                        icon={CursorPointer02Icon}
                      />
                    )}
                    <span className="font-medium text-xs">
                      {activity.type === 'event' && activity.isScreen
                        ? `View ${activity.name}`
                        : activity.name}
                    </span>
                    {activity.type === 'event' && activity.isDebug && (
                      <DebugDataBadge className="shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-1.5 text-xs">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {activity.type === 'linkClick' ? (
                        <>
                          {activity.region ? (
                            <>
                              {activity.country &&
                              activity.country.length === 2 &&
                              COUNTRY_CODE_REGEX.test(activity.country) ? (
                                <span
                                  className={`fi fi-${activity.country.toLowerCase()} shrink-0 rounded-xs text-[12px]`}
                                  title={getCountryLabel(activity.country)}
                                />
                              ) : (
                                <HugeiconsIcon
                                  className="size-3.5 shrink-0 text-muted-foreground"
                                  icon={Flag02Icon}
                                />
                              )}
                              <span className="truncate text-muted-foreground">
                                {activity.region}
                              </span>
                            </>
                          ) : (
                            <>
                              <HugeiconsIcon
                                className="size-3.5 shrink-0 text-muted-foreground"
                                icon={Flag02Icon}
                              />
                              <span className="text-muted-foreground">
                                Unknown
                              </span>
                            </>
                          )}
                          {activity.os && (
                            <>
                              <span className="text-muted-foreground">·</span>
                              <HugeiconsIcon
                                className="size-3.5 shrink-0 text-muted-foreground"
                                icon={getLinkOsIcon(activity.os)}
                              />
                              <span className="truncate text-muted-foreground">
                                {activity.os}
                              </span>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <UserAvatar
                            seed={activity.deviceId}
                            size={14}
                            variant="marble"
                          />
                          <span className="text-muted-foreground">
                            {getGeneratedName(activity.deviceId)}
                          </span>
                          {activity.country &&
                            activity.country.length === 2 &&
                            COUNTRY_CODE_REGEX.test(activity.country) && (
                              <>
                                <span className="text-muted-foreground">
                                  from
                                </span>
                                <span
                                  className={`fi fi-${activity.country.toLowerCase()} rounded-xs text-[12px]`}
                                  title={getCountryLabel(activity.country)}
                                />
                                <span className="text-primary">
                                  {activity.country.toUpperCase()}
                                </span>
                              </>
                            )}
                        </>
                      )}
                    </div>
                    <ClientDate
                      className="shrink-0 text-muted-foreground text-xs"
                      date={activity.timestamp}
                      format="time"
                    />
                  </div>
                </>
              );

              if (isLinkClick) {
                return (
                  <motion.div
                    key={activity.id}
                    {...motionProps}
                    className="w-full space-y-1 rounded-lg border p-2"
                  >
                    {content}
                  </motion.div>
                );
              }

              return (
                <motion.button
                  key={activity.id}
                  {...motionProps}
                  className="w-full cursor-pointer space-y-1 rounded-lg border p-2 text-left transition-colors hover:bg-accent"
                  onClick={() => {
                    handleActivityClick(activity);
                  }}
                  type="button"
                >
                  {content}
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>

      <EventsSheet appId={appId} />
      <SessionDetailsDialog
        appId={appId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSession(null);
          }
        }}
        open={Boolean(selectedSession)}
        session={selectedSession}
      />
    </>
  );
}
