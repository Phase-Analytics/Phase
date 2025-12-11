import type { Metadata } from 'next';

const SITE_URL = 'https://telemetra.dev';
const SITE_NAME = 'Telemetra';

export const siteConfig = {
  name: SITE_NAME,
  url: SITE_URL,
  description:
    'Open-source, privacy-focused analytics platform for mobile applications. Real-time insights without compromising user privacy.',
  keywords: [
    'react nativ analytics',
    'expo analytics',
    'privacy focused analytics',
    'real-time analytics',
    'mobile analytics',
    'self-hosted analytics',
    'open source analytics',
    'session analytics',
    'event analytics',
    'GDPR compliant analytics',
    'privacy-first analytics',
  ],
  authors: [{ name: 'Berkinory', url: 'https://mirac.dev' }],
  creator: 'Berkinory',
  publisher: 'Berkinory',
  twitter: {
    handle: '@telemetra.dev',
    site: '@telemetra.dev',
  },
  ogImage: `${SITE_URL}/og.png`,
} as const;

export const baseMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    template: `%s | ${siteConfig.name}`,
    default: `${siteConfig.name} Analytics`,
  },
  alternates: {
    canonical: siteConfig.url,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [...siteConfig.authors],
  creator: siteConfig.creator,
  publisher: siteConfig.publisher,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} - Open Source Analytics Platform`,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} - Open Source Analytics Platform`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} - Open Source Analytics Platform`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
    creator: siteConfig.twitter.handle,
    site: siteConfig.twitter.site,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // verification: {
  //   google: 'your-google-verification-code',
  // },
};

type PageMetadataOptions = {
  title: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
  canonical?: string;
};

export function createMetadata({
  title,
  description = siteConfig.description,
  image = siteConfig.ogImage,
  noIndex = false,
  canonical,
}: PageMetadataOptions): Metadata {
  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [image],
    },
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
    ...(canonical && {
      alternates: {
        canonical,
      },
    }),
  };
}

type JsonLdOrganization = {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo: string;
  sameAs?: string[];
};

type JsonLdSoftwareApplication = {
  '@context': 'https://schema.org';
  '@type': 'SoftwareApplication';
  name: string;
  applicationCategory: string;
  operatingSystem: string;
  offers: {
    '@type': 'Offer';
    price: string;
    priceCurrency: string;
  };
  description: string;
};

type JsonLdWebSite = {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  name: string;
  url: string;
  description: string;
  potentialAction?: {
    '@type': 'SearchAction';
    target: string;
    'query-input': string;
  };
};

export type JsonLdData =
  | JsonLdOrganization
  | JsonLdSoftwareApplication
  | JsonLdWebSite;

export const jsonLd = {
  organization: (): JsonLdOrganization => ({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    sameAs: ['https://github.com/telemetra', 'https://x.com/telemetra.dev'],
  }),

  software: (): JsonLdSoftwareApplication => ({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: siteConfig.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: siteConfig.description,
  }),

  website: (): JsonLdWebSite => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
  }),
};
