'use client';

import { AnimatePresence, type HTMLMotionProps, motion } from 'motion/react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';
import type * as React from 'react';
import { getStrictContext } from '@/hooks/get-strict-context';
import { useControlledState } from '@/hooks/use-controlled-state';

type TooltipContextType = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
};

const [LocalTooltipProvider, useTooltip] =
  getStrictContext<TooltipContextType>('TooltipContext');

type TooltipProviderProps = React.ComponentProps<
  typeof TooltipPrimitive.Provider
>;

function TooltipProvider(props: TooltipProviderProps) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" {...props} />;
}

type TooltipProps = React.ComponentProps<typeof TooltipPrimitive.Root>;

function Tooltip(props: TooltipProps) {
  const [isOpen, setIsOpen] = useControlledState({
    value: props?.open,
    defaultValue: props?.defaultOpen,
    onChange: props?.onOpenChange,
  });

  return (
    <LocalTooltipProvider value={{ isOpen, setIsOpen }}>
      <TooltipPrimitive.Root
        data-slot="tooltip"
        {...props}
        onOpenChange={setIsOpen}
      />
    </LocalTooltipProvider>
  );
}

type TooltipTriggerProps = React.ComponentProps<
  typeof TooltipPrimitive.Trigger
>;

function TooltipTrigger(props: TooltipTriggerProps) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

type TooltipPortalProps = Omit<
  React.ComponentProps<typeof TooltipPrimitive.Portal>,
  'forceMount'
>;

function TooltipPortal(props: TooltipPortalProps) {
  const { isOpen } = useTooltip();

  return (
    <AnimatePresence>
      {isOpen && (
        <TooltipPrimitive.Portal
          data-slot="tooltip-portal"
          forceMount
          {...props}
        />
      )}
    </AnimatePresence>
  );
}

type TooltipContentProps = Omit<
  React.ComponentProps<typeof TooltipPrimitive.Content>,
  'forceMount' | 'asChild'
> &
  HTMLMotionProps<'div'>;

function TooltipContent({
  onEscapeKeyDown,
  onPointerDownOutside,
  side,
  sideOffset,
  align,
  alignOffset,
  avoidCollisions,
  collisionBoundary,
  collisionPadding,
  arrowPadding,
  sticky,
  hideWhenDetached,
  transition = { type: 'spring', stiffness: 300, damping: 25 },
  children,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Content
      align={align}
      alignOffset={alignOffset}
      arrowPadding={arrowPadding}
      avoidCollisions={avoidCollisions}
      collisionBoundary={collisionBoundary}
      collisionPadding={collisionPadding}
      forceMount
      hideWhenDetached={hideWhenDetached}
      onEscapeKeyDown={onEscapeKeyDown}
      onPointerDownOutside={onPointerDownOutside}
      side={side}
      sideOffset={sideOffset}
      sticky={sticky}
    >
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        data-slot="popover-content"
        exit={{ opacity: 0, scale: 0.5 }}
        initial={{ opacity: 0, scale: 0.5 }}
        key="popover-content"
        transition={transition}
        {...props}
      >
        {children}
      </motion.div>
    </TooltipPrimitive.Content>
  );
}

type TooltipArrowProps = React.ComponentProps<typeof TooltipPrimitive.Arrow>;

function TooltipArrow(props: TooltipArrowProps) {
  return <TooltipPrimitive.Arrow data-slot="tooltip-arrow" {...props} />;
}

export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
  TooltipArrow,
  useTooltip,
  type TooltipProviderProps,
  type TooltipProps,
  type TooltipTriggerProps,
  type TooltipPortalProps,
  type TooltipContentProps,
  type TooltipArrowProps,
  type TooltipContextType,
};
