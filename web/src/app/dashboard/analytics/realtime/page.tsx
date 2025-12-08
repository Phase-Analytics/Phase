'use client';

import { useEffect } from 'react';
import { RealtimeActivityFeed } from '@/components/realtime/realtime-activity-feed';
import { RequireApp } from '@/components/require-app';
import { useSidebar } from '@/components/ui/sidebar';

export default function RealtimePage() {
  const { setOpen, isMobile } = useSidebar();

  useEffect(() => {
    if (!isMobile) {
      setOpen(false);
    }
  }, [isMobile, setOpen]);

  return (
    <RequireApp>
      <div className="flex flex-1 flex-col">
        <RealtimeActivityFeed />
      </div>
    </RequireApp>
  );
}
