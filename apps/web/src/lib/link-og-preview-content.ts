import { getLinkOgImageSrc } from '@/lib/link-og-image-url';

export type LinkOgPreviewSource = {
  destinationUrl: string;
  slug: string;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageUrl: string | null;
  updatedAt: string;
};

export type LinkOgPreviewContent = {
  title: string;
  description: string;
  imageSrc: string | undefined;
};

const HTTP_PREFIX_RE = /^https?:\/\//i;

function normalizeDestinationUrl(destinationUrl: string): string {
  if (HTTP_PREFIX_RE.test(destinationUrl)) {
    return destinationUrl;
  }
  return `https://${destinationUrl}`;
}

export function resolveLinkOgPreviewContent(
  link: LinkOgPreviewSource
): LinkOgPreviewContent {
  let title = link.ogTitle?.trim();
  if (!title) {
    try {
      title = new URL(normalizeDestinationUrl(link.destinationUrl)).hostname;
    } catch {
      title = link.slug;
    }
  }

  const description =
    link.ogDescription?.trim() ||
    `Visit ${title} — shared via your Phase short link.`;

  return {
    title,
    description,
    imageSrc: getLinkOgImageSrc(link.ogImageUrl, link.updatedAt),
  };
}
