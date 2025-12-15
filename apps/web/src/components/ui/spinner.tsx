import { Loading03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon, type HugeiconsIconProps } from '@hugeicons/react';
import { cn } from '@/lib/utils';

type SpinnerProps = Omit<HugeiconsIconProps, 'icon'>;

function Spinner({ className, ...props }: SpinnerProps) {
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

export { Spinner, type SpinnerProps };
