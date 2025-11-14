'use client';

import {
  AddSquareIcon,
  Analytics01Icon,
  ArrowRight01Icon,
  ArtboardIcon,
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
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
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
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

type App = {
  id: string;
  name: string;
};

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
  const router = useRouter();
  const [avatarSrc, setAvatarSrc] = useState<string>('');
  const [isAvatarLoaded, setIsAvatarLoaded] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [isLoadingApp, setIsLoadingApp] = useState(true);

  const username = 'berk@example.com';

  const apps: App[] = useMemo(
    () => [
      { id: '1', name: 'Artover' },
      { id: '2', name: 'Telemetra' },
    ],
    []
  );

  useEffect(() => {
    const pathParts = pathname.split('/');
    const appIdFromUrl = pathParts.at(-1);

    if (apps.some((app) => app.id === appIdFromUrl)) {
      setSelectedAppId(appIdFromUrl ?? null);
    }

    setIsLoadingApp(false);
  }, [pathname, apps]);

  const selectedApp = apps.find((app) => app.id === selectedAppId);

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
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={selectedApp ? selectedApp.name : 'Select an App'}
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <HugeiconsIcon className="size-4" icon={ArtboardIcon} />
                  </div>
                  {isLoadingApp ? (
                    <div className="flex flex-col gap-1 leading-none">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5 leading-none">
                      <span className="font-semibold">
                        {selectedApp ? selectedApp.name : 'Select an App'}
                      </span>
                      <span className="text-sidebar-foreground/70 text-xs">
                        {selectedApp ? 'Analytics' : 'No app selected'}
                      </span>
                    </div>
                  )}
                  <HugeiconsIcon
                    className="ml-auto size-4"
                    icon={UnfoldMoreIcon}
                  />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56" side="bottom">
                <DropdownMenuLabel>Switch App</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {apps.map((app) => (
                  <DropdownMenuItem
                    key={app.id}
                    onClick={() => {
                      setSelectedAppId(app.id);
                      router.push(`/dashboard/${app.id}`);
                    }}
                  >
                    {app.name}
                    <HugeiconsIcon
                      className="ml-auto size-4"
                      icon={ArrowRight01Icon}
                    />
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="success">
                  <HugeiconsIcon className="mr-2 size-4" icon={AddSquareIcon} />
                  Create New App
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                  {selectedAppId ? (
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.includes(item.path)}
                      tooltip={item.tooltip}
                    >
                      <Link href={`${item.path}/${selectedAppId}`}>
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
                  {selectedAppId ? (
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.includes(item.path)}
                      tooltip={item.tooltip}
                    >
                      <Link href={`${item.path}/${selectedAppId}`}>
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
                  {selectedAppId ? (
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.includes(item.path)}
                      tooltip={item.tooltip}
                    >
                      <Link href={`${item.path}/${selectedAppId}`}>
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
        <SidebarSeparator />
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
