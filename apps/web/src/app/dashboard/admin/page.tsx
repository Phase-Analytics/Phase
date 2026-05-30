'use client';

import { Suspense } from 'react';
import { AdminOverviewCards } from '@/components/admin/admin-overview-cards';
import {
  AdminOverviewCardsSkeleton,
  AdminUsersTableSkeleton,
} from '@/components/admin/admin-skeletons';
import { AdminUsersTable } from '@/components/admin/admin-users-table';
import { DashboardPageHeader } from '@/components/dashboard/dashboard-page-header';
import { ErrorBoundary } from '@/components/error-boundary';
import { Card, CardContent } from '@/components/ui/card';

export default function AdminPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <DashboardPageHeader
        description="Platform-wide statistics and user management"
        title="Admin Dashboard"
      />

      <ErrorBoundary>
        <Suspense fallback={<AdminOverviewCardsSkeleton />}>
          <AdminOverviewCards />
        </Suspense>
      </ErrorBoundary>

      <Card className="py-0">
        <CardContent className="space-y-4 p-4">
          <div>
            <h2 className="font-semibold text-muted-foreground text-sm uppercase">
              All Users
            </h2>
            <p className="text-muted-foreground text-sm">
              Complete list of all registered users with their apps and devices
            </p>
          </div>

          <ErrorBoundary>
            <Suspense fallback={<AdminUsersTableSkeleton />}>
              <AdminUsersTable />
            </Suspense>
          </ErrorBoundary>
        </CardContent>
      </Card>
    </div>
  );
}
