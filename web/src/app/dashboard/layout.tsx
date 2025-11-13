import { cookies } from 'next/headers';
import { DashboardHeader } from '@/app/dashboard/header';
import { DashboardSidebar } from '@/app/dashboard/sidebar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const sidebarState = cookieStore.get('sidebar_state');
  const defaultOpen = sidebarState?.value === 'true';

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <DashboardSidebar />
      <SidebarInset>
        <DashboardHeader>{children}</DashboardHeader>
      </SidebarInset>
    </SidebarProvider>
  );
}
