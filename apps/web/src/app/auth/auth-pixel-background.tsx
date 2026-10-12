'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { runWhenIdle } from '@/lib/run-when-idle';

const PixelBlast = dynamic(() => import('@/components/ui/pixelblast'), {
  ssr: false,
});

// Matches the `lg:block` container; the effect is never visible below it.
const ENABLED_QUERY =
  '(min-width: 1024px) and (prefers-reduced-motion: no-preference)';

export function AuthPixelBackground() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(ENABLED_QUERY);
    let cancelIdle: (() => void) | undefined;

    const update = () => {
      cancelIdle?.();
      cancelIdle = undefined;
      if (mql.matches) {
        cancelIdle = runWhenIdle(() => setEnabled(true));
      } else {
        setEnabled(false);
      }
    };

    update();
    mql.addEventListener('change', update);
    return () => {
      mql.removeEventListener('change', update);
      cancelIdle?.();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed top-0 right-0 hidden h-screen w-[70%] lg:block">
      <div className="h-full w-full [mask-image:linear-gradient(to_right,black_35%,black_100%)]">
        {enabled && (
          <PixelBlast
            enableRipples={false}
            patternScale={5}
            pixelSize={3}
            speed={1}
          />
        )}
      </div>
    </div>
  );
}
