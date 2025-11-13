import type * as React from 'react';

import {
  SwitchIcon as SwitchIconPrimitive,
  Switch as SwitchPrimitive,
  type SwitchProps as SwitchPrimitiveProps,
  SwitchThumb as SwitchThumbPrimitive,
} from '@/components/ui/primitives/radix/switch';
import { cn } from '@/lib/utils';

type SwitchProps = SwitchPrimitiveProps & {
  pressedWidth?: number;
  startIcon?: React.ReactElement;
  endIcon?: React.ReactElement;
  thumbIcon?: React.ReactElement;
};

function Switch({
  className,
  pressedWidth = 19,
  startIcon,
  endIcon,
  thumbIcon,
  ...props
}: SwitchProps) {
  return (
    <SwitchPrimitive
      className={cn(
        'peer relative flex h-5 w-8 shrink-0 items-center justify-start rounded-full border border-transparent px-px shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80',
        className
      )}
      {...props}
    >
      <SwitchThumbPrimitive
        className={cn(
          'pointer-events-none relative z-10 block size-4 rounded-full bg-background ring-0 dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground'
        )}
        pressedAnimation={{ width: pressedWidth }}
      >
        {thumbIcon && (
          <SwitchIconPrimitive
            className="-translate-1/2 absolute top-1/2 left-1/2 text-neutral-400 dark:text-neutral-500 [&_svg]:size-[9px]"
            position="thumb"
          >
            {thumbIcon}
          </SwitchIconPrimitive>
        )}
      </SwitchThumbPrimitive>

      {startIcon && (
        <SwitchIconPrimitive
          className="-translate-y-1/2 absolute top-1/2 left-0.5 text-neutral-400 dark:text-neutral-500 [&_svg]:size-[9px]"
          position="left"
        >
          {startIcon}
        </SwitchIconPrimitive>
      )}
      {endIcon && (
        <SwitchIconPrimitive
          className="-translate-y-1/2 absolute top-1/2 right-0.5 text-neutral-500 dark:text-neutral-400 [&_svg]:size-[9px]"
          position="right"
        >
          {endIcon}
        </SwitchIconPrimitive>
      )}
    </SwitchPrimitive>
  );
}

export { Switch, type SwitchProps };
