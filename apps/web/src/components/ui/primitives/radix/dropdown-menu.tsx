'use client';

import { AnimatePresence, type HTMLMotionProps, motion } from 'motion/react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import { useState } from 'react';

import {
  Highlight,
  HighlightItem,
  type HighlightItemProps,
  type HighlightProps,
} from '@/components/ui/primitives/effects/highlight';
import { getStrictContext } from '@/hooks/get-strict-context';
import { useControlledState } from '@/hooks/use-controlled-state';
import { useDataState } from '@/hooks/use-data-state';

type DropdownMenuContextType = {
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
  highlightedValue: string | null;
  setHighlightedValue: (value: string | null) => void;
};

type DropdownMenuSubContextType = {
  isOpen: boolean;
  setIsOpen: (o: boolean) => void;
};

const [DropdownMenuProvider, useDropdownMenu] =
  getStrictContext<DropdownMenuContextType>('DropdownMenuContext');

const [DropdownMenuSubProvider, useDropdownMenuSub] =
  getStrictContext<DropdownMenuSubContextType>('DropdownMenuSubContext');

type DropdownMenuProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Root
>;

function DropdownMenu(props: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useControlledState({
    value: props?.open,
    defaultValue: props?.defaultOpen,
    onChange: props?.onOpenChange,
  });
  const [highlightedValue, setHighlightedValue] = useState<string | null>(null);

  return (
    <DropdownMenuProvider
      value={{ isOpen, setIsOpen, highlightedValue, setHighlightedValue }}
    >
      <DropdownMenuPrimitive.Root
        data-slot="dropdown-menu"
        {...props}
        onOpenChange={setIsOpen}
      />
    </DropdownMenuProvider>
  );
}

type DropdownMenuTriggerProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Trigger
>;

function DropdownMenuTrigger(props: DropdownMenuTriggerProps) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  );
}

type DropdownMenuPortalProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Portal
>;

function DropdownMenuPortal(props: DropdownMenuPortalProps) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  );
}

type DropdownMenuGroupProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Group
>;

function DropdownMenuGroup(props: DropdownMenuGroupProps) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  );
}

type DropdownMenuSubProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Sub
>;

function DropdownMenuSub(props: DropdownMenuSubProps) {
  const [isOpen, setIsOpen] = useControlledState({
    value: props?.open,
    defaultValue: props?.defaultOpen,
    onChange: props?.onOpenChange,
  });

  return (
    <DropdownMenuSubProvider value={{ isOpen, setIsOpen }}>
      <DropdownMenuPrimitive.Sub
        data-slot="dropdown-menu-sub"
        {...props}
        onOpenChange={setIsOpen}
      />
    </DropdownMenuSubProvider>
  );
}

type DropdownMenuRadioGroupProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.RadioGroup
>;

function DropdownMenuRadioGroup(props: DropdownMenuRadioGroupProps) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  );
}

type DropdownMenuSubTriggerProps = Omit<
  React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>,
  'asChild'
> &
  HTMLMotionProps<'div'>;

