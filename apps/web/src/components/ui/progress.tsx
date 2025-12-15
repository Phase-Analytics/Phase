import {
  ProgressIndicator as ProgressIndicatorPrimitive,
  Progress as ProgressPrimitive,
  type ProgressProps as ProgressPrimitiveProps,
} from '@/components/ui/primitives/radix/progress';
import { cn } from '@/lib/utils';

type ProgressProps = ProgressPrimitiveProps;

function Progress({ className, ...props }: ProgressProps) {
  return (
    <ProgressPrimitive
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-primary/20',
        className
      )}
      {...props}
    >
      <ProgressIndicatorPrimitive className="h-full w-full flex-1 rounded-full bg-primary" />
    </ProgressPrimitive>
  );
}

export { Progress, type ProgressProps };
