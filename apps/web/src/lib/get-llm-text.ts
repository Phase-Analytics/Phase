import type { InferPageType } from 'fumadocs-core/source';
import type { source } from '@/app/docs/docs-source';

type PageDataWithText = {
  title: string;
  getText: (type: 'raw' | 'processed') => Promise<string>;
};

export async function getLLMText(page: InferPageType<typeof source>) {
  const data = page.data as PageDataWithText;
  const processed = await data.getText('processed');

  return `# ${data.title} (${page.url})

${processed}`;
}
