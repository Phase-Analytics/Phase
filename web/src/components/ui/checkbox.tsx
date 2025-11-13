import { cva, type VariantProps } from 'class-variance-authority';
import {
  CheckboxIndicator as CheckboxIndicatorPrimitive,
  Checkbox as CheckboxPrimitive,
  type CheckboxProps as CheckboxPrimitiveProps,
} from '@/components/ui/primitives/radix/checkbox';
import { cn } from '@/lib/utils';

const checkboxVariants = cva(
  'peer flex shrink-0 items-center justify-center shadow-[var(--shadow)] outline-none transition-colors duration-500 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&[data-state=checked],&[data-state=indeterminate]]:bg-primary [&[data-state=checked],&[data-state=indeterminate]]:text-primary-foreground [&[data-state=checked],&[data-state=indeterminate]]:shadow-[var(--shadow),var(--highlight)]',
  {
    variants: {
      variant: {
        default: 'border bg-background',
        accent: 'bg-input',
      },
      size: {
        default: 'size-5 rounded-sm',
        sm: 'size-4.5 rounded-[5px]',
        lg: 'size-6 rounded-[7px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const checkboxIndicatorVariants = cva('', {
  variants: {
    size: {
      default: 'size-3.5',
      sm: 'size-3',
      lg: 'size-4',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

type CheckboxProps = CheckboxPrimitiveProps &
  VariantProps<typeof checkboxVariants>;

function Checkbox({
  className,
  children,
  variant,
  size,
  ...props
}: CheckboxProps) {
  return (
    <CheckboxPrimitive
      className={cn(checkboxVariants({ variant, size, className }))}
      {...props}
    >
      {children}
      <CheckboxIndicatorPrimitive
        className={cn(checkboxIndicatorVariants({ size }))}
      />
    </CheckboxPrimitive>
  );
}

export { Checkbox, type CheckboxProps };
