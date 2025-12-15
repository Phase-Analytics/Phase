'use client';

import { useTheme } from 'next-themes';
import { useEffect } from 'react';

export function ForceDarkTheme({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme('dark');
  }, [setTheme]);

  return <>{children}</>;
}
