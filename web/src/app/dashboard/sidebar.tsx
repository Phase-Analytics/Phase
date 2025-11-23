'use client';

import {
  Activity03Icon,
  ChatEditIcon,
  ComputerPhoneSyncIcon,
  CreditCardIcon,
  File02Icon,
  GithubIcon,
  HelpSquareIcon,
  Key01Icon,
  Logout01Icon,
  PlaySquareIcon,
  PresentationLineChart01Icon,
  Setting07Icon,
  UnfoldMoreIcon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { minidenticon } from 'minidenticons';
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
import { authClient, useSession } from '@/lib/auth';
import { queryClient } from '@/lib/queries/query-client';

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
    label: 'Events',
    icon: PresentationLineChart01Icon,
    path: '/dashboard/analytics/events',
    tooltip: 'Events',
  },
];

const reportsNavItems: NavItem[] = [
  {
    label: 'Feedbacks',
    icon: ChatEditIcon,
    path: '/dashboard/reports/feedbacks',
    tooltip: 'Feedbacks',
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
    icon: HelpSquareIcon,
    path: '/support',
    tooltip: 'Support',
  },
  {
    label: 'Status',
    icon: Activity03Icon,
    path: 'https://status.telemetra.dev',
    tooltip: 'Status',
  },
  {
    label: 'Github',
    icon: GithubIcon,
    path: 'https://github.com',
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
    queryClient.clear();
  };

  return (
    <Sidebar
      animateOnHover={false}
      collapsible="icon"
      side="left"
      variant="inset"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <AppSwitcher
              onMobileClose={() => {
                if (isMobile) {
                  setOpenMobile(false);
                }
              }}
              variant="sidebar"
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Analytics</SidebarGroupLabel>
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
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton disabled tooltip={item.tooltip}>
                      <HugeiconsIcon icon={item.icon} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reportsNavItems.map((item) => (
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
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton disabled tooltip={item.tooltip}>
                      <HugeiconsIcon icon={item.icon} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {applicationNavItems.map((item) => (
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
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton disabled tooltip={item.tooltip}>
                      <HugeiconsIcon icon={item.icon} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
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
                  <span>{item.label}</span>
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
                  className={`transition-opacity duration-300 ${
                    isUserLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  size="lg"
                  tooltip="Account"
                >
                  <Avatar className="size-8">
                    <AvatarImage alt={username} src={avatarSrc} />
                    <AvatarFallback className="bg-transparent" />
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold text-sm">{displayName}</span>
                    <span className="text-sidebar-foreground/70 text-xs">
                      {username}
                    </span>
                  </div>
                  <HugeiconsIcon
                    className="ml-auto size-4"
                    icon={UnfoldMoreIcon}
                  />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56" side="top">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <HugeiconsIcon
                    className="mr-2 size-4"
                    icon={CreditCardIcon}
                  />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} variant="destructive">
                  <HugeiconsIcon className="mr-2 size-4" icon={Logout01Icon} />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
