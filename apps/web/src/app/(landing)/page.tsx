import type { Metadata } from 'next';
import { siteConfig } from '@/lib/seo';

export const metadata: Metadata = {
  alternates: {
    canonical: siteConfig.url,
  },
};

export default function HomePage() {
  return <div>Home</div>;
}
