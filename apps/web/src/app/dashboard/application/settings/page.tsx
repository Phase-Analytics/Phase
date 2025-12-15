'use client';

import {
  ArrowRight01Icon,
  Delete02Icon,
  Key01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { DeleteAppDialog } from '@/components/delete-app-dialog';
import { EditAppNameDialog } from '@/components/edit-app-name-dialog';
import { RequireApp } from '@/components/require-app';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useApp } from '@/lib/queries';

export default function SettingsPage() {
  const router = useRouter();
  const [appId] = useQueryState('app');
  const { data: app, isLoading } = useApp(appId || '');

  const isOwner = app?.role === 'owner';
  const showLoading = isLoading || !app;

  const renderAppNameSection = () => {
    if (showLoading) {
      return (
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-16" />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium text-base">{app?.name}</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={isOwner ? undefined : 0}>
              <EditAppNameDialog
                appId={appId || ''}
                currentName={app?.name || ''}
                disabled={!isOwner}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>Owner only</TooltipContent>
        </Tooltip>
      </div>
    );
  };

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="font-bold font-sans text-2xl">Settings</h1>
          <p className="font-sans text-muted-foreground text-sm">
            Manage your app settings and configuration
          </p>
        </div>

        <div className="space-y-4">
          <Card className="py-0">
            <CardContent className="space-y-4 p-4">
              <div>
                <h2 className="font-semibold text-muted-foreground text-sm uppercase">
                  Application Details
                </h2>
                <p className="text-muted-foreground text-sm">
                  View and manage your application information
                </p>
              </div>

              {renderAppNameSection()}
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-3 font-semibold text-muted-foreground text-sm uppercase">
              Quick Access
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Link
                className="block"
                href={`/dashboard/application/api-keys?app=${appId}`}
              >
                <Card className="cursor-pointer py-0 transition-colors hover:bg-accent">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <HugeiconsIcon
                          className="size-5 text-primary"
                          icon={Key01Icon}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-muted-foreground text-sm uppercase">
                          API Keys
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Manage your API keys
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
                href={`/dashboard/application/team?app=${appId}`}
              >
                <Card className="cursor-pointer py-0 transition-colors hover:bg-accent">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <HugeiconsIcon
                          className="size-5 text-primary"
                          icon={UserGroupIcon}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-muted-foreground text-sm uppercase">
                          Team
                        </h3>
                        <p className="text-muted-foreground text-sm">
                          Manage team members
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

          <Card className="py-0">
            <CardContent className="space-y-4 p-4">
              <div>
                <h2 className="font-semibold text-destructive text-sm uppercase">
                  Danger Zone
                </h2>
                <p className="text-muted-foreground text-sm">
                  Irreversible and destructive actions
                </p>
              </div>

              {showLoading ? (
                <div className="flex flex-col gap-4 rounded-lg border border-destructive/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <Skeleton className="h-8 w-full sm:w-auto" />
                </div>
              ) : (
                <div className="flex flex-col gap-4 rounded-lg border border-destructive/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">Delete Application</h3>
                    <p className="text-muted-foreground text-sm">
                      Permanently delete this app and all associated data
                    </p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="w-full sm:w-auto"
                        tabIndex={isOwner ? undefined : 0}
                      >
                        <DeleteAppDialog
                          appId={appId || ''}
                          appName={app?.name || ''}
                          onSuccess={() => router.push('/dashboard')}
                        >
                          <Button
                            className="w-full sm:w-auto"
                            disabled={!isOwner}
                            size="sm"
                            type="button"
                            variant="destructive"
                          >
                            <HugeiconsIcon
                              className="mr-1.5 size-3"
                              icon={Delete02Icon}
                            />
                            Delete Application
                          </Button>
                        </DeleteAppDialog>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Owner only</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </RequireApp>
  );
}
