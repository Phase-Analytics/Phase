'use client';

import { TestTube01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { cn } from '@/lib/utils';

type DebugDataBadgeProps = {
  className?: string;
};

export function DebugDataBadge({ className }: DebugDataBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 font-semibold text-[10px] text-blue-700 uppercase tracking-wide',
        className
      )}
    >
      <HugeiconsIcon className="size-3" icon={TestTube01Icon} />
      <span>DEBUG</span>
    </span>
  );
}
