'use client';

import { AnimatePresence, type HTMLMotionProps, motion } from 'motion/react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import type * as React from 'react';
import { getStrictContext } from '@/hooks/get-strict-context';
import { useControlledState } from '@/hooks/use-controlled-state';

type PopoverContextType = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
};

const [PopoverProvider, usePopover] =
  getStrictContext<PopoverContextType>('PopoverContext');

type PopoverProps = React.ComponentProps<typeof PopoverPrimitive.Root>;

function Popover(props: PopoverProps) {
  const [isOpen, setIsOpen] = useControlledState({
    value: props?.open,
    defaultValue: props?.defaultOpen,
    onChange: props?.onOpenChange,
  });

  return (
    <PopoverProvider value={{ isOpen, setIsOpen }}>
      <PopoverPrimitive.Root
        data-slot="popover"
        {...props}
        onOpenChange={setIsOpen}
      />
    </PopoverProvider>
  );
}

type PopoverTriggerProps = React.ComponentProps<
  typeof PopoverPrimitive.Trigger
>;

function PopoverTrigger(props: PopoverTriggerProps) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

type PopoverPortalProps = Omit<
  React.ComponentProps<typeof PopoverPrimitive.Portal>,
  'forceMount'
>;

function PopoverPortal(props: PopoverPortalProps) {
  const { isOpen } = usePopover();

  return (
    <AnimatePresence>
      {isOpen && (
        <PopoverPrimitive.Portal
          data-slot="popover-portal"
          forceMount
          {...props}
        />
      )}
    </AnimatePresence>
  );
}

type PopoverContentProps = Omit<
  React.ComponentProps<typeof PopoverPrimitive.Content>,
  'forceMount' | 'asChild'
> &
  HTMLMotionProps<'div'>;

function PopoverContent({
  onOpenAutoFocus,
  onCloseAutoFocus,
  onEscapeKeyDown,
  onPointerDownOutside,
  onFocusOutside,
  onInteractOutside,
  align,
  alignOffset,
  side,
  sideOffset,
  avoidCollisions,
  collisionBoundary,
  collisionPadding,
  arrowPadding,
  sticky,
  hideWhenDetached,
  transition = { type: 'spring', stiffness: 300, damping: 25 },
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Content
      align={align}
      alignOffset={alignOffset}
      arrowPadding={arrowPadding}
      asChild
      avoidCollisions={avoidCollisions}
      collisionBoundary={collisionBoundary}
      collisionPadding={collisionPadding}
      forceMount
      hideWhenDetached={hideWhenDetached}
      onCloseAutoFocus={onCloseAutoFocus}
      onEscapeKeyDown={onEscapeKeyDown}
      onFocusOutside={onFocusOutside}
      onInteractOutside={onInteractOutside}
      onOpenAutoFocus={onOpenAutoFocus}
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
      />
    </PopoverPrimitive.Content>
  );
}

type PopoverAnchorProps = React.ComponentProps<typeof PopoverPrimitive.Anchor>;

function PopoverAnchor({ ...props }: PopoverAnchorProps) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

type PopoverArrowProps = React.ComponentProps<typeof PopoverPrimitive.Arrow>;

function PopoverArrow(props: PopoverArrowProps) {
  return <PopoverPrimitive.Arrow data-slot="popover-arrow" {...props} />;
}

type PopoverCloseProps = React.ComponentProps<typeof PopoverPrimitive.Close>;

function PopoverClose(props: PopoverCloseProps) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />;
}

export {
  Popover,
  PopoverTrigger,
  PopoverPortal,
  PopoverContent,
  PopoverAnchor,
  PopoverClose,
  PopoverArrow,
  usePopover,
  type PopoverProps,
  type PopoverTriggerProps,
  type PopoverPortalProps,
  type PopoverContentProps,
  type PopoverAnchorProps,
  type PopoverCloseProps,
  type PopoverArrowProps,
  type PopoverContextType,
};
