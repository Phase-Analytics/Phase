import type { Metadata } from 'next';
import { AuthRedirect } from '@/components/auth-redirect';
import { Toaster } from '@/components/ui/sonner';
import { createMetadata, siteConfig } from '@/lib/seo';
import { ThemeProvider } from '@/lib/theme-provider';

export const metadata: Metadata = createMetadata({
  title: 'Sign In',
  description: 'Sign in to your Telemetra account',
  canonical: `${siteConfig.url}/auth`,
  noIndex: true,
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthRedirect requireAuth={false}>
      <ThemeProvider>{children}</ThemeProvider>
      <Toaster
        duration={5000}
        position="top-center"
        richColors
        visibleToasts={3}
      />
    </AuthRedirect>
  );
}
