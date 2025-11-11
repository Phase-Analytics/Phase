import {
  ArrowRight01Icon,
  CircleIcon,
  Tick03Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ReactNode } from 'react';
import {
  MenuArrow as MenuArrowPrimitive,
  type MenuArrowProps as MenuArrowPrimitiveProps,
  MenuCheckboxItemIndicator as MenuCheckboxItemIndicatorPrimitive,
  MenuCheckboxItem as MenuCheckboxItemPrimitive,
  type MenuCheckboxItemProps as MenuCheckboxItemPrimitiveProps,
  MenuGroupLabel as MenuGroupLabelPrimitive,
  type MenuGroupLabelProps as MenuGroupLabelPrimitiveProps,
  MenuGroup as MenuGroupPrimitive,
  type MenuGroupProps as MenuGroupPrimitiveProps,
  MenuHighlightItem as MenuHighlightItemPrimitive,
  MenuHighlight as MenuHighlightPrimitive,
  MenuItem as MenuItemPrimitive,
  type MenuItemProps as MenuItemPrimitiveProps,
  MenuPopup as MenuPopupPrimitive,
  type MenuPopupProps as MenuPopupPrimitiveProps,
  MenuPortal as MenuPortalPrimitive,
  type MenuPortalProps as MenuPortalPrimitiveProps,
  MenuPositioner as MenuPositionerPrimitive,
  type MenuPositionerProps as MenuPositionerPrimitiveProps,
  Menu as MenuPrimitive,
  type MenuProps as MenuPrimitiveProps,
  MenuRadioGroup as MenuRadioGroupPrimitive,
  type MenuRadioGroupProps as MenuRadioGroupPrimitiveProps,
  MenuRadioItemIndicator as MenuRadioItemIndicatorPrimitive,
  MenuRadioItem as MenuRadioItemPrimitive,
  type MenuRadioItemProps as MenuRadioItemPrimitiveProps,
  MenuSeparator as MenuSeparatorPrimitive,
  type MenuSeparatorProps as MenuSeparatorPrimitiveProps,
  MenuShortcut as MenuShortcutPrimitive,
  type MenuShortcutProps as MenuShortcutPrimitiveProps,
  MenuSubmenu as MenuSubmenuPrimitive,
  type MenuSubmenuProps as MenuSubmenuPrimitiveProps,
  MenuSubmenuTrigger as MenuSubmenuTriggerPrimitive,
  type MenuSubmenuTriggerProps as MenuSubmenuTriggerPrimitiveProps,
  MenuTrigger as MenuTriggerPrimitive,
  type MenuTriggerProps as MenuTriggerPrimitiveProps,
} from '@/components/ui/primitives/base/dropdown';
import { cn } from '@/lib/utils';

type MenuProps = MenuPrimitiveProps;

function Menu(props: MenuProps) {
  return <MenuPrimitive {...props} />;
}

type MenuTriggerProps = MenuTriggerPrimitiveProps;

function MenuTrigger(props: MenuTriggerProps) {
  return <MenuTriggerPrimitive {...props} />;
}

type MenuPortalProps = MenuPortalPrimitiveProps;

function MenuPortal(props: MenuPortalProps) {
  return <MenuPortalPrimitive {...props} />;
}

type MenuPanelProps = MenuPopupPrimitiveProps & MenuPositionerPrimitiveProps;

function MenuPanel({
  className,
  finalFocus,
  id,
  children,
  sideOffset = 4,
  transition = { duration: 0.2 },
  ...props
}: MenuPanelProps) {
  return (
    <MenuPortal>
      <MenuPositionerPrimitive
        className="z-50"
        sideOffset={sideOffset}
        {...props}
      >
        <MenuPopupPrimitive
          className={cn(
            'max-h-(--available-height) min-w-32 origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none',
            className
          )}
          finalFocus={finalFocus}
          id={id}
          transition={transition}
        >
          <MenuHighlightPrimitive className="absolute inset-0 z-0 rounded-sm bg-accent">
            {children}
          </MenuHighlightPrimitive>
        </MenuPopupPrimitive>
      </MenuPositionerPrimitive>
    </MenuPortal>
  );
}

type MenuGroupProps = MenuGroupPrimitiveProps;

function MenuGroup(props: MenuGroupProps) {
  return <MenuGroupPrimitive {...props} />;
}

type MenuGroupLabelProps = MenuGroupLabelPrimitiveProps & {
  inset?: boolean;
};

function MenuGroupLabel({ className, inset, ...props }: MenuGroupLabelProps) {
  return (
    <MenuGroupLabelPrimitive
      className={cn(
        'px-2 py-1.5 font-medium text-sm data-inset:pl-8',
        className
      )}
      data-inset={inset}
      {...props}
    />
  );
}

type MenuItemProps = MenuItemPrimitiveProps & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
};

function MenuItem({
  className,
  inset,
  variant = 'default',
  disabled,
  ...props
}: MenuItemProps) {
  return (
    <MenuHighlightItemPrimitive
      activeClassName={
        variant === 'destructive'
          ? 'bg-destructive/10 dark:bg-destructive/20'
          : ''
      }
      disabled={disabled}
    >
      <MenuItemPrimitive
        className={cn(
          "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden focus:text-accent-foreground data-[disabled=true]:pointer-events-none data-inset:pl-8 data-[variant=destructive]:text-destructive data-[disabled=true]:opacity-50 data-[variant=destructive]:focus:text-destructive [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 data-[variant=destructive]:*:[svg]:text-destructive!",
          className
        )}
        data-inset={inset}
        data-variant={variant}
        disabled={disabled}
        {...props}
      />
    </MenuHighlightItemPrimitive>
  );
}

