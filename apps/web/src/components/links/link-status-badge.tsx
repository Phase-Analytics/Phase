'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type LinkStatus = 'active' | 'disabled' | 'expired';

const STATUS_LABELS: Record<LinkStatus, string> = {
  active: 'Active',
  disabled: 'Disabled',
  expired: 'Expired',
};

const STATUS_VARIANTS: Record<
  LinkStatus,
  'success' | 'destructive' | 'outline'
> = {
  active: 'success',
  disabled: 'destructive',
  expired: 'outline',
};

type LinkStatusBadgeProps = {
  status: LinkStatus;
};

export function LinkStatusBadge({ status }: LinkStatusBadgeProps) {
  return (
    <Badge
      className={cn('w-fit px-2 py-0.5 text-xs')}
      variant={STATUS_VARIANTS[status]}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}
