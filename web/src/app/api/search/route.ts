import { createSearchAPI } from 'fumadocs-core/search/server';
import { source } from '@/lib/docs-source';

type PageDataWithStructured = {
  structuredData?: {
    headings: Array<{ id: string; content: string }>;
    contents: Array<{ heading: string; content: string }>;
  };
};

export const { GET } = createSearchAPI('advanced', {
  indexes: source.getPages().map((page) => ({
    title: page.data.title ?? '',
    description: page.data.description ?? '',
    url: page.url,
    id: page.url,
    structuredData: (page.data as PageDataWithStructured).structuredData ?? {
      headings: [],
      contents: [],
    },
  })),
});
