import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { baseOptions } from '@/lib/docs-layout';
import { source } from '@/lib/docs-source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="font-sans">
      <DocsLayout tree={source.pageTree} {...baseOptions}>
        {children}
      </DocsLayout>
    </div>
  );
}
