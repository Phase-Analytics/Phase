import { createMDX } from 'fumadocs-mdx/next';
import type { NextConfig } from 'next';

const getContentSecurityPolicy = () => {
  const serverUrl =
    process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

  const policy = {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:'],
    'media-src': ["'self'", 'https://telemetra.b-cdn.net'],
    'connect-src': ["'self'", serverUrl],
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
