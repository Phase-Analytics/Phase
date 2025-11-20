import { cookies } from 'next/headers';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { DashboardHeader } from '@/app/dashboard/header';
import { DashboardSidebar } from '@/app/dashboard/sidebar';
import { AuthRedirect } from '@/components/auth-redirect';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from '@/lib/queries/query-provider';

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
              <DashboardHeader>{children}</DashboardHeader>
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