function DropdownMenuSubTrigger({
  disabled,
  textValue,
  ...props
}: DropdownMenuSubTriggerProps) {
  const { setHighlightedValue } = useDropdownMenu();
  const [, highlightedRef] = useDataState<HTMLDivElement>(
    'highlighted',
    undefined,
    (value) => {
      if (value === true) {
        const el = highlightedRef.current;
        const v = el?.dataset.value || el?.id || null;
        if (v) {
          setHighlightedValue(v);
        }
      }
    }
  );

  return (
    <DropdownMenuPrimitive.SubTrigger
      asChild
      disabled={disabled}
      ref={highlightedRef}
      textValue={textValue}
    >
      <motion.div
        data-disabled={disabled}
        data-slot="dropdown-menu-sub-trigger"
        {...props}
      />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

type DropdownMenuSubContentProps = Omit<
  React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>,
  'forceMount' | 'asChild'
> &
  Omit<
    React.ComponentProps<typeof DropdownMenuPrimitive.Portal>,
    'forceMount'
  > &
  HTMLMotionProps<'div'>;

function DropdownMenuSubContent({
  loop,
  onEscapeKeyDown,
  onPointerDownOutside,
  onFocusOutside,
  onInteractOutside,
  sideOffset,
  alignOffset,
  avoidCollisions,
  collisionBoundary,
  collisionPadding,
  arrowPadding,
  sticky,
  hideWhenDetached,
  transition = { duration: 0.2 },
  style,
  container,
  ...props
}: DropdownMenuSubContentProps) {
  const { isOpen } = useDropdownMenuSub();

  return (
    <AnimatePresence>
      {isOpen && (
        <DropdownMenuPortal container={container} forceMount>
          <DropdownMenuPrimitive.SubContent
            alignOffset={alignOffset}
            arrowPadding={arrowPadding}
            asChild
            avoidCollisions={avoidCollisions}
            collisionBoundary={collisionBoundary}
            collisionPadding={collisionPadding}
            forceMount
            hideWhenDetached={hideWhenDetached}
            loop={loop}
            onEscapeKeyDown={onEscapeKeyDown}
            onFocusOutside={onFocusOutside}
            onInteractOutside={onInteractOutside}
            onPointerDownOutside={onPointerDownOutside}
            sideOffset={sideOffset}
            sticky={sticky}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              data-slot="dropdown-menu-sub-content"
              exit={{ opacity: 0, scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.95 }}
              key="dropdown-menu-sub-content"
              style={{ willChange: 'opacity, transform', ...style }}
              transition={transition}
              {...props}
            />
          </DropdownMenuPrimitive.SubContent>
        </DropdownMenuPortal>
      )}
    </AnimatePresence>
  );
}

type DropdownMenuHighlightProps = Omit<
  HighlightProps,
  'controlledItems' | 'enabled' | 'hover'
> & {
  animateOnHover?: boolean;
};

function DropdownMenuHighlight({
  transition = { type: 'spring', stiffness: 500, damping: 35 },
  ...props
}: DropdownMenuHighlightProps) {
  const { highlightedValue } = useDropdownMenu();

  return (
    <Highlight
      click={false}
      controlledItems
      data-slot="dropdown-menu-highlight"
      transition={transition}
      value={highlightedValue}
      {...props}
    />
  );
}

type DropdownMenuContentProps = Omit<
  React.ComponentProps<typeof DropdownMenuPrimitive.Content>,
  'forceMount' | 'asChild'
> &
  Omit<
    React.ComponentProps<typeof DropdownMenuPrimitive.Portal>,
    'forceMount'
  > &
  HTMLMotionProps<'div'>;

function DropdownMenuContent({
  loop,
  onCloseAutoFocus,
  onEscapeKeyDown,
  onPointerDownOutside,
  onFocusOutside,
  onInteractOutside,
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
  transition = { duration: 0.2 },
  style,
  container,
  ...props
}: DropdownMenuContentProps) {
  const { isOpen } = useDropdownMenu();

  return (
    <AnimatePresence>
      {isOpen && (
        <DropdownMenuPortal container={container} forceMount>
          <DropdownMenuPrimitive.Content
            align={align}
            alignOffset={alignOffset}
            arrowPadding={arrowPadding}
            asChild
            avoidCollisions={avoidCollisions}
            collisionBoundary={collisionBoundary}
            collisionPadding={collisionPadding}
            hideWhenDetached={hideWhenDetached}
            loop={loop}
            onCloseAutoFocus={onCloseAutoFocus}
            onEscapeKeyDown={onEscapeKeyDown}
            onFocusOutside={onFocusOutside}
            onInteractOutside={onInteractOutside}
            onPointerDownOutside={onPointerDownOutside}
            side={side}
            sideOffset={sideOffset}
            sticky={sticky}
          >
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              data-slot="dropdown-menu-content"
              exit={{ opacity: 0, scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.95 }}
              key="dropdown-menu-content"
              style={{ willChange: 'opacity, transform', ...style }}
              transition={transition}
              {...props}
            />
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPortal>
      )}
    </AnimatePresence>
  );
}

type DropdownMenuHighlightItemProps = HighlightItemProps;

function DropdownMenuHighlightItem(props: DropdownMenuHighlightItemProps) {
  return <HighlightItem data-slot="dropdown-menu-highlight-item" {...props} />;
}

type DropdownMenuItemProps = Omit<
  React.ComponentProps<typeof DropdownMenuPrimitive.Item>,
  'asChild'
> &
  HTMLMotionProps<'div'>;

function DropdownMenuItem({
  disabled,
  onSelect,
  textValue,
  ...props
}: DropdownMenuItemProps) {
  const { setHighlightedValue } = useDropdownMenu();
  const [, highlightedRef] = useDataState<HTMLDivElement>(
    'highlighted',
    undefined,
    (value) => {
      if (value === true) {
        const el = highlightedRef.current;
        const v = el?.dataset.value || el?.id || null;
        if (v) {
          setHighlightedValue(v);
        }
      }
    }
  );

  return (
    <DropdownMenuPrimitive.Item
      asChild
      disabled={disabled}
      onSelect={onSelect}
      ref={highlightedRef}
      textValue={textValue}
    >
      <motion.div
        data-disabled={disabled}
        data-slot="dropdown-menu-item"
        {...props}
      />
    </DropdownMenuPrimitive.Item>
  );
}

type DropdownMenuCheckboxItemProps = Omit<
  React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>,
  'asChild'
> &
  HTMLMotionProps<'div'>;

function DropdownMenuCheckboxItem({
  checked,
  onCheckedChange,
  disabled,
  onSelect,
  textValue,
  ...props
}: DropdownMenuCheckboxItemProps) {
  const { setHighlightedValue } = useDropdownMenu();
  const [, highlightedRef] = useDataState<HTMLDivElement>(
    'highlighted',
    undefined,
    (value) => {
      if (value === true) {
        const el = highlightedRef.current;
        const v = el?.dataset.value || el?.id || null;
        if (v) {
          setHighlightedValue(v);
        }
      }
    }
  );

  return (
    <DropdownMenuPrimitive.CheckboxItem
      asChild
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      onSelect={onSelect}
      ref={highlightedRef}
      textValue={textValue}
    >
      <motion.div
        data-disabled={disabled}
        data-slot="dropdown-menu-checkbox-item"
        {...props}
      />
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

type DropdownMenuRadioItemProps = Omit<
  React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>,
  'asChild'
> &
  HTMLMotionProps<'div'>;

function DropdownMenuRadioItem({
  value,
  disabled,
  onSelect,
  textValue,
  ...props
}: DropdownMenuRadioItemProps) {
  const { setHighlightedValue } = useDropdownMenu();
  const [, highlightedRef] = useDataState<HTMLDivElement>(
    'highlighted',
    undefined,
    (isHighlighted) => {
      if (isHighlighted === true) {
        const el = highlightedRef.current;
        const v = el?.dataset.value || el?.id || null;
        if (v) {
          setHighlightedValue(v);
        }
      }
    }
  );

  return (
    <DropdownMenuPrimitive.RadioItem
      asChild
      disabled={disabled}
      onSelect={onSelect}
      ref={highlightedRef}
      textValue={textValue}
      value={value}
    >
      <motion.div
        data-disabled={disabled}
        data-slot="dropdown-menu-radio-item"
        {...props}
      />
    </DropdownMenuPrimitive.RadioItem>
  );
}

type DropdownMenuLabelProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Label
>;

function DropdownMenuLabel(props: DropdownMenuLabelProps) {
  return (
    <DropdownMenuPrimitive.Label data-slot="dropdown-menu-label" {...props} />
  );
}

type DropdownMenuSeparatorProps = React.ComponentProps<
  typeof DropdownMenuPrimitive.Separator
>;

function DropdownMenuSeparator(props: DropdownMenuSeparatorProps) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      {...props}
    />
  );
}

type DropdownMenuShortcutProps = React.ComponentProps<'span'>;

function DropdownMenuShortcut(props: DropdownMenuShortcutProps) {
  return <span data-slot="dropdown-menu-shortcut" {...props} />;
}

type DropdownMenuItemIndicatorProps = Omit<
  React.ComponentProps<typeof DropdownMenuPrimitive.ItemIndicator>,
  'asChild'
> &
  HTMLMotionProps<'div'>;

function DropdownMenuItemIndicator(props: DropdownMenuItemIndicatorProps) {
  return (
    <DropdownMenuPrimitive.ItemIndicator
      asChild
      data-slot="dropdown-menu-item-indicator"
    >
      <motion.div {...props} />
    </DropdownMenuPrimitive.ItemIndicator>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuHighlight,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIndicator,
  DropdownMenuHighlightItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  useDropdownMenu,
  useDropdownMenuSub,
  type DropdownMenuProps,
  type DropdownMenuTriggerProps,
  type DropdownMenuHighlightProps,
  type DropdownMenuContentProps,
  type DropdownMenuItemProps,
  type DropdownMenuItemIndicatorProps,
  type DropdownMenuHighlightItemProps,
  type DropdownMenuCheckboxItemProps,
  type DropdownMenuRadioItemProps,
  type DropdownMenuLabelProps,
  type DropdownMenuSeparatorProps,
  type DropdownMenuShortcutProps,
  type DropdownMenuGroupProps,
  type DropdownMenuPortalProps,
  type DropdownMenuSubProps,
  type DropdownMenuSubContentProps,
  type DropdownMenuSubTriggerProps,
  type DropdownMenuRadioGroupProps,
  type DropdownMenuContextType,
  type DropdownMenuSubContextType,
};
