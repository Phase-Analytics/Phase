'use client';

import type { ReactNode } from 'react';
import { ThemeTogglerButton } from '@/components/theme-toggler';
import { SidebarTrigger } from '@/components/ui/sidebar';

export function DashboardHeader({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger />
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-lg">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeTogglerButton />
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
    </>
  );
}
