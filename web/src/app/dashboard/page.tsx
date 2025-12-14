'use client';

import {
  Activity03Icon,
  AddSquareIcon,
  ArrowRight01Icon,
  ArtboardIcon,
  ChartLineData03Icon,
  CustomerSupportIcon,
  DatabaseIcon,
  File02Icon,
  GithubIcon,
  UserGroupIcon,
  UserSquareIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CreateAppDialog } from '@/components/create-app-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApps } from '@/lib/queries';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = searchParams.get('app');
  const [mounted, setMounted] = useState(false);
  const { data: appsData, isPending } = useApps();

  const apps = appsData?.apps || [];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && appId) {
      router.replace(`/dashboard/analytics/users?app=${appId}`);
    }
  }, [appId, router, mounted]);

  const handleAppSelect = (id: string) => {
    router.push(`/dashboard/analytics/users?app=${id}`);
  };

  if (!mounted || appId) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-8">
      <div className="text-center">
        <h1 className="font-bold font-sans text-4xl">Welcome to Phase</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Select an application to view analytics and insights
        </p>
      </div>

      {isPending && (
        <div className="flex flex-wrap justify-center gap-4">
          <Card className="w-full py-0 sm:w-80">
            <CardContent className="p-6">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="mt-4 h-6 w-32" />
              <Skeleton className="mt-2 h-4 w-20" />
            </CardContent>
          </Card>
          <Card className="w-full py-0 sm:w-80">
            <CardContent className="p-6">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="mt-4 h-6 w-32" />
              <Skeleton className="mt-2 h-4 w-20" />
            </CardContent>
          </Card>
          <Card className="w-full py-0 sm:w-80">
            <CardContent className="p-6">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="mt-4 h-6 w-32" />
              <Skeleton className="mt-2 h-4 w-20" />
            </CardContent>
          </Card>
        </div>
      )}

      {!isPending && apps.length === 0 && (
        <div className="flex flex-col items-center gap-6 py-12">
          <div className="flex size-20 items-center justify-center rounded-2xl bg-muted">
            <HugeiconsIcon
              className="size-10 text-muted-foreground"
              icon={ArtboardIcon}
            />
          </div>
          <div className="text-center">
            <h2 className="font-semibold text-xl">No applications yet</h2>
            <p className="mt-2 text-muted-foreground">
              Create your first application to start tracking analytics
            </p>
          </div>
          <CreateAppDialog onSuccess={handleAppSelect}>
            <button
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              type="button"
            >
              <HugeiconsIcon className="size-5" icon={AddSquareIcon} />
              Create Your First App
            </button>
          </CreateAppDialog>
        </div>
      )}

      {!isPending && apps.length > 0 && (
        <>
          <div className="flex flex-wrap justify-center gap-4">
            {apps.map((app) => (
              <Card
                className={cn(
                  'w-full cursor-pointer py-0 transition-all hover:scale-[1.02] hover:shadow-lg sm:w-80'
                )}
                key={app.id}
                onClick={() => handleAppSelect(app.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <HugeiconsIcon className="size-6" icon={ArtboardIcon} />
                    </div>
                    <div
                      className={cn(
                        'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs',
                        app.role === 'owner'
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <HugeiconsIcon
                        className="size-3"
                        icon={
                          app.role === 'owner' ? UserSquareIcon : UserGroupIcon
                        }
                      />
                      <span className="font-medium capitalize">{app.role}</span>
                    </div>
                  </div>
                  <h3 className="mt-4 font-semibold text-lg">{app.name}</h3>
                  <div className="mt-4 flex items-center gap-4 text-muted-foreground text-xs">
                    <div className="flex items-center gap-1">
                      <HugeiconsIcon
                        className="size-3.5"
                        icon={ChartLineData03Icon}
                      />
                      <span>Analytics</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <HugeiconsIcon className="size-3.5" icon={DatabaseIcon} />
                      <span>Events</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-center">
            <CreateAppDialog onSuccess={handleAppSelect}>
              <button
                className="flex items-center gap-2 rounded-lg border border-dashed px-6 py-3 font-medium transition-all hover:scale-[1.02] hover:border-primary hover:bg-accent"
                type="button"
              >
                <HugeiconsIcon className="size-5" icon={AddSquareIcon} />
                Create New App
              </button>
            </CreateAppDialog>
          </div>

          <div className="mt-8">
            <h2 className="mb-3 font-semibold text-muted-foreground text-sm uppercase">
              Quick Links
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Link className="block" href="/docs" target="_blank">
                <Card className="cursor-pointer py-0 transition-colors hover:bg-accent">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <HugeiconsIcon
                          className="size-5 text-primary"
                          icon={File02Icon}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-muted-foreground text-sm uppercase">
                          Documentation
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Learn how to use Phase
                        </p>
                      </div>
                    </div>
                    <HugeiconsIcon
                      className="size-5 text-muted-foreground"
                      icon={ArrowRight01Icon}
                    />
                  </CardContent>
                </Card>
              </Link>

              <Link className="block" href="/support" target="_blank">
                <Card className="cursor-pointer py-0 transition-colors hover:bg-accent">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <HugeiconsIcon
                          className="size-5 text-primary"
                          icon={CustomerSupportIcon}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-muted-foreground text-sm uppercase">
                          Support
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Get help from our team
                        </p>
                      </div>
                    </div>
                    <HugeiconsIcon
                      className="size-5 text-muted-foreground"
                      icon={ArrowRight01Icon}
                    />
                  </CardContent>
                </Card>
              </Link>

              <Link
                className="block"
                href="https://status.phase.sh"
                target="_blank"
              >
                <Card className="cursor-pointer py-0 transition-colors hover:bg-accent">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <HugeiconsIcon
                          className="size-5 text-primary"
                          icon={Activity03Icon}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-muted-foreground text-sm uppercase">
                          Status
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Check system status
                        </p>
                      </div>
                    </div>
                    <HugeiconsIcon
                      className="size-5 text-muted-foreground"
                      icon={ArrowRight01Icon}
                    />
                  </CardContent>
                </Card>
              </Link>

              <Link
                className="block"
                href="https://github.com/phase-analytics/Phase/"
                target="_blank"
              >
                <Card className="cursor-pointer py-0 transition-colors hover:bg-accent">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <HugeiconsIcon
                          className="size-5 text-primary"
                          icon={GithubIcon}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-muted-foreground text-sm uppercase">
                          GitHub
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          View source code
                        </p>
                      </div>
                    </div>
                    <HugeiconsIcon
                      className="size-5 text-muted-foreground"
                      icon={ArrowRight01Icon}
                    />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
