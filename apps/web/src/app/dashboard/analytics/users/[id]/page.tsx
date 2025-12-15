'use client';

import { ArrowTurnBackwardIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { Suspense, use } from 'react';
import { DeviceBanDialog } from '@/components/device-ban-dialog';
import { ErrorBoundary } from '@/components/error-boundary';
import { RequireApp } from '@/components/require-app';
import { Button } from '@/components/ui/button';
import { UserActivityCalendar } from '@/components/user-detail/user-activity-calendar';
import { UserDetailCard } from '@/components/user-detail/user-detail-card';
import {
  UserActivityCalendarSkeleton,
  UserDetailCardSkeleton,
  UserSessionsTableSkeleton,
} from '@/components/user-detail/user-detail-skeletons';
import { UserSessionsTable } from '@/components/user-detail/user-sessions-table';

type UserPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function UserPage({ params }: UserPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [appId] = useQueryState('app');

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="font-bold text-2xl">User Details</h1>
          <p className="text-muted-foreground text-sm">
            View detailed information about this user
          </p>
        </div>

        <div className="flex items-center justify-between">
          <Button
            className="w-fit font-normal"
            onClick={() => router.back()}
            variant="outline"
          >
            <HugeiconsIcon icon={ArrowTurnBackwardIcon} />
            Back
          </Button>

          {appId && (
            <DeviceBanDialog
              appId={appId}
              deviceId={id}
              onSuccess={() => router.back()}
            />
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ErrorBoundary>
            <Suspense fallback={<UserDetailCardSkeleton />}>
              <UserDetailCard deviceId={id} />
            </Suspense>
          </ErrorBoundary>

          <ErrorBoundary>
            <Suspense fallback={<UserActivityCalendarSkeleton />}>
              <UserActivityCalendar deviceId={id} />
            </Suspense>
          </ErrorBoundary>
        </div>

        <ErrorBoundary>
          <Suspense fallback={<UserSessionsTableSkeleton />}>
            <UserSessionsTable deviceId={id} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </RequireApp>
  );
}
