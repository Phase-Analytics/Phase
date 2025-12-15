import { docs } from 'fumadocs-mdx:collections/server';
import {
  BookOpen01Icon,
  DiscoverSquareIcon,
  ServerStack03Icon,
  SourceCodeSquareIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { type InferPageType, loader } from 'fumadocs-core/source';
import { createElement } from 'react';

const icons = {
  DiscoverSquareIcon,
  SourceCodeSquareIcon,
  BookOpen01Icon,
  ViewIcon,
  ServerStack03Icon,
};

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  icon(icon) {
    if (!(icon && icon in icons)) {
      return;
    }
    return createElement(HugeiconsIcon, {
      icon: icons[icon as keyof typeof icons],
      size: 16,
    });
  },
});

export function getPageImage(page: InferPageType<typeof source>) {
  const segments = [...page.slugs, 'phase-docs.png'];

  return {
    segments,
    url: `/og/docs/${segments.join('/')}`,
  };
}
