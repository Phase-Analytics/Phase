'use client';

import Intercom from '@intercom/messenger-js-sdk';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

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

    Intercom({
      app_id: 'las9xhwc',
    });
  }, [disabled]);

  return null;
};
