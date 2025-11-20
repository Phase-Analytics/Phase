'use client';

import {
  AddSquareIcon,
  ArrowRight01Icon,
  ArtboardIcon,
  CheckmarkCircle02Icon,
  UnfoldMoreIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useRouter } from 'next/navigation';
import { useQueryState } from 'nuqs';
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
  const { data: appsData, isLoading } = useApps();

  const apps = appsData?.apps || [];
  const selectedApp = apps.find((app) => app.id === appId);

  const handleAppSelect = (id: string) => {
    setAppId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastSelectedApp', id);
    }
    router.push(`/dashboard/analytics/overview?app=${id}`);
    onMobileClose?.();
  };

  if (variant === 'sidebar') {
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            tooltip={selectedApp ? selectedApp.name : 'Select App'}
          >
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HugeiconsIcon className="size-4" icon={ArtboardIcon} />
            </div>
            <div className="flex flex-col gap-0.5 leading-none">
              {isLoading ? (
                <Skeleton className="h-4 w-20" />
              ) : (
                <span className="font-semibold">
                  {selectedApp ? selectedApp.name : 'Select App'}
                </span>
              )}
              <span className="text-sidebar-foreground/70 text-xs">
                {selectedApp ? 'Analytics' : 'to get started'}
              </span>
            </div>
            <HugeiconsIcon className="ml-auto size-4" icon={UnfoldMoreIcon} />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56" side="bottom">
          <DropdownMenuLabel>Switch App</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isLoading && (
            <DropdownMenuItem disabled>Loading apps...</DropdownMenuItem>
          )}
          {!isLoading && apps.length === 0 && (
            <DropdownMenuItem disabled>No apps available</DropdownMenuItem>
          )}
          {!isLoading &&
            apps.length > 0 &&
            apps.map((app) => {
              const isSelected = app.id === appId;
              return (
                <DropdownMenuItem
                  className={isSelected ? 'bg-accent' : ''}
                  key={app.id}
                  onClick={() => handleAppSelect(app.id)}
                >
                  {app.name}
                  <HugeiconsIcon
                    className="ml-auto size-4"
                    icon={isSelected ? CheckmarkCircle02Icon : ArrowRight01Icon}
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
              Create New App
            </DropdownMenuItem>
          </CreateAppDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-14 items-center gap-3 rounded-lg border bg-background px-4 shadow-sm transition-colors hover:bg-accent"
          type="button"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HugeiconsIcon className="size-5" icon={ArtboardIcon} />
          </div>
          <div className="flex flex-col items-start gap-0.5 leading-none">
            {isLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <span className="font-semibold text-sm">Select App</span>
            )}
            <span className="text-muted-foreground text-xs">
              Choose from your applications
            </span>
          </div>
          <HugeiconsIcon className="ml-2 size-4" icon={UnfoldMoreIcon} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" side="bottom">
        <DropdownMenuLabel>Switch App</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading && (
          <DropdownMenuItem disabled>Loading apps...</DropdownMenuItem>
        )}
        {!isLoading && apps.length === 0 && (
          <DropdownMenuItem disabled>No apps available</DropdownMenuItem>
        )}
        {!isLoading &&
          apps.length > 0 &&
          apps.map((app) => {
            const isSelected = app.id === appId;
            return (
              <DropdownMenuItem
                className={isSelected ? 'bg-accent' : ''}
                key={app.id}
                onClick={() => handleAppSelect(app.id)}
              >
                {app.name}
                <HugeiconsIcon
                  className="ml-auto size-4"
                  icon={isSelected ? CheckmarkCircle02Icon : ArrowRight01Icon}
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
            Create New App
          </DropdownMenuItem>
        </CreateAppDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
