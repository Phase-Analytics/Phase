'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui-components/react/tooltip';
import { AnimatePresence, type HTMLMotionProps, motion } from 'motion/react';
import type * as React from 'react';
import { useControlledState } from '@/hooks/use-controlled-state';
import { getStrictContext } from '@/lib/get-strict-context';

type TooltipContextType = {
  isOpen: boolean;
  setIsOpen: TooltipProps['onOpenChange'];
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
  'keepMounted'
>;

function TooltipPortal(props: TooltipPortalProps) {
  const { isOpen } = useTooltip();

  return (
    <AnimatePresence>
      {isOpen && (
        <TooltipPrimitive.Portal
          data-slot="tooltip-portal"
          keepMounted
          {...props}
        />
      )}
    </AnimatePresence>
  );
}

type TooltipPositionerProps = React.ComponentProps<
  typeof TooltipPrimitive.Positioner
>;

function TooltipPositioner(props: TooltipPositionerProps) {
  return (
    <TooltipPrimitive.Positioner data-slot="tooltip-positioner" {...props} />
  );
}

type TooltipPopupProps = Omit<
  React.ComponentProps<typeof TooltipPrimitive.Popup>,
  'render'
> &
  HTMLMotionProps<'div'>;

function TooltipPopup({
  transition = { type: 'spring', stiffness: 300, damping: 25 },
  ...props
}: TooltipPopupProps) {
  return (
    <TooltipPrimitive.Popup
      render={
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          data-slot="tooltip-popup"
          exit={{ opacity: 0, scale: 0.5 }}
          initial={{ opacity: 0, scale: 0.5 }}
          key="tooltip-popup"
          transition={transition}
          {...props}
        />
      }
    />
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
  TooltipPositioner,
  TooltipPopup,
  TooltipArrow,
  useTooltip,
  type TooltipProviderProps,
  type TooltipProps,
  type TooltipTriggerProps,
  type TooltipPortalProps,
  type TooltipPositionerProps,
  type TooltipPopupProps,
  type TooltipArrowProps,
  type TooltipContextType,
};
