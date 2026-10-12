import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

// Pinned on process.env so build workers inline the same value; it busts the
// persisted React Query cache on every deploy.
process.env.NEXT_PUBLIC_BUILD_ID ||=
  process.env.SOURCE_COMMIT || Date.now().toString(36);
const buildId = process.env.NEXT_PUBLIC_BUILD_ID;

const getContentSecurityPolicy = () => {
  const serverUrl =
    process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';
  const linkAssetsUrl = process.env.R2_PUBLIC_BASE_URL?.trim();

  const imgSrc = [
    "'self'",
    'data:',
    'blob:',
    'https:',
    'https://static.intercomassets.com',
    'https://*.intercomcdn.com',
    'https://downloads.intercomcdn.com',
  ];

  if (linkAssetsUrl) {
    try {
      imgSrc.push(new URL(linkAssetsUrl).origin);
    } catch {
      imgSrc.push(linkAssetsUrl);
    }
  }

  const policy = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-eval'",
      "'unsafe-inline'",
      'https://widget.intercom.io',
      'https://js.intercomcdn.com',
      'https://analytics-c.mirac.dev',
    ],
    'script-src-elem': [
      "'self'",
      "'unsafe-inline'",
      'https://widget.intercom.io',
      'https://js.intercomcdn.com',
      'https://analytics-c.mirac.dev',
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': imgSrc,
    'font-src': ["'self'", 'data:'],
    'media-src': [
      "'self'",
      'https://4q2mmgfazl.ufs.sh',
      'https://*.intercomcdn.com',
      'https://js.intercomcdn.com',
    ],
    'connect-src': [
      "'self'",
      'https://analytics-c.mirac.dev',
      serverUrl,
      'https://api-iam.intercom.io',
      'https://nexus-websocket-a.intercom.io',
      'https://nexus-websocket-b.intercom.io',
      'wss://nexus-websocket-a.intercom.io',
      'wss://nexus-websocket-b.intercom.io',
      'https://*.intercom.io',
      'https://*.intercomcdn.com',
    ],
    'frame-src': [
      "'self'",
      'https://*.intercom.io',
      'https://*.intercomcdn.com',
    ],
    'child-src': ["'self'", 'https://*.intercom.io'],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
  };

  return Object.entries(policy)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
};

const nextConfig: NextConfig = {
  reactCompiler: true,
  generateBuildId: () => buildId,
  experimental: {
    optimizePackageImports: ['@hugeicons/core-free-icons', '@hugeicons/react'],
  },
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  images: {
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  ...(process.cwd().startsWith('/app') && {
    turbopack: {
      root: '/app',
    },
  }),
  headers: () => [
    {
      // Static geography data; the file name changes if the atlas is replaced.
      source: '/geo/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=604800, stale-while-revalidate=86400',
        },
      ],
    },
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains',
        },
        {
          key: 'Content-Security-Policy',
          value: getContentSecurityPolicy(),
        },
      ],
    },
  ],
};

const withMDX = createMDX();

export default withMDX(nextConfig);
