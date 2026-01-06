import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

const getContentSecurityPolicy = () => {
  const serverUrl =
    process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

  const policy = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-eval'",
      "'unsafe-inline'",
      'https://cdn.databuddy.cc',
      'https://widget.intercom.io',
      'https://js.intercomcdn.com',
    ],
    'script-src-elem': [
      "'self'",
      "'unsafe-inline'",
      'https://cdn.databuddy.cc',
      'https://widget.intercom.io',
      'https://js.intercomcdn.com',
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'https://static.intercomassets.com',
      'https://*.intercomcdn.com',
      'https://downloads.intercomcdn.com',
    ],
    'font-src': ["'self'", 'data:'],
    'media-src': [
      "'self'",
      'https://4q2mmgfazl.ufs.sh',
      'https://*.intercomcdn.com',
      'https://js.intercomcdn.com',
    ],
    'connect-src': [
      "'self'",
      'https://basket.databuddy.cc',
      serverUrl,
      'https://api-iam.intercom.io',
      'https://nexus-websocket-a.intercom.io',
      'https://nexus-websocket-b.intercom.io',
      'wss://nexus-websocket-a.intercom.io',
      'wss://nexus-websocket-b.intercom.io',
      'https://*.intercom.io',
      'https://*.intercomcdn.com',
      'https://cdn.jsdelivr.net',
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
