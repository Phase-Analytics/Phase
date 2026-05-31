'use client';

import { InformationCircleIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

function formatDomainStatus(status: string): string {
  if (status === 'verified') {
    return 'Verified';
  }
  if (status === 'pending') {
    return 'Pending';
  }
  if (status === 'failed') {
    return 'Failed';
  }
  return status;
}

type LinkDomainStatusBadgeProps = {
  status: 'pending' | 'verified' | 'failed';
  onDnsInfoClick?: () => void;
};

export function LinkDomainStatusBadge({
  status,
  onDnsInfoClick,
}: LinkDomainStatusBadgeProps) {
  const showInfo = status === 'pending' || status === 'failed';

  return (
    <div className="flex items-center gap-1.5">
      <Badge
        className={cn('w-fit px-2 py-0.5 text-xs')}
        variant={status === 'verified' ? 'success' : 'outline'}
      >
        {formatDomainStatus(status)}
      </Badge>
      {showInfo && onDnsInfoClick ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="DNS setup instructions"
              className="size-7 shrink-0"
              onClick={onDnsInfoClick}
              size="icon"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon className="size-4" icon={InformationCircleIcon} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>DNS setup</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
