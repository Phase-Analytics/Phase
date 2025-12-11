import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { DashboardHeader } from '@/app/dashboard/header';
import { DashboardSidebar } from '@/app/dashboard/sidebar';
import { AuthRedirect } from '@/components/auth-redirect';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from '@/lib/queries/query-provider';
import { createMetadata, siteConfig } from '@/lib/seo';
import { ThemeProvider } from '@/lib/theme-provider';

export const metadata: Metadata = createMetadata({
  title: 'Dashboard',
  description: 'Manage your analytics and view insights',
  canonical: `${siteConfig.url}/dashboard`,
  noIndex: true,
});

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get('sidebar_state');
  const defaultOpen = sidebarState?.value === 'true';

  return (
    <QueryProvider>
      <AuthRedirect requireAuth>
        <NuqsAdapter>
          <SidebarProvider defaultOpen={defaultOpen}>
            <DashboardSidebar />
            <SidebarInset>
              <ThemeProvider>
                <DashboardHeader>{children}</DashboardHeader>
              </ThemeProvider>
            </SidebarInset>
          </SidebarProvider>
        </NuqsAdapter>
      </AuthRedirect>
      <Toaster
        duration={5000}
        position="top-center"
        richColors
        visibleToasts={3}
      />
    </QueryProvider>
  );
}
