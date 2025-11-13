'use client';

import {
  Corner as ScrollAreaCornerPrimitive,
  Root as ScrollAreaRootPrimitive,
  ScrollAreaScrollbar as ScrollAreaScrollbarPrimitive,
  ScrollAreaThumb as ScrollAreaThumbPrimitive,
  Viewport as ScrollAreaViewportPrimitive,
} from '@radix-ui/react-scroll-area';
import { cn } from '@/lib/utils';

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaRootPrimitive>) {
  return (
    <ScrollAreaRootPrimitive
      className={cn('relative', className)}
      data-slot="scroll-area"
      {...props}
    >
      <ScrollAreaViewportPrimitive
        className="size-full rounded-[inherit] outline-none transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] focus-visible:ring-ring/50"
        data-slot="scroll-area-viewport"
      >
        {children}
      </ScrollAreaViewportPrimitive>
      <ScrollBar />
      <ScrollAreaCornerPrimitive />
    </ScrollAreaRootPrimitive>
  );
}

function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaScrollbarPrimitive>) {
  return (
    <ScrollAreaScrollbarPrimitive
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
      <ScrollAreaThumbPrimitive
        className="relative flex-1 rounded-full bg-border"
        data-slot="scroll-area-thumb"
      />
    </ScrollAreaScrollbarPrimitive>
  );
}

export { ScrollArea, ScrollBar };
