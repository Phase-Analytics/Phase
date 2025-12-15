import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { baseOptions } from '@/app/docs/docs-layout';
import { source } from '@/app/docs/docs-source';
import { DocsBodyClass } from './docs-body-class';

export const metadata: Metadata = {
  title: {
    template: '%s',
    default: 'Documentation | Phase Docs',
  },
  openGraph: {
    images: undefined,
  },
  twitter: {
    images: undefined,
  },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="font-sans">
      <DocsBodyClass />
      <RootProvider>
        <DocsLayout tree={source.pageTree} {...baseOptions}>
          {children}
        </DocsLayout>
      </RootProvider>
    </div>
  );
}
