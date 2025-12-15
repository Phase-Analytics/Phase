'use client';

import { cva, type VariantProps } from 'class-variance-authority';

import {
  Button as ButtonPrimitive,
  type ButtonProps as ButtonPrimitiveProps,
} from '@/components/ui/primitives/buttons/button';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm outline-none transition-[box-shadow,_color,_background-color,_border-color,_outline-color,_text-decoration-color,_fill,_stroke,_transform] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[var(--shadow),var(--highlight)] hover:bg-primary/90',
        accent:
          'bg-accent text-accent-foreground shadow-[var(--shadow),var(--highlight)] hover:bg-accent/90',
        destructive:
          'bg-destructive text-white shadow-[var(--shadow),var(--highlight)] hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
        outline:
          'border bg-background shadow-[var(--shadow),var(--highlight)] hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground shadow-[var(--shadow),var(--highlight)] hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
        success:
          'bg-gradient-to-t from-green-700 to-green-600 text-white shadow-[var(--shadow),var(--highlight)] hover:from-green-800 hover:to-green-700',
        warning:
          'bg-gradient-to-t from-yellow-600 to-yellow-500 text-white shadow-[var(--shadow),var(--highlight)] hover:from-yellow-700 hover:to-yellow-600',
        shine:
          'animate-shine bg-[length:400%_100%] bg-[linear-gradient(110deg,#e5e5e5,45%,#ffffff,55%,#e5e5e5)] text-foreground shadow-[var(--shadow),var(--highlight)] dark:bg-[linear-gradient(110deg,#000103,45%,#303030,55%,#000103)] dark:text-white',
        'gradient-primary':
          'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-[var(--shadow),var(--highlight)] hover:from-primary/90 hover:to-primary/70',
        'gradient-destructive':
          'bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white shadow-[var(--shadow),var(--highlight)] hover:from-red-700 hover:via-red-600 hover:to-orange-600',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8 rounded-md',
        'icon-lg': 'size-10 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ButtonProps = ButtonPrimitiveProps & VariantProps<typeof buttonVariants>;

function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants, type ButtonProps };
