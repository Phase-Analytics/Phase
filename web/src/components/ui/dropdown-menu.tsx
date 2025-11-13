import {
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  CircleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  DropdownMenuCheckboxItem as DropdownMenuCheckboxItemPrimitive,
  type DropdownMenuCheckboxItemProps as DropdownMenuCheckboxItemPrimitiveProps,
  DropdownMenuContent as DropdownMenuContentPrimitive,
  type DropdownMenuContentProps as DropdownMenuContentPrimitiveProps,
  DropdownMenuGroup as DropdownMenuGroupPrimitive,
  type DropdownMenuGroupProps as DropdownMenuGroupPrimitiveProps,
  DropdownMenuHighlightItem as DropdownMenuHighlightItemPrimitive,
  DropdownMenuHighlight as DropdownMenuHighlightPrimitive,
  DropdownMenuItemIndicator as DropdownMenuItemIndicatorPrimitive,
  DropdownMenuItem as DropdownMenuItemPrimitive,
  type DropdownMenuItemProps as DropdownMenuItemPrimitiveProps,
  DropdownMenuLabel as DropdownMenuLabelPrimitive,
  type DropdownMenuLabelProps as DropdownMenuLabelPrimitiveProps,
  DropdownMenu as DropdownMenuPrimitive,
  type DropdownMenuProps as DropdownMenuPrimitiveProps,
  DropdownMenuRadioGroup as DropdownMenuRadioGroupPrimitive,
  type DropdownMenuRadioGroupProps as DropdownMenuRadioGroupPrimitiveProps,
  DropdownMenuRadioItem as DropdownMenuRadioItemPrimitive,
  type DropdownMenuRadioItemProps as DropdownMenuRadioItemPrimitiveProps,
  DropdownMenuSeparator as DropdownMenuSeparatorPrimitive,
  type DropdownMenuSeparatorProps as DropdownMenuSeparatorPrimitiveProps,
  DropdownMenuShortcut as DropdownMenuShortcutPrimitive,
  type DropdownMenuShortcutProps as DropdownMenuShortcutPrimitiveProps,
  DropdownMenuSubContent as DropdownMenuSubContentPrimitive,
  type DropdownMenuSubContentProps as DropdownMenuSubContentPrimitiveProps,
  DropdownMenuSub as DropdownMenuSubPrimitive,
  type DropdownMenuSubProps as DropdownMenuSubPrimitiveProps,
  DropdownMenuSubTrigger as DropdownMenuSubTriggerPrimitive,
  type DropdownMenuSubTriggerProps as DropdownMenuSubTriggerPrimitiveProps,
  DropdownMenuTrigger as DropdownMenuTriggerPrimitive,
  type DropdownMenuTriggerProps as DropdownMenuTriggerPrimitiveProps,
} from '@/components/ui/primitives/radix/dropdown-menu';
import { cn } from '@/lib/utils';

type DropdownMenuProps = DropdownMenuPrimitiveProps;

function DropdownMenu(props: DropdownMenuProps) {
  return <DropdownMenuPrimitive {...props} />;
}

type DropdownMenuTriggerProps = DropdownMenuTriggerPrimitiveProps;

function DropdownMenuTrigger(props: DropdownMenuTriggerProps) {
  return <DropdownMenuTriggerPrimitive {...props} />;
}

type DropdownMenuContentProps = DropdownMenuContentPrimitiveProps;

function DropdownMenuContent({
  sideOffset = 4,
  className,
  children,
  ...props
}: DropdownMenuContentProps) {
  return (
    <DropdownMenuContentPrimitive
      className={cn(
        'z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-[var(--shadow-elevated),var(--highlight)] outline-none',
        className
      )}
      sideOffset={sideOffset}
      {...props}
    >
      <DropdownMenuHighlightPrimitive className="absolute inset-0 z-0 rounded-sm bg-accent">
        {children}
      </DropdownMenuHighlightPrimitive>
    </DropdownMenuContentPrimitive>
  );
}

type DropdownMenuGroupProps = DropdownMenuGroupPrimitiveProps;

function DropdownMenuGroup({ ...props }: DropdownMenuGroupProps) {
  return <DropdownMenuGroupPrimitive {...props} />;
}

type DropdownMenuItemProps = DropdownMenuItemPrimitiveProps & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
};

function DropdownMenuItem({
  className,
  inset,
  variant = 'default',
  disabled,
  ...props
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuHighlightItemPrimitive
      activeClassName={
        variant === 'destructive'
          ? 'bg-destructive/10 dark:bg-destructive/20'
          : ''
      }
      disabled={disabled}
    >
      <DropdownMenuItemPrimitive
        className={cn(
          "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden focus:text-accent-foreground data-[disabled=true]:pointer-events-none data-inset:pl-8 data-[variant=destructive]:text-destructive data-[disabled=true]:opacity-50 data-[variant=destructive]:focus:text-destructive [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 data-[variant=destructive]:*:[svg]:text-destructive!",
          className
        )}
        data-inset={inset}
        data-variant={variant}
        disabled={disabled}
        {...props}
      />
    </DropdownMenuHighlightItemPrimitive>
  );
}

