import type { Metadata } from 'next';

const SITE_URL = 'https://phase.sh';
const SITE_NAME = 'Phase';

export const siteConfig = {
  name: SITE_NAME,
  url: SITE_URL,
  description:
    'Phase Analytics is a privacy first mobile analytics platform for React Native and Expo. Track events, sessions, and screen views, fully self-hostable.',
  keywords: [
    'phase analytics',
    'mobile analytics',
    'open source mobile analytics',
    'privacy focused analytics',
    'self-hosted analytics',
    'android analytics',
    'ios analytics',
    'react native analytics',
    'expo analytics',
    'real time analytics',
    'mobile event analytics',
    'mobile session analytics',
    'gdpr compliant analytics',
    'open source analytics',
  ],
  authors: [{ name: 'Berkinory', url: 'https://mirac.dev' }],
  creator: 'Berkinory',
  publisher: 'Berkinory',
  twitter: {
    handle: '@berkinory',
    site: 'https://mirac.dev',
  },
  ogImage: `${SITE_URL}/og.png`,
} as const;

export const baseMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    template: `%s | ${siteConfig.name}`,
    default:
      'Phase Analytics – Privacy-First Open Source Mobile Analytics for Android & iOS',
  },
  icons: {
    icon: [{ url: '/phase/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/phase/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: '/phase/favicon.svg',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Phase',
  },
  other: {
    'theme-color': '#000000',
    'msapplication-TileColor': '#000000',
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
    title:
      'Phase Analytics – Privacy-First Open Source Mobile Analytics for Android & iOS',
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImage,
        width: 1200,
        height: 630,
        alt: 'Phase Analytics – Privacy-First Open Source Mobile Analytics for Android & iOS',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title:
      'Phase Analytics – Privacy-First Open Source Mobile Analytics for Android & iOS',
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
    logo: `${siteConfig.url}/phase/logo.svg`,
    sameAs: ['https://github.com/phase-analytics'],
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
