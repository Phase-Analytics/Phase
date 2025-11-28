import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function UsersOverviewCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Total Users</p>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="mt-1 h-3 w-32" />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Daily Active Users</p>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="mt-1 h-3 w-32" />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-green-500" />
            </div>
            <p className="text-muted-foreground text-sm">Online Users</p>
          </div>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="mt-1 h-3 w-32" />
        </CardContent>
      </Card>
    </div>
  );
}

export function UsersPlatformDistributionSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="font-semibold text-lg">Platform Distribution</h2>
          <p className="text-muted-foreground text-sm">
            User distribution across platforms
          </p>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => `skeleton-platform-${i}`).map(
            (key) => (
              <Skeleton className="h-9 w-full" key={key} />
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function UsersTableSkeleton() {
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
