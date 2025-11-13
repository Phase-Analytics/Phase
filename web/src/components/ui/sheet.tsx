import { CancelSquareIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  SheetClose as SheetClosePrimitive,
  type SheetCloseProps as SheetClosePrimitiveProps,
  SheetContent as SheetContentPrimitive,
  type SheetContentProps as SheetContentPrimitiveProps,
  SheetDescription as SheetDescriptionPrimitive,
  type SheetDescriptionProps as SheetDescriptionPrimitiveProps,
  SheetFooter as SheetFooterPrimitive,
  type SheetFooterProps as SheetFooterPrimitiveProps,
  SheetHeader as SheetHeaderPrimitive,
  type SheetHeaderProps as SheetHeaderPrimitiveProps,
  SheetOverlay as SheetOverlayPrimitive,
  type SheetOverlayProps as SheetOverlayPrimitiveProps,
  SheetPortal as SheetPortalPrimitive,
  Sheet as SheetPrimitive,
  type SheetProps as SheetPrimitiveProps,
  SheetTitle as SheetTitlePrimitive,
  type SheetTitleProps as SheetTitlePrimitiveProps,
  SheetTrigger as SheetTriggerPrimitive,
  type SheetTriggerProps as SheetTriggerPrimitiveProps,
} from '@/components/ui/primitives/radix/sheet';
import { cn } from '@/lib/utils';

type SheetProps = SheetPrimitiveProps;

function Sheet(props: SheetProps) {
  return <SheetPrimitive {...props} />;
}

type SheetTriggerProps = SheetTriggerPrimitiveProps;

function SheetTrigger(props: SheetTriggerProps) {
  return <SheetTriggerPrimitive {...props} />;
}

type SheetOverlayProps = SheetOverlayPrimitiveProps;

function SheetOverlay({ className, ...props }: SheetOverlayProps) {
  return (
    <SheetOverlayPrimitive
      className={cn('fixed inset-0 z-50 bg-black/50', className)}
      {...props}
    />
  );
}

type SheetCloseProps = SheetClosePrimitiveProps;

function SheetClose(props: SheetCloseProps) {
  return <SheetClosePrimitive {...props} />;
}

type SheetContentProps = SheetContentPrimitiveProps & {
  showCloseButton?: boolean;
};

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: SheetContentProps) {
  return (
    <SheetPortalPrimitive>
      <SheetOverlay />
      <SheetContentPrimitive
        className={cn(
          'fixed z-50 flex flex-col gap-4 bg-background shadow-lg',
          side === 'right' && 'h-full w-[350px] border-l',
          side === 'left' && 'h-full w-[350px] border-r',
          side === 'top' && 'h-[350px] w-full border-b',
          side === 'bottom' && 'h-[350px] w-full border-t',
          className
        )}
        side={side}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetClose className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
            <HugeiconsIcon icon={CancelSquareIcon} />
            <span className="sr-only">Close</span>
          </SheetClose>
        )}
      </SheetContentPrimitive>
    </SheetPortalPrimitive>
  );
}

type SheetHeaderProps = SheetHeaderPrimitiveProps;

function SheetHeader({ className, ...props }: SheetHeaderProps) {
  return (
    <SheetHeaderPrimitive
      className={cn('flex flex-col gap-1.5 p-4', className)}
      {...props}
    />
  );
}

type SheetFooterProps = SheetFooterPrimitiveProps;

function SheetFooter({ className, ...props }: SheetFooterProps) {
  return (
    <SheetFooterPrimitive
      className={cn('mt-auto flex flex-col gap-2 p-4', className)}
      {...props}
    />
  );
}

type SheetTitleProps = SheetTitlePrimitiveProps;

function SheetTitle({ className, ...props }: SheetTitleProps) {
  return (
    <SheetTitlePrimitive
      className={cn('font-semibold text-foreground', className)}
      {...props}
    />
  );
}

type SheetDescriptionProps = SheetDescriptionPrimitiveProps;

function SheetDescription({ className, ...props }: SheetDescriptionProps) {
  return (
    <SheetDescriptionPrimitive
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  type SheetProps,
  type SheetTriggerProps,
  type SheetCloseProps,
  type SheetContentProps,
  type SheetHeaderProps,
  type SheetFooterProps,
  type SheetTitleProps,
  type SheetDescriptionProps,
};