type MenuCheckboxItemProps = MenuCheckboxItemPrimitiveProps;

function MenuCheckboxItem({
  className,
  children,
  checked,
  disabled,
  ...props
}: MenuCheckboxItemProps) {
  return (
    <MenuHighlightItemPrimitive disabled={disabled}>
      <MenuCheckboxItemPrimitive
        checked={checked}
        className={cn(
          "relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden focus:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
          className
        )}
        disabled={disabled}
        {...props}
      >
        <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
          <MenuCheckboxItemIndicatorPrimitive
            animate={{ opacity: 1, scale: 1 }}
            initial={{ opacity: 0, scale: 0.5 }}
          >
            <HugeiconsIcon className="size-4" icon={Tick03Icon} />
          </MenuCheckboxItemIndicatorPrimitive>
        </span>
        {children}
      </MenuCheckboxItemPrimitive>
    </MenuHighlightItemPrimitive>
  );
}

type MenuRadioGroupProps = MenuRadioGroupPrimitiveProps;

function MenuRadioGroup(props: MenuRadioGroupProps) {
  return <MenuRadioGroupPrimitive {...props} />;
}

type MenuRadioItemProps = MenuRadioItemPrimitiveProps;

function MenuRadioItem({
  className,
  children,
  disabled,
  ...props
}: MenuRadioItemProps) {
  return (
    <MenuHighlightItemPrimitive disabled={disabled}>
      <MenuRadioItemPrimitive
        className={cn(
          "relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden focus:text-accent-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
          className
        )}
        disabled={disabled}
        {...props}
      >
        <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
          <MenuRadioItemIndicatorPrimitive layoutId="dropdown-menu-item-indicator-radio">
            <HugeiconsIcon className="size-2 fill-current" icon={CircleIcon} />
          </MenuRadioItemIndicatorPrimitive>
        </span>
        {children}
      </MenuRadioItemPrimitive>
    </MenuHighlightItemPrimitive>
  );
}

type MenuSeparatorProps = MenuSeparatorPrimitiveProps;

function MenuSeparator({ className, ...props }: MenuSeparatorProps) {
  return (
    <MenuSeparatorPrimitive
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

type MenuShortcutProps = MenuShortcutPrimitiveProps;

function MenuShortcut({ className, ...props }: MenuShortcutProps) {
  return (
    <MenuShortcutPrimitive
      className={cn(
        'ml-auto text-muted-foreground text-xs tracking-widest',
        className
      )}
      {...props}
    />
  );
}

type MenuArrowProps = MenuArrowPrimitiveProps;

function MenuArrow(props: MenuArrowProps) {
  return <MenuArrowPrimitive {...props} />;
}

type MenuSubmenuProps = MenuSubmenuPrimitiveProps;

function MenuSubmenu(props: MenuSubmenuProps) {
  return <MenuSubmenuPrimitive {...props} />;
}

type MenuSubmenuTriggerProps = MenuSubmenuTriggerPrimitiveProps & {
  inset?: boolean;
  children?: ReactNode;
};

function MenuSubmenuTrigger({
  disabled,
  className,
  inset,
  children,
  ...props
}: MenuSubmenuTriggerProps) {
  return (
    <MenuHighlightItemPrimitive disabled={disabled}>
      <MenuSubmenuTriggerPrimitive
        className={cn(
          'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-hidden focus:text-accent-foreground data-inset:pl-8 data-[state=open]:text-accent-foreground',
          '**:data-[slot=chevron]:transition-transform **:data-[slot=chevron]:duration-300 **:data-[slot=chevron]:ease-in-out aria-expanded:**:data-[slot=chevron]:rotate-90',
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
      </MenuSubmenuTriggerPrimitive>
    </MenuHighlightItemPrimitive>
  );
}

type MenuSubmenuPanelProps = MenuPopupPrimitiveProps &
  MenuPositionerPrimitiveProps;

function MenuSubmenuPanel({
  className,
  finalFocus,
  id,
  children,
  sideOffset = 4,
  transition = { duration: 0.2 },
  ...props
}: MenuSubmenuPanelProps) {
  return (
    <MenuPortal>
      <MenuPositionerPrimitive
        className="z-50"
        sideOffset={sideOffset}
        {...props}
      >
        <MenuPopupPrimitive
          className={cn(
            'max-h-(--available-height) min-w-32 origin-(--transform-origin) overflow-y-auto overflow-x-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
            className
          )}
          finalFocus={finalFocus}
          id={id}
          transition={transition}
        >
          {children}
        </MenuPopupPrimitive>
      </MenuPositionerPrimitive>
    </MenuPortal>
  );
}

export {
  Menu,
  MenuTrigger,
  MenuPortal,
  MenuPanel,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuArrow,
  MenuSubmenu,
  MenuSubmenuTrigger,
  MenuSubmenuPanel,
  type MenuProps,
  type MenuTriggerProps,
  type MenuPortalProps,
  type MenuPanelProps,
  type MenuGroupProps,
  type MenuGroupLabelProps,
  type MenuItemProps,
  type MenuCheckboxItemProps,
  type MenuRadioGroupProps,
  type MenuRadioItemProps,
  type MenuSeparatorProps,
  type MenuShortcutProps,
  type MenuArrowProps,
  type MenuSubmenuProps,
  type MenuSubmenuTriggerProps,
  type MenuSubmenuPanelProps,
};
