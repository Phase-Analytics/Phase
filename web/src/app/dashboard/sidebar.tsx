'use client';

import {
  AddSquareIcon,
  Analytics01Icon,
  ArrowRight01Icon,
  ArtboardIcon,
  Logout01Icon,
  UnfoldMoreIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { minidenticon } from 'minidenticons';
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
} from '@/components/ui/sidebar';

export function DashboardSidebar() {
  const [avatarSrc, setAvatarSrc] = useState<string>('');
  const [isAvatarLoaded, setIsAvatarLoaded] = useState(false);

  const username = 'berk@example.com';

  const generatedAvatar = useMemo(
    () =>
      `data:image/svg+xml;utf8,${encodeURIComponent(
        minidenticon(username, 60, 50)
      )}`,
    []
  );

  useEffect(() => {
    // Client-side only avatar generation
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip="Telemetra">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <HugeiconsIcon className="size-4" icon={ArtboardIcon} />
                  </div>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="font-semibold">Telemetra</span>
                    <span className="text-sidebar-foreground/70 text-xs">
                      Analytics
                    </span>
                  </div>
                  <HugeiconsIcon
                    className="ml-auto size-4"
                    icon={UnfoldMoreIcon}
                  />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56" side="bottom">
                <DropdownMenuLabel>Switch App</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  Artover
                  <HugeiconsIcon
                    className="ml-auto size-4"
                    icon={ArrowRight01Icon}
                  />
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Telemetra
                  <HugeiconsIcon
                    className="ml-auto size-4"
                    icon={ArrowRight01Icon}
                  />
                </DropdownMenuItem>
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
              <SidebarMenuItem>
                <SidebarMenuButton isActive tooltip="Overview">
                  <HugeiconsIcon icon={Analytics01Icon} />
                  <span>Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip="Account">
                  <Avatar className="size-8 ring-2 ring-sidebar-border ring-offset-1 ring-offset-sidebar">
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
