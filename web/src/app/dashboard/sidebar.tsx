'use client';

import {
  Analytics01Icon,
  Blockchain05Icon,
  BubbleChatIcon,
  ChatEditIcon,
  ComputerPhoneSyncIcon,
  CreditCardIcon,
  File02Icon,
  GithubIcon,
  Key01Icon,
  Logout01Icon,
  PlaySquareIcon,
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

type NavItem = {
  label: string;
  icon: typeof Analytics01Icon;
  path: string;
  tooltip: string;
};

const analyticsNavItems: NavItem[] = [
  {
    label: 'Overview',
    icon: Analytics01Icon,
    path: '/dashboard/analytics/overview',
    tooltip: 'Overview',
  },
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
    icon: Blockchain05Icon,
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
    icon: BubbleChatIcon,
    path: '/support',
    tooltip: 'Support',
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
  const [avatarSrc, setAvatarSrc] = useState<string>('');
  const [isAvatarLoaded, setIsAvatarLoaded] = useState(false);
  const [appId] = useQueryState('app');
  const { isMobile, setOpenMobile } = useSidebar();

  const username = 'berk@example.com';

  const generatedAvatar = useMemo(
    () =>
      `data:image/svg+xml;utf8,${encodeURIComponent(
        minidenticon(username, 55, 45)
      )}`,
    []
  );

  useEffect(() => {
    setAvatarSrc(generatedAvatar);
  }, [generatedAvatar]);

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
              <SidebarMenuButton tooltip={item.tooltip}>
                <HugeiconsIcon icon={item.icon} />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip="Account">
                  <Avatar className="size-8">
                    {avatarSrc && (
                      <AvatarImage
                        alt={username}
                        className={`transition-opacity duration-300 ${
                          isAvatarLoaded ? 'opacity-100' : 'opacity-0'
                        }`}
                        onLoad={() => setIsAvatarLoaded(true)}
                        src={avatarSrc}
                      />
                    )}
                    <AvatarFallback className="bg-transparent" />
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold text-sm">Berk</span>
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
                <DropdownMenuItem variant="destructive">
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