type DropdownMenuCheckboxItemProps = DropdownMenuCheckboxItemPrimitiveProps;

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  disabled,
  ...props
}: DropdownMenuCheckboxItemProps) {
  return (
    <DropdownMenuHighlightItemPrimitive disabled={disabled}>
      <DropdownMenuCheckboxItemPrimitive
        checked={checked}
        className={cn(
          "relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden focus:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
          className
        )}
        disabled={disabled}
        {...props}
      >
        <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
          <DropdownMenuItemIndicatorPrimitive
            animate={{ opacity: 1, scale: 1 }}
            initial={{ opacity: 0, scale: 0.5 }}
          >
            <HugeiconsIcon className="size-4" icon={CheckmarkCircle02Icon} />
          </DropdownMenuItemIndicatorPrimitive>
        </span>
        {children}
      </DropdownMenuCheckboxItemPrimitive>
    </DropdownMenuHighlightItemPrimitive>
  );
}

type DropdownMenuRadioGroupProps = DropdownMenuRadioGroupPrimitiveProps;

function DropdownMenuRadioGroup(props: DropdownMenuRadioGroupProps) {
  return <DropdownMenuRadioGroupPrimitive {...props} />;
}

type DropdownMenuRadioItemProps = DropdownMenuRadioItemPrimitiveProps;

function DropdownMenuRadioItem({
  className,
  children,
  disabled,
  ...props
}: DropdownMenuRadioItemProps) {
  return (
    <DropdownMenuHighlightItemPrimitive disabled={disabled}>
      <DropdownMenuRadioItemPrimitive
        className={cn(
          "relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden focus:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
          className
        )}
        disabled={disabled}
        {...props}
      >
        <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
          <DropdownMenuItemIndicatorPrimitive layoutId="dropdown-menu-item-indicator-radio">
            <HugeiconsIcon className="size-2 fill-current" icon={CircleIcon} />
          </DropdownMenuItemIndicatorPrimitive>
        </span>
        {children}
      </DropdownMenuRadioItemPrimitive>
    </DropdownMenuHighlightItemPrimitive>
  );
}

type DropdownMenuLabelProps = DropdownMenuLabelPrimitiveProps & {
  inset?: boolean;
};

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: DropdownMenuLabelProps) {
  return (
    <DropdownMenuLabelPrimitive
      className={cn(
        'px-2 py-1.5 font-medium text-sm data-inset:pl-8',
        className
      )}
      data-inset={inset}
      {...props}
    />
  );
}

type DropdownMenuSeparatorProps = DropdownMenuSeparatorPrimitiveProps;

function DropdownMenuSeparator({
  className,
  ...props
}: DropdownMenuSeparatorProps) {
  return (
    <DropdownMenuSeparatorPrimitive
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

type DropdownMenuShortcutProps = DropdownMenuShortcutPrimitiveProps;

function DropdownMenuShortcut({
  className,
  ...props
}: DropdownMenuShortcutProps) {
  return (
    <DropdownMenuShortcutPrimitive
      className={cn(
        'ml-auto text-muted-foreground text-xs tracking-widest',
        className
      )}
      {...props}
    />
  );
}

type DropdownMenuSubProps = DropdownMenuSubPrimitiveProps;

function DropdownMenuSub(props: DropdownMenuSubProps) {
  return <DropdownMenuSubPrimitive {...props} />;
}

type DropdownMenuSubTriggerProps = DropdownMenuSubTriggerPrimitiveProps & {
  inset?: boolean;
};

function DropdownMenuSubTrigger({
  disabled,
  className,
  inset,
  children,
  ...props
}: DropdownMenuSubTriggerProps) {
  return (
    <DropdownMenuHighlightItemPrimitive disabled={disabled}>
      <DropdownMenuSubTriggerPrimitive
        className={cn(
          'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden focus:text-accent-foreground data-inset:pl-8 data-[state=open]:text-accent-foreground',
          'data-[state=open]:**:data-[slot=chevron]:rotate-90 **:data-[slot=chevron]:transition-transform **:data-[slot=chevron]:duration-300 **:data-[slot=chevron]:ease-in-out',
          className
        )}
        data-inset={inset}
        disabled={disabled}
        {...props}
      >
        {children}
        <HugeiconsIcon
          className="ml-auto size-4"
          data-slot="chevron"
          icon={ArrowRight01Icon}
        />
      </DropdownMenuSubTriggerPrimitive>
    </DropdownMenuHighlightItemPrimitive>
  );
}

type DropdownMenuSubContentProps = DropdownMenuSubContentPrimitiveProps;

function DropdownMenuSubContent({
  className,
  ...props
}: DropdownMenuSubContentProps) {
  return (
    <DropdownMenuSubContentPrimitive
      className={cn(
        'z-50 min-w-32 origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-[var(--shadow-elevated),var(--highlight)] outline-none',
        className
      )}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  type DropdownMenuProps,
  type DropdownMenuTriggerProps,
  type DropdownMenuContentProps,
  type DropdownMenuGroupProps,
  type DropdownMenuItemProps,
  type DropdownMenuCheckboxItemProps,
  type DropdownMenuRadioGroupProps,
  type DropdownMenuRadioItemProps,
  type DropdownMenuLabelProps,
  type DropdownMenuSeparatorProps,
  type DropdownMenuShortcutProps,
  type DropdownMenuSubProps,
  type DropdownMenuSubTriggerProps,
  type DropdownMenuSubContentProps,
};
