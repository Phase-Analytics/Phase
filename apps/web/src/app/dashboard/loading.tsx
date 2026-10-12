import { Skeleton } from '@/components/ui/skeleton';

// Prefetched with each dashboard link so navigation commits instantly while
// the dynamic segment renders (the layout reads cookies, so routes are dynamic).
export default function DashboardLoading() {
  return (
    <div aria-busy="true" className="flex flex-1 flex-col gap-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-[106px]" />
        <Skeleton className="h-[106px]" />
        <Skeleton className="h-[106px]" />
      </div>
      <Skeleton className="h-[340px] w-full" />
    </div>
  );
}
