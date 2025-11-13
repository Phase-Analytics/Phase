'use client';

import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type * as React from 'react';
import {
  AccordionContent as AccordionContentPrimitive,
  AccordionHeader as AccordionHeaderPrimitive,
  AccordionItem as AccordionItemPrimitive,
  Accordion as AccordionPrimitive,
  AccordionTrigger as AccordionTriggerPrimitive,
} from '@/components/ui/primitives/radix/accordion';
import { cn } from '@/lib/utils';

export const Accordion = AccordionPrimitive;

type AccordionItemProps = React.ComponentProps<typeof AccordionItemPrimitive>;

export function AccordionItem({
  children,
  value,
  className,
  ...props
}: AccordionItemProps) {
  return (
    <AccordionItemPrimitive
      className={cn(
        'mt-px w-full overflow-hidden border-border border-b last:border-none focus-within:relative focus-within:z-10',
        className
      )}
      value={value}
      {...props}
    >
      {children}
    </AccordionItemPrimitive>
  );
}

type AccordionTriggerProps = React.ComponentProps<
  typeof AccordionTriggerPrimitive
>;

export function AccordionTrigger({
  children,
  className,
  ...props
}: AccordionTriggerProps) {
  return (
    <AccordionHeaderPrimitive className="flex">
      <AccordionTriggerPrimitive
        className={cn(
          'group flex h-11 w-full items-center justify-between px-3.5 text-base/none text-primary outline-none',
          'motion-safe:ease-out [&[data-state=open]>svg]:rotate-180',
          className
        )}
        {...props}
      >
        {children}
        <HugeiconsIcon
          className="text-neutral-500 transition-transform duration-300 [&_svg]:size-[18px]"
          icon={ArrowDown01Icon}
        />
      </AccordionTriggerPrimitive>
    </AccordionHeaderPrimitive>
  );
}

type AccordionContentProps = React.ComponentProps<
  typeof AccordionContentPrimitive
>;

export function AccordionContent({
  children,
  className,
  ...props
}: AccordionContentProps) {
  return (
    <AccordionContentPrimitive
      className={cn(
        'transition-transform motion-safe:data-[state=closed]:animate-accordion-close motion-safe:data-[state=open]:animate-accordion-open',
        className
      )}
      {...props}
    >
      <div className="px-3.5 pb-3 text-primary-muted">{children}</div>
    </AccordionContentPrimitive>
  );
}
