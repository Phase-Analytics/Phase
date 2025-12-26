'use client';

import { Calendar03Icon, Mail01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ClientDate } from '@/components/client-date';
import { DataTable } from '@/components/ui/data-table';
import type { AdminUser } from '@/lib/api/types';
import { useAdminUsers } from '@/lib/queries/use-admin';

const columns: ColumnDef<AdminUser>[] = [
  {
    accessorKey: 'email',
    header: 'Email',
    size: 300,
    cell: ({ row }) => {
      const email = row.getValue('email') as string;
      return (
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            className="size-4 text-muted-foreground"
            icon={Mail01Icon}
          />
          <span className="font-medium text-sm">{email}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'appCount',
    header: 'Apps',
    size: 100,
    cell: ({ row }) => {
      const count = row.getValue('appCount') as number;
      return (
        <div className="text-sm">
          <span className="font-semibold">{count}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'deviceCount',
    header: 'Devices',
    size: 100,
    cell: ({ row }) => {
      const count = row.getValue('deviceCount') as number;
      return (
        <div className="text-sm">
          <span className="font-semibold">{count}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    size: 200,
    cell: ({ row }) => {
      const createdAt = row.getValue('createdAt') as string;
      return (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <HugeiconsIcon className="size-4" icon={Calendar03Icon} />
          <ClientDate date={createdAt} />
        </div>
      );
    },
  },
];

export function AdminUsersTable() {
  const { data } = useAdminUsers();

  return (
    <DataTable
      columns={columns}
      data={data?.users || []}
      pageSize={20}
      searchKey="email"
      searchPlaceholder="Search by email..."
    />
  );
}
