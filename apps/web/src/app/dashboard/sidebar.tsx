'use client';

import {
  Activity03Icon,
  ComputerPhoneSyncIcon,
  CreditCardIcon,
  CursorPointer02Icon,
  CustomerSupportIcon,
  File02Icon,
  GithubIcon,
  GlobalIcon,
  Key01Icon,
  Layers01Icon,
  Logout01Icon,
  PlaySquareIcon,
  PyramidStructure02Icon,
  Setting07Icon,
  UnfoldMoreIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { minidenticon } from 'minidenticons';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { useEffect, useMemo, useState } from 'react';
import { AppSwitcher } from '@/components/app-switcher';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { UserSettings } from '@/components/user-settings';
import { authClient, useSession } from '@/lib/auth';
import { getQueryClient } from '@/lib/queries/query-client';

type NavItem = {
  label: string;
  icon: typeof ComputerPhoneSyncIcon;
  path: string;
  tooltip: string;
};

const analyticsNavItems: NavItem[] = [
  {
    label: 'Users',
    icon: ComputerPhoneSyncIcon,
    path: '/dashboard/analytics/users',
    tooltip: 'Users',
  },
  {
    label: 'Sessions',
    icon: PlaySquareIcon,
    path: '/dashboard/analytics/sessions',
    tooltip: 'Sessions',
  },
  {
    label: 'Activity',
    icon: CursorPointer02Icon,
    path: '/dashboard/analytics/activity',
    tooltip: 'Activity',
  },
  {
    label: 'Realtime',
    icon: GlobalIcon,
    path: '/dashboard/analytics/realtime',
    tooltip: 'Realtime',
  },
];

const comingSoonNavItems = [
  {
    label: 'Segments',
    icon: Layers01Icon,
    tooltip: 'Segments - Coming Soon',
  },
  {
    label: 'Funnels',
    icon: PyramidStructure02Icon,
    tooltip: 'Funnels - Coming Soon',
  },
];

const applicationNavItems: NavItem[] = [
  {
    label: 'Settings',
    icon: Setting07Icon,
    path: '/dashboard/application/settings',
    tooltip: 'Settings',
  },
  {
    label: 'API Keys',
    icon: Key01Icon,
    path: '/dashboard/application/api-keys',
    tooltip: 'API Keys',
  },
  {
    label: 'Team',
    icon: UserGroupIcon,
    path: '/dashboard/application/team',
    tooltip: 'Team',
  },
];

const footerNavItems: NavItem[] = [
  {
    label: 'Docs',
    icon: File02Icon,
    path: '/docs',
    tooltip: 'Docs',
  },
  {
    label: 'Support',
    icon: CustomerSupportIcon,
    path: '/support',
    tooltip: 'Support',
  },
  {
    label: 'Status',
    icon: Activity03Icon,
    path: 'https://status.phase.sh',
    tooltip: 'Status',
  },
  {
    label: 'Github',
    icon: GithubIcon,
    path: 'https://github.com/Phase-Analytics/Phase/',
    tooltip: 'Github',
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [appId] = useQueryState('app');
  const { isMobile, setOpenMobile } = useSidebar();

  const user = session?.user;
  const username = user?.email || 'User';
  const displayName = user?.name || username.split('@')[0];

  const avatarSrc = useMemo(
    () =>
      `data:image/svg+xml;utf8,${encodeURIComponent(
        minidenticon(username, 55, 45)
      )}`,
    [username]
  );

  useEffect(() => {
    if (!isPending && session) {
      setIsUserLoaded(true);
    }
  }, [isPending, session]);

  useEffect(() => {
    const userId = session?.user?.id;
    const prevUserId = sessionStorage.getItem('prevUserId');

    if (userId && prevUserId && userId !== prevUserId) {
      const queryClient = getQueryClient();
      queryClient.clear();
    }

    if (userId) {
      sessionStorage.setItem('prevUserId', userId);
    } else {
      sessionStorage.removeItem('prevUserId');
    }
  }, [session?.user?.id]);

  const handleLogout = async () => {
    await authClient.signOut();
    const queryClient = getQueryClient();
    queryClient.clear();
  };

  return (
    <Sidebar
      animateOnHover={false}
      collapsible="icon"
      side="left"
      variant="inset"
    >
      {!isMobile && (
        <SidebarHeader className="py-1 group-data-[collapsible=icon]:py-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                className="h-10 hover:bg-transparent! active:bg-transparent! data-highlight:bg-transparent!"
                size="lg"
              >
                <Link href="https://phase.sh" target="_blank">
                  <div className="hidden size-8 items-center justify-center group-data-[collapsible=icon]:flex">
                    <Image
                      alt="Phase"
                      className="size-7 dark:hidden"
                      height={28}
                      priority
                      src="/light-logo.svg"
                      width={28}
                    />
                    <Image
                      alt="Phase"
                      className="hidden size-7 dark:block"
                      height={28}
                      priority
                      src="/logo.svg"
                      width={28}
                    />
                  </div>
                  <div className="flex items-center group-data-[collapsible=icon]:hidden">
                    <Image
                      alt="Phase"
                      className="h-12 w-auto dark:hidden"
                      height={100}
                      priority
                      src="/light-typography.svg"
                      width={150}
                    />
                    <Image
                      alt="Phase"
                      className="hidden h-14 w-auto dark:block"
                      height={100}
                      priority
                      src="/typography.svg"
                      width={150}
                    />
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
      )}

      {isMobile && (
        <div className="px-2 py-2">
          <AppSwitcher
            onMobileClose={() => setOpenMobile(false)}
            variant="sidebar"
          />
        </div>
      )}

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>ANALYTICS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {analyticsNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  {appId ? (
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.includes(item.path)}
                      tooltip={item.tooltip}
                    >
                      <Link
                        href={`${item.path}?app=${appId}`}
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        <HugeiconsIcon icon={item.icon} />
                        <span className="font-sans">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton disabled tooltip={item.tooltip}>
                      <HugeiconsIcon icon={item.icon} />
                      <span className="font-sans">{item.label}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
              {comingSoonNavItems.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    className="cursor-not-allowed opacity-50"
                    tooltip={item.tooltip}
                  >
                    <HugeiconsIcon icon={item.icon} />
                    <span className="font-sans">{item.label}</span>
                    <span className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      SOON
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>APPLICATION</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {applicationNavItems.map((item) => {
                const shouldEnable = appId;

                if (!shouldEnable) {
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton disabled tooltip={item.tooltip}>
                        <HugeiconsIcon icon={item.icon} />
                        <span className="font-sans">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }

                const href = `${item.path}?app=${appId}`;

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.includes(item.path)}
                      tooltip={item.tooltip}
                    >
                      <Link
                        href={href}
                        onClick={() => {
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
                        <HugeiconsIcon icon={item.icon} />
                        <span className="font-sans">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Separator className="group-data-[collapsible=icon]:hidden" />
        <SidebarMenu>
          {footerNavItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton asChild size="sm" tooltip={item.tooltip}>
                <Link
                  href={item.path}
                  onClick={() => {
                    if (isMobile) {
                      setOpenMobile(false);
                    }
                  }}
                  prefetch={false}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <HugeiconsIcon icon={item.icon} />
                  <span className="font-sans">{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className={`overflow-visible! transition-opacity duration-300 group-data-[collapsible=icon]:justify-center ${
                    isUserLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  size="lg"
                  tooltip="Account"
                >
                  <div className="flex shrink-0 items-center justify-center p-0.5">
                    <Avatar className="size-8">
                      <AvatarImage alt={username} src={avatarSrc} />
                      <AvatarFallback className="bg-transparent" />
                    </Avatar>
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
                    <span className="font-sans font-semibold text-sm">
                      {displayName}
                    </span>
                    <span className="font-sans text-sidebar-foreground/70 text-xs">
                      {username}
                    </span>
                  </div>
                  <HugeiconsIcon
                    className="ml-auto size-4 group-data-[collapsible=icon]:hidden"
                    icon={UnfoldMoreIcon}
                  />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56" side="top">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <UserSettings>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <HugeiconsIcon
                      className="mr-2 size-4"
                      icon={Setting07Icon}
                    />
                    <span className="font-sans">User Settings</span>
                  </DropdownMenuItem>
                </UserSettings>
                <DropdownMenuItem>
                  <HugeiconsIcon
                    className="mr-2 size-4"
                    icon={CreditCardIcon}
                  />
                  <span className="font-sans">Billing</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} variant="destructive">
                  <HugeiconsIcon className="mr-2 size-4" icon={Logout01Icon} />
                  <span className="font-sans">Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
