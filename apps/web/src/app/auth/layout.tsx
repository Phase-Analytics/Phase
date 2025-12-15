import type { Metadata } from 'next';
import { AuthRedirect } from '@/components/auth-redirect';
import { ForceDarkTheme } from '@/components/force-dark-theme';
import { Toaster } from '@/components/ui/sonner';
import { createMetadata, siteConfig } from '@/lib/seo';

export const metadata: Metadata = createMetadata({
  title: 'Auth',
  description: 'Sign in to your Phase account',
  canonical: `${siteConfig.url}/auth`,
  noIndex: true,
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ForceDarkTheme>
      <AuthRedirect requireAuth={false}>
        {children}
        <Toaster duration={5000} position="top-center" visibleToasts={3} />
      </AuthRedirect>
    </ForceDarkTheme>
  );
}
