import { DocsBody, DocsPage } from 'fumadocs-ui/page';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPageImage, source } from '@/app/docs/docs-source';

type PageDataWithContent = {
  body: React.ComponentType;
  toc?: Array<{ title: string; url: string; depth: number }>;
};

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    notFound();
  }

  const MDX = (page.data as PageDataWithContent).body;

  return (
    <DocsPage toc={(page.data as PageDataWithContent).toc}>
      <DocsBody>
        <h1>{page.data.title}</h1>
        <MDX />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) {
    notFound();
  }

  return {
    title: `${page.data.title} | Telemetra`,
    description: page.data.description,
    openGraph: {
      title: `${page.data.title} | Telemetra`,
      images: getPageImage(page).url,
    },
  };
}
