import { cookies } from 'next/headers';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { DashboardHeader } from '@/app/dashboard/header';
import { DashboardSidebar } from '@/app/dashboard/sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
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
      <NuqsAdapter>
        <SidebarProvider defaultOpen={defaultOpen}>
          <DashboardSidebar />
          <SidebarInset>
            <DashboardHeader>{children}</DashboardHeader>
          </SidebarInset>
        </SidebarProvider>
      </NuqsAdapter>
    </QueryProvider>
  );
}
