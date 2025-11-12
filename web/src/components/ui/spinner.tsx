import { Loading03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function Spinner({
  className,
  ...props
}: Omit<ComponentProps<typeof HugeiconsIcon>, 'icon'>) {
  return (
    <HugeiconsIcon
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      icon={Loading03Icon}
      role="status"
      {...props}
    />
  );
}

export { Spinner };
