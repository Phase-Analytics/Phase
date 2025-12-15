'use client';

import {
  Activity03Icon,
  Blockchain05Icon,
  ComputerPhoneSyncIcon,
  CreditCardIcon,
  File02Icon,
  GithubIcon,
  GlobalIcon,
  Key01Icon,
  PlaySquareIcon,
  QuestionIcon,
  Setting07Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type { CommandItem } from '@/components/command-menu';
import { CommandMenu, CommandMenuTrigger } from '@/components/command-menu';
import { KeybindsDialog } from '@/components/keybinds-dialog';
import { ThemeTogglerButton } from '@/components/theme-toggler';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

export function DashboardHeader({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [appId] = useQueryState('app');
  const isRealtimePage = pathname === '/dashboard/analytics/realtime';

  const commandItems = useMemo<CommandItem[]>(() => {
    if (!appId) {
      return [
        {
          id: 'docs',
          name: 'Documentation',
          description: 'Browse guides and API references',
          category: 'Resources',
          icon: File02Icon,
          keywords: ['docs', 'documentation', 'help', 'guide'],
          path: '/docs',
          external: true,
        },
        {
          id: 'support',
          name: 'Support',
          description: 'Get help from our team',
          category: 'Resources',
          icon: QuestionIcon,
          keywords: ['support', 'help', 'contact'],
          path: '/support',
          external: true,
        },
        {
          id: 'status',
          name: 'Status',
          description: 'Check service status and uptime',
          category: 'Resources',
          icon: Activity03Icon,
          keywords: ['status', 'uptime', 'health', 'availability'],
          path: 'https://status.phase.sh',
          external: true,
        },
        {
          id: 'github',
          name: 'Github',
          description: 'View source code and contribute',
          category: 'Resources',
          icon: GithubIcon,
          keywords: ['github', 'source', 'code', 'repository'],
          path: 'https://github.com/phase-analytics/Phase/',
          external: true,
        },
        {
          id: 'billing',
          name: 'Billing',
          description: 'Manage your subscription',
          category: 'Account',
          icon: CreditCardIcon,
          keywords: ['billing', 'payment', 'subscription', 'invoice'],
          path: '/billing',
        },
      ];
    }

    return [
      {
        id: 'users',
        name: 'Users',
        description: 'Track user activity and engagement',
        category: 'Analytics',
        icon: ComputerPhoneSyncIcon,
        keywords: ['users', 'people', 'accounts', 'analytics'],
        path: `/dashboard/analytics/users?app=${appId}`,
      },
      {
        id: 'sessions',
        name: 'Sessions',
        description: 'Monitor user sessions',
        category: 'Analytics',
        icon: PlaySquareIcon,
        keywords: ['sessions', 'activity', 'analytics'],
        path: `/dashboard/analytics/sessions?app=${appId}`,
      },
      {
        id: 'events',
        name: 'Events',
        description: 'View tracked events and actions',
        category: 'Analytics',
        icon: Blockchain05Icon,
        keywords: ['events', 'tracking', 'analytics'],
        path: `/dashboard/analytics/events?app=${appId}`,
      },
      {
        id: 'realtime',
        name: 'Realtime',
        description: 'View realtime analytics',
        category: 'Analytics',
        icon: GlobalIcon,
        keywords: ['realtime', 'analytics', 'real-time'],
        path: `/dashboard/analytics/realtime?app=${appId}`,
      },
      {
        id: 'settings',
        name: 'Settings',
        description: 'Configure application settings',
        category: 'Application',
        icon: Setting07Icon,
        keywords: ['settings', 'configuration', 'preferences', 'app'],
        path: `/dashboard/application/settings?app=${appId}`,
      },
      {
        id: 'api-keys',
        name: 'API Keys',
        description: 'Manage API keys and tokens',
        category: 'Application',
        icon: Key01Icon,
        keywords: ['api', 'keys', 'tokens', 'credentials', 'authentication'],
        path: `/dashboard/application/api-keys?app=${appId}`,
      },
      {
        id: 'team',
        name: 'Team',
        description: 'Manage team members',
        category: 'Application',
        icon: UserGroupIcon,
        keywords: ['team', 'members', 'users', 'collaboration'],
        path: `/dashboard/application/team?app=${appId}`,
      },
      {
        id: 'docs',
        name: 'Documentation',
        description: 'Browse guides and API references',
        category: 'Resources',
        icon: File02Icon,
        keywords: ['docs', 'documentation', 'help', 'guide'],
        path: '/docs',
        external: true,
      },
      {
        id: 'support',
        name: 'Support',
        description: 'Get help from our team',
        category: 'Resources',
        icon: QuestionIcon,
        keywords: ['support', 'help', 'contact'],
        path: '/support',
        external: true,
      },
      {
        id: 'status',
        name: 'Status',
        description: 'Check service status and uptime',
        category: 'Resources',
        icon: Activity03Icon,
        keywords: ['status', 'uptime', 'health', 'availability'],
        path: 'https://status.phase.sh',
        external: true,
      },
      {
        id: 'github',
        name: 'Github',
        description: 'View source code and contribute',
        category: 'Resources',
        icon: GithubIcon,
        keywords: ['github', 'source', 'code', 'repository'],
        path: 'https://github.com/phase-analytics/Phase/',
        external: true,
      },
      {
        id: 'billing',
        name: 'Billing',
        description: 'Manage your subscription',
        category: 'Account',
        icon: CreditCardIcon,
        keywords: ['billing', 'payment', 'subscription', 'invoice'],
        path: '/billing',
      },
    ];
  }, [appId]);

  useEffect(() => {
    if (isMobile) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandMenuOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobile]);

  return (
    <>
      {!isRealtimePage && (
        <header className="flex h-14 shrink-0 items-center gap-4 border-b px-4">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <Image
              alt="Phase"
              className="h-10 w-auto md:h-12 lg:h-14 dark:hidden"
              height={100}
              priority
              src="/phase/light-typography.svg"
              width={150}
            />
            <Image
              alt="Phase"
              className="hidden h-10 w-auto md:h-12 lg:h-14 dark:block"
              height={100}
              priority
              src="/phase/dark-typography.svg"
              width={150}
            />
          </div>
          <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-2"> </div>
            <div className="flex items-center gap-2">
              {!isMobile && (
                <>
                  <KeybindsDialog />
                  <CommandMenuTrigger
                    onClick={() => setCommandMenuOpen(true)}
                  />
                </>
              )}
              <ThemeTogglerButton />
            </div>
          </div>
        </header>
      )}
      {!isMobile && (
        <CommandMenu
          items={commandItems}
          onOpenChange={setCommandMenuOpen}
          open={commandMenuOpen}
        />
      )}
      <div
        className={`flex flex-1 flex-col ${isRealtimePage ? 'p-4' : 'gap-4 p-4'}`}
      >
        {children}
      </div>
    </>
  );
}
