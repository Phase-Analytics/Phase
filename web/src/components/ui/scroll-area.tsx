'use client';

import {
  Corner,
  Root,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  Viewport,
} from '@radix-ui/react-scroll-area';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

function ScrollArea({
  className,
  children,
  ...props
}: ComponentProps<typeof Root>) {
  return (
    <Root
      className={cn('relative', className)}
      data-slot="scroll-area"
      {...props}
    >
      <Viewport
        className="size-full rounded-[inherit] outline-none transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        data-slot="scroll-area-viewport"
      >
        {children}
      </Viewport>
      <ScrollBar />
      <Corner />
    </Root>
  );
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: ComponentProps<typeof ScrollAreaScrollbar>) {
  return (
    <ScrollAreaScrollbar
      className={cn(
        'flex touch-none select-none p-px transition-colors',
        orientation === 'vertical' &&
          'h-full w-2.5 border-l border-l-transparent',
        orientation === 'horizontal' &&
          'h-2.5 flex-col border-t border-t-transparent',
        className
      )}
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      {...props}
    >
      <ScrollAreaThumb
        className="relative flex-1 rounded-full bg-border"
        data-slot="scroll-area-thumb"
      />
    </ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
