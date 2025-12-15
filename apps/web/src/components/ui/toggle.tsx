import { cva, type VariantProps } from 'class-variance-authority';

import {
  ToggleHighlight as ToggleHighlightPrimitive,
  ToggleItem as ToggleItemPrimitive,
  type ToggleItemProps as ToggleItemPrimitiveProps,
  Toggle as TogglePrimitive,
  type ToggleProps as TogglePrimitiveProps,
} from '@/components/ui/primitives/radix/toggle';
import { cn } from '@/lib/utils';

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm outline-none transition-[color,background-color,box-shadow] duration-200 ease-in-out hover:bg-muted/40 hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=on]:text-accent-foreground dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline:
          'border border-input bg-transparent shadow-xs hover:bg-accent/40 hover:text-accent-foreground',
      },
      size: {
        default: 'h-9 min-w-9 px-2',
        sm: 'h-8 min-w-8 px-1.5',
        lg: 'h-10 min-w-10 px-2.5',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ToggleProps = TogglePrimitiveProps &
  ToggleItemPrimitiveProps &
  VariantProps<typeof toggleVariants>;

function Toggle({
  className,
  variant,
  size,
  pressed,
  defaultPressed,
  onPressedChange,
  disabled,
  ...props
}: ToggleProps) {
  return (
    <TogglePrimitive
      className="relative"
      defaultPressed={defaultPressed}
      disabled={disabled}
      onPressedChange={onPressedChange}
      pressed={pressed}
    >
      <ToggleHighlightPrimitive className="rounded-md bg-accent" />
      <ToggleItemPrimitive
        className={cn(toggleVariants({ variant, size, className }))}
        {...props}
      />
    </TogglePrimitive>
  );
}

export { Toggle, toggleVariants, type ToggleProps };
