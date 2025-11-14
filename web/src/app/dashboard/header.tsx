'use client';

import {
  Analytics01Icon,
  Blockchain05Icon,
  ChatEditIcon,
  ComputerPhoneSyncIcon,
  CreditCardIcon,
  File02Icon,
  GithubIcon,
  Key01Icon,
  PlaySquareIcon,
  QuestionIcon,
  Setting07Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { usePathname } from 'next/navigation';
import { useQueryState } from 'nuqs';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type { CommandItem } from '@/components/command-menu';
import { CommandMenu, CommandMenuTrigger } from '@/components/command-menu';
import { ThemeTogglerButton } from '@/components/theme-toggler';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

export function DashboardHeader({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const _pathname = usePathname();
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [appId] = useQueryState('app');

  const commandItems = useMemo<CommandItem[]>(() => {
    if (!appId) {
      return [
        {
          id: 'docs',
          name: 'Documentation',
          icon: File02Icon,
          keywords: ['docs', 'documentation', 'help', 'guide'],
          path: '/docs',
        },
        {
          id: 'support',
          name: 'Support',
          icon: QuestionIcon,
          keywords: ['support', 'help', 'contact'],
          path: '/support',
        },
        {
          id: 'github',
          name: 'Github',
          icon: GithubIcon,
          keywords: ['github', 'source', 'code', 'repository'],
          path: 'https://github.com',
        },
        {
          id: 'billing',
          name: 'Billing',
          icon: CreditCardIcon,
          keywords: ['billing', 'payment', 'subscription', 'invoice'],
          path: '/billing',
        },
      ];
    }

    return [
      {
        id: 'overview',
        name: 'Overview',
        icon: Analytics01Icon,
        keywords: ['overview', 'analytics', 'dashboard', 'stats'],
        path: `/dashboard/analytics/overview?app=${appId}`,
      },
      {
        id: 'users',
        name: 'Users',
        icon: ComputerPhoneSyncIcon,
        keywords: ['users', 'people', 'accounts', 'analytics'],
        path: `/dashboard/analytics/users?app=${appId}`,
      },
      {
        id: 'sessions',
        name: 'Sessions',
        icon: PlaySquareIcon,
        keywords: ['sessions', 'activity', 'analytics'],
        path: `/dashboard/analytics/sessions?app=${appId}`,
      },
      {
        id: 'events',
        name: 'Events',
        icon: Blockchain05Icon,
        keywords: ['events', 'tracking', 'analytics'],
        path: `/dashboard/analytics/events?app=${appId}`,
      },
      {
        id: 'feedbacks',
        name: 'Feedbacks',
        icon: ChatEditIcon,
        keywords: ['feedbacks', 'reports', 'comments', 'reviews'],
        path: `/dashboard/reports/feedbacks?app=${appId}`,
      },
      {
        id: 'settings',
        name: 'Settings',
        icon: Setting07Icon,
        keywords: ['settings', 'configuration', 'preferences', 'app'],
        path: `/dashboard/application/settings?app=${appId}`,
      },
      {
        id: 'api-keys',
        name: 'API Keys',
        icon: Key01Icon,
        keywords: ['api', 'keys', 'tokens', 'credentials', 'authentication'],
        path: `/dashboard/application/api-keys?app=${appId}`,
      },
      {
        id: 'team',
        name: 'Team',
        icon: UserGroupIcon,
        keywords: ['team', 'members', 'users', 'collaboration'],
        path: `/dashboard/application/team?app=${appId}`,
      },
      {
        id: 'docs',
        name: 'Documentation',
        icon: File02Icon,
        keywords: ['docs', 'documentation', 'help', 'guide'],
        path: '/docs',
      },
      {
        id: 'support',
        name: 'Support',
        icon: QuestionIcon,
        keywords: ['support', 'help', 'contact'],
        path: '/support',
      },
      {
        id: 'github',
        name: 'Github',
        icon: GithubIcon,
        keywords: ['github', 'source', 'code', 'repository'],
        path: 'https://github.com',
      },
      {
        id: 'billing',
        name: 'Billing',
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
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-2"> </div>
          <div className="flex items-center gap-2">
            {!isMobile && (
              <CommandMenuTrigger onClick={() => setCommandMenuOpen(true)} />
            )}
            <ThemeTogglerButton />
          </div>
        </div>
      </header>
      {!isMobile && (
        <CommandMenu
          items={commandItems}
          onOpenChange={setCommandMenuOpen}
          open={commandMenuOpen}
        />
      )}
      <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
    </>
  );
}
