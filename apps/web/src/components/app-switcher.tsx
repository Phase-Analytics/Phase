'use client';

import {
  AddSquareIcon,
  ArtboardIcon,
  UnfoldMoreIcon,
  UserGroupIcon,
  UserSquareIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useEffect, useState } from 'react';
import { CreateAppDialog } from '@/components/create-app-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useApps } from '@/lib/queries';

type AppSwitcherProps = {
  variant: 'sidebar' | 'standalone';
  onMobileClose?: () => void;
};

export function AppSwitcher({ variant, onMobileClose }: AppSwitcherProps) {
  const router = useRouter();
  const [appId, setAppId] = useQueryState('app');
  const { data: appsData, isPending } = useApps();
  const [open, setOpen] = useState(false);

  const apps = appsData?.apps || [];
  const selectedApp = apps.find((app) => app.id === appId);

  const handleAppSelect = (id: string) => {
    setAppId(id);
    router.push(`/dashboard/analytics/users?app=${id}`);
    onMobileClose?.();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 's'
      ) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (variant === 'sidebar') {
    return (
      <DropdownMenu modal={false} onOpenChange={setOpen} open={open}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            tooltip={selectedApp ? selectedApp.name : 'Select App'}
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HugeiconsIcon className="size-4" icon={ArtboardIcon} />
            </div>
            <div
              className="flex flex-col gap-0.5 leading-none"
              suppressHydrationWarning
            >
              {isPending ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <span className="font-sans font-semibold">
                  {selectedApp ? selectedApp.name : 'Select App'}
                </span>
              )}
              {isPending ? (
                <Skeleton className="h-3 w-16" />
              ) : (
                <span className="font-sans text-sidebar-foreground/70 text-xs">
                  {selectedApp ? 'Analytics' : 'Choose an app'}
                </span>
              )}
            </div>
            <HugeiconsIcon className="ml-auto size-4" icon={UnfoldMoreIcon} />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56" side="bottom">
          <DropdownMenuLabel className="font-sans">
            Switch Application
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isPending && (
            <DropdownMenuItem disabled>
              <span className="font-sans">Loading applications...</span>
            </DropdownMenuItem>
          )}
          {!isPending && apps.length === 0 && (
            <DropdownMenuItem disabled>
              <span className="font-sans">No apps available</span>
            </DropdownMenuItem>
          )}
          {!isPending &&
            apps.length > 0 &&
            apps.map((app) => {
              const isSelected = app.id === appId;
              return (
                <DropdownMenuItem
                  className={`my-0.5 ${isSelected ? 'bg-accent' : ''}`}
                  key={app.id}
                  onClick={() => handleAppSelect(app.id)}
                >
                  <span className="font-sans">{app.name}</span>
                  <HugeiconsIcon
                    className="ml-auto size-4"
                    icon={app.role === 'owner' ? UserSquareIcon : UserGroupIcon}
                  />
                </DropdownMenuItem>
              );
            })}
          <DropdownMenuSeparator />
          <CreateAppDialog onSuccess={handleAppSelect}>
            <DropdownMenuItem
              onSelect={(event) => event.preventDefault()}
              variant="success"
            >
              <HugeiconsIcon className="mr-2 size-4" icon={AddSquareIcon} />
              <span className="font-mono">Create New</span>
            </DropdownMenuItem>
          </CreateAppDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu modal={false} onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-14 items-center gap-3 rounded-lg border bg-background px-4 shadow-sm transition-colors hover:bg-accent"
          type="button"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HugeiconsIcon className="size-5" icon={ArtboardIcon} />
          </div>
          <div
            className="flex flex-col items-start gap-0.5 leading-none"
            suppressHydrationWarning
          >
            {isPending ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <span className="font-sans font-semibold text-sm">
                Select App
              </span>
            )}
            <span className="font-sans text-muted-foreground text-xs">
              Choose an app
            </span>
          </div>
          <HugeiconsIcon className="ml-2 size-4" icon={UnfoldMoreIcon} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" side="bottom">
        <DropdownMenuLabel>Switch Application</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isPending && (
          <DropdownMenuItem disabled>
            <span className="font-sans">Loading applications...</span>
          </DropdownMenuItem>
        )}
        {!isPending && apps.length === 0 && (
          <DropdownMenuItem disabled>
            <span className="font-sans">No apps available</span>
          </DropdownMenuItem>
        )}
        {!isPending &&
          apps.length > 0 &&
          apps.map((app) => {
            const isSelected = app.id === appId;
            return (
              <DropdownMenuItem
                className={`my-0.5 ${isSelected ? 'bg-accent' : ''}`}
                key={app.id}
                onClick={() => handleAppSelect(app.id)}
              >
                <span className="font-sans">{app.name}</span>
                <HugeiconsIcon
                  className="ml-auto size-4"
                  icon={app.role === 'owner' ? UserSquareIcon : UserGroupIcon}
                />
              </DropdownMenuItem>
            );
          })}
        <DropdownMenuSeparator />
        <CreateAppDialog onSuccess={handleAppSelect}>
          <DropdownMenuItem
            onSelect={(event) => event.preventDefault()}
            variant="success"
          >
            <HugeiconsIcon className="mr-2 size-4" icon={AddSquareIcon} />
            <span className="font-sans">Create New</span>
          </DropdownMenuItem>
        </CreateAppDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
