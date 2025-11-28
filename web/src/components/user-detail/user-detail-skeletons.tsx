import {
  Calendar03Icon,
  ComputerPhoneSyncIcon,
  InformationCircleIcon,
  PlaySquareIcon,
  Time03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function UserInformationSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">User Information</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="size-4" />
              <p className="text-muted-foreground text-sm">User ID</p>
            </div>
            <Skeleton className="mt-1 h-5 w-64" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="size-4" />
              <p className="text-muted-foreground text-sm">Identifier</p>
            </div>
            <Skeleton className="mt-1 h-5 w-48" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={Calendar03Icon} />
              <p className="text-muted-foreground text-sm">First Seen</p>
            </div>
            <Skeleton className="mt-1 h-5 w-40" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={Calendar03Icon} />
              <p className="text-muted-foreground text-sm">Last Activity</p>
            </div>
            <Skeleton className="mt-1 h-5 w-40" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={PlaySquareIcon} />
              <p className="text-muted-foreground text-sm">Total Sessions</p>
            </div>
            <Skeleton className="mt-1 h-5 w-20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={Time03Icon} />
              <p className="text-muted-foreground text-sm">
                Avg Session Duration
              </p>
            </div>
            <Skeleton className="mt-1 h-5 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DeviceInformationSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-lg">Device Information</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="size-4" />
              <p className="text-muted-foreground text-sm">Platform</p>
            </div>
            <Skeleton className="mt-1 h-5 w-24" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={InformationCircleIcon} />
              <p className="text-muted-foreground text-sm">OS Version</p>
            </div>
            <Skeleton className="mt-1 h-5 w-24" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={ComputerPhoneSyncIcon} />
              <p className="text-muted-foreground text-sm">Model</p>
            </div>
            <Skeleton className="mt-1 h-5 w-24" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HugeiconsIcon className="size-4" icon={InformationCircleIcon} />
              <p className="text-muted-foreground text-sm">App Version</p>
            </div>
            <Skeleton className="mt-1 h-5 w-16" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="size-4" />
              <p className="text-muted-foreground text-sm">Country</p>
            </div>
            <Skeleton className="mt-1 h-5 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function UserSessionsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }, (_, i) => `skeleton-table-${i}`).map(
          (key) => (
            <Skeleton className="h-12 w-full" key={key} />
          )
        )}
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-64" />
      </div>
    </div>
  );
}
