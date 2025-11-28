'use client';

import { ArrowTurnBackwardIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';
import { Suspense, use } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { RequireApp } from '@/components/require-app';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DeviceInformationCard } from '@/components/user-detail/device-information-card';
import {
  DeviceInformationSkeleton,
  UserInformationSkeleton,
  UserSessionsTableSkeleton,
} from '@/components/user-detail/user-detail-skeletons';
import { UserInformationCard } from '@/components/user-detail/user-information-card';
import { UserSessionsTable } from '@/components/user-detail/user-sessions-table';

type UserPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function UserPage({ params }: UserPageProps) {
  const { id } = use(params);
  const router = useRouter();

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="font-bold text-2xl">User Details</h1>
          <p className="text-muted-foreground text-sm">
            View detailed information about this user
          </p>
        </div>

        <Button
          className="w-fit font-normal"
          onClick={() => router.back()}
          variant="outline"
        >
          <HugeiconsIcon icon={ArrowTurnBackwardIcon} />
          Back
        </Button>

        <ErrorBoundary>
          <Suspense fallback={<UserInformationSkeleton />}>
            <UserInformationCard deviceId={id} />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary>
          <Suspense fallback={<DeviceInformationSkeleton />}>
            <DeviceInformationCard deviceId={id} />
          </Suspense>
        </ErrorBoundary>

        <Card className="py-0">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="font-semibold text-lg">Sessions</h2>
              <p className="text-muted-foreground text-sm">
                All sessions for this user
              </p>
            </div>

            <ErrorBoundary>
              <Suspense fallback={<UserSessionsTableSkeleton />}>
                <UserSessionsTable deviceId={id} />
              </Suspense>
            </ErrorBoundary>
          </CardContent>
        </Card>
      </div>
    </RequireApp>
  );
}
