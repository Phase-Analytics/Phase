import {
  Activity03Icon,
  BrowserIcon,
  GithubIcon,
  HeadsetIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { DocsLayoutProps } from 'fumadocs-ui/layouts/docs';
import { createElement } from 'react';

export const baseOptions: Omit<DocsLayoutProps, 'tree'> = {
  nav: {
    title: 'Telemetra Docs',
  },
  sidebar: {
    prefetch: false,
    defaultOpenLevel: Number.POSITIVE_INFINITY,
  },
  links: [
    {
      type: 'icon',
      text: 'Website',
      icon: createElement(HugeiconsIcon, { icon: BrowserIcon, size: 20 }),
      url: 'https://telemetra.dev',
      external: true,
    },
    {
      type: 'icon',
      text: 'GitHub',
      icon: createElement(HugeiconsIcon, { icon: GithubIcon, size: 20 }),
      url: 'https://github.com/berkinory/Telemetra',
      external: true,
    },
    {
      type: 'icon',
      text: 'Status',
      icon: createElement(HugeiconsIcon, { icon: Activity03Icon, size: 20 }),
      url: 'https://status.telemetra.dev',
      external: true,
    },
    {
      type: 'icon',
      text: 'Support',
      icon: createElement(HugeiconsIcon, { icon: HeadsetIcon, size: 20 }),
      url: 'mailto:support@telemetra.dev',
      external: true,
    },
  ],
};
