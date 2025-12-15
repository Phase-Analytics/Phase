import {
  PopoverClose as PopoverClosePrimitive,
  type PopoverCloseProps as PopoverClosePrimitiveProps,
  PopoverContent as PopoverContentPrimitive,
  type PopoverContentProps as PopoverContentPrimitiveProps,
  PopoverPortal as PopoverPortalPrimitive,
  Popover as PopoverPrimitive,
  type PopoverProps as PopoverPrimitiveProps,
  PopoverTrigger as PopoverTriggerPrimitive,
  type PopoverTriggerProps as PopoverTriggerPrimitiveProps,
} from '@/components/ui/primitives/radix/popover';
import { cn } from '@/lib/utils';

type PopoverProps = PopoverPrimitiveProps;

function Popover(props: PopoverProps) {
  return <PopoverPrimitive {...props} />;
}

type PopoverTriggerProps = PopoverTriggerPrimitiveProps;

function PopoverTrigger(props: PopoverTriggerProps) {
  return <PopoverTriggerPrimitive {...props} />;
}

type PopoverContentProps = PopoverContentPrimitiveProps;

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPortalPrimitive>
      <PopoverContentPrimitive
        align={align}
        className={cn(
          'z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-[var(--shadow-elevated),var(--highlight)] outline-hidden',
          className
        )}
        sideOffset={sideOffset}
        {...props}
      />
    </PopoverPortalPrimitive>
  );
}

type PopoverCloseProps = PopoverClosePrimitiveProps;

function PopoverClose(props: PopoverCloseProps) {
  return <PopoverClosePrimitive {...props} />;
}

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
  type PopoverProps,
  type PopoverTriggerProps,
  type PopoverContentProps,
  type PopoverCloseProps,
};
