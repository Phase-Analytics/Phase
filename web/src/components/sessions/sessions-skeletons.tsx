import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function SessionsOverviewCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Total Sessions</p>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="mt-1 h-3 w-32" />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Daily Sessions</p>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="mt-1 h-3 w-32" />
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">
            Average Session Duration
          </p>
          <Skeleton className="h-8 w-20" />
          <Skeleton className="mt-1 h-3 w-32" />
        </CardContent>
      </Card>
    </div>
  );
}

export function SessionsTableSkeleton() {
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
