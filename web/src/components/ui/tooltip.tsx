import {
  TooltipArrow as TooltipArrowPrimitive,
  TooltipContent as TooltipContentPrimitive,
  type TooltipContentProps as TooltipContentPrimitiveProps,
  TooltipPortal as TooltipPortalPrimitive,
  Tooltip as TooltipPrimitive,
  type TooltipProps as TooltipPrimitiveProps,
  TooltipProvider as TooltipProviderPrimitive,
  type TooltipProviderProps as TooltipProviderPrimitiveProps,
  TooltipTrigger as TooltipTriggerPrimitive,
  type TooltipTriggerProps as TooltipTriggerPrimitiveProps,
} from '@/components/ui/primitives/radix/tooltip';
import { cn } from '@/lib/utils';

type TooltipProviderProps = TooltipProviderPrimitiveProps;

function TooltipProvider({
  delayDuration = 0,
  ...props
}: TooltipProviderProps) {
  return <TooltipProviderPrimitive delayDuration={delayDuration} {...props} />;
}

type TooltipProps = TooltipPrimitiveProps & {
  delayDuration?: TooltipPrimitiveProps['delayDuration'];
};

function Tooltip({ delayDuration = 0, ...props }: TooltipProps) {
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipPrimitive {...props} />
    </TooltipProvider>
  );
}

type TooltipTriggerProps = TooltipTriggerPrimitiveProps;

function TooltipTrigger({ ...props }: TooltipTriggerProps) {
  return <TooltipTriggerPrimitive {...props} />;
}

type TooltipContentProps = TooltipContentPrimitiveProps;

function TooltipContent({
  className,
  sideOffset,
  children,
  onPointerDownOutside,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPortalPrimitive>
      <TooltipContentPrimitive
        className={cn(
          'z-50 w-fit origin-(--radix-tooltip-content-transform-origin) text-balance rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-xs max-md:hidden',
          className
        )}
        onPointerDownOutside={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPointerDownOutside?.(e);
        }}
        sideOffset={sideOffset}
        {...props}
      >
        {children}
        <TooltipArrowPrimitive className="z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] bg-primary fill-primary" />
      </TooltipContentPrimitive>
    </TooltipPortalPrimitive>
  );
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  type TooltipProps,
  type TooltipTriggerProps,
  type TooltipContentProps,
  type TooltipProviderProps,
};
