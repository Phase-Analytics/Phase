import type { Metadata } from 'next';
import { siteConfig } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: `${siteConfig.name} Analytics`,
  },
  alternates: {
    canonical: siteConfig.url,
  },
};

export default function HomePage() {
  return <div>Home</div>;
}
