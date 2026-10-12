'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { runWhenIdle } from '@/lib/run-when-idle';

const INTERCOM_APP_ID = 'las9xhwc';
const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

function shutdownIntercom() {
  const intercom = (
    window as Window & {
      Intercom?: (command: string) => void;
    }
  ).Intercom;
  intercom?.('shutdown');
  intercom?.('hide');
}

export const IntercomMessenger = () => {
  const pathname = usePathname();
  const disabled = pathname?.startsWith('/p/') ?? false;

  useEffect(() => {
    if (disabled) {
      shutdownIntercom();
      return;
    }

    // The messenger widget is heavy; keep it off the critical path until the
    // browser is idle or the user first interacts, whichever comes first.
    let cancelled = false;
    let cancelIdle: (() => void) | undefined;

    const removeListeners = () => {
      cancelIdle?.();
      for (const type of INTERACTION_EVENTS) {
        window.removeEventListener(type, boot);
      }
    };

    function boot() {
      removeListeners();
      import('@intercom/messenger-js-sdk').then(({ default: Intercom }) => {
        if (!cancelled) {
          Intercom({ app_id: INTERCOM_APP_ID });
        }
      });
    }

    cancelIdle = runWhenIdle(boot, 4000);
    for (const type of INTERACTION_EVENTS) {
      window.addEventListener(type, boot, { passive: true });
    }

    return () => {
      cancelled = true;
      removeListeners();
    };
  }, [disabled]);

  return null;
};
