import type { LinkDetail } from '@phase/shared';
import { getLinkOgImageSrc } from '@/lib/link-og-image-url';

export type LinkOgPreviewContent = {
  title: string;
  description: string;
  siteLabel: string;
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
  link: Pick<
    LinkDetail,
    | 'destinationUrl'
    | 'slug'
    | 'ogTitle'
    | 'ogDescription'
    | 'ogImageUrl'
    | 'updatedAt'
  >,
  siteLabel: string
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
    siteLabel,
    imageSrc: getLinkOgImageSrc(link.ogImageUrl, link.updatedAt),
  };
}
