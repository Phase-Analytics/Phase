'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';

type ThemeProviderProps = {
  children: ReactNode;
  forceTheme?: 'light' | 'dark';
};

export function ThemeProvider({ children, forceTheme }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      disableTransitionOnChange
      enableSystem={false}
      forcedTheme={forceTheme}
      themes={['light', 'dark']}
    >
      {children}
    </NextThemesProvider>
  );
}
