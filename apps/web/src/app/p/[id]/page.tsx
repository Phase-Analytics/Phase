import type { PublicPolicyResponse } from '@phase/shared';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MarkdownContent } from '@/components/policies/markdown-content';
import { API_URL } from '@/lib/api/client';
import { createMetadata, siteConfig } from '@/lib/seo';

type PageProps = {
  params: Promise<{ id: string }>;
};

async function fetchPublicPolicy(
  id: string
): Promise<PublicPolicyResponse | null> {
  const response = await fetch(
    `${API_URL}/public/policies/${encodeURIComponent(id)}`,
    {
      next: { revalidate: 60 },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load policy (${response.status})`);
  }

  return (await response.json()) as PublicPolicyResponse;
}

function formatDisplayDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const policy = await fetchPublicPolicy(id);

  if (!policy) {
    return createMetadata({
      title: 'Policy not found',
      noIndex: true,
    });
  }

  const description = policy.appName
    ? `${policy.name} for ${policy.appName}`
    : policy.name;

  return createMetadata({
    title: policy.name,
    description,
    canonical: `${siteConfig.url}/p/${policy.id}`,
    noIndex: true,
  });
}

export default async function PublicPolicyPage({ params }: PageProps) {
  const { id } = await params;
  const policy = await fetchPublicPolicy(id);

  if (!policy) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-border border-b">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4 sm:px-6">
          <Link className="flex items-center gap-2" href="/">
            <Image
              alt="Phase"
              className="dark:invert"
              height={20}
              src="/logo.svg"
              width={20}
            />
            <span className="font-semibold text-sm tracking-tight">Phase</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 space-y-2">
          <h1 className="font-semibold text-3xl tracking-tight sm:text-4xl">
            {policy.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Last updated {formatDisplayDate(policy.date)}
            {policy.appName ? ` · ${policy.appName}` : null}
          </p>
        </div>

        <MarkdownContent content={policy.content} />
      </main>
    </div>
  );
}
