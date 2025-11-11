'use client';

import { Slot } from '@radix-ui/react-slot';
import { motion, useMotionTemplate, useMotionValue } from 'motion/react';

import { cn } from '@/lib/utils';

type Variant = {
  variant: string;
  component: React.FC<React.ComponentProps<'div'>>;
};

const variants = [
  {
    variant: 'default',
    component: ({ children, className, ...props }) => (
      <div
        {...props}
        className={cn(
          'relative rounded-xl border border-primary/10 bg-main-background px-4 py-5',
          'shadow-[var(--highlight-top),var(--shadow-sm)]',
          className
        )}
      >
        {children}
      </div>
    ),
  },
  {
    variant: 'animated-border',
    component: ({ children, className, ...props }) => (
      <div
        {...props}
        className={cn(
          'relative rounded-xl border border-primary/10 bg-main-background px-4 py-5',
          'shadow-[var(--highlight-top),var(--shadow-sm)]',
          className
        )}
      >
        <div
          className={cn(
            '-inset-px pointer-events-none absolute rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box]',
            'mask-intersect mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)]'
          )}
        >
          <motion.div
            animate={{
              offsetDistance: ['0%', '100%'],
            }}
            className={cn(
              'absolute aspect-square bg-linear-to-r from-transparent via-neutral-400 to-neutral-500',
              'dark:from-transparent dark:via-neutral-600 dark:to-neutral-400'
            )}
            style={{
              width: 42,
              offsetPath: `rect(0 auto auto 0 round ${18}px)`,
            }}
            transition={{
              repeat: Number.POSITIVE_INFINITY,
              duration: 5,
              ease: 'linear',
            }}
          />
        </div>
        <span className="relative z-10">{children}</span>
      </div>
    ),
  },
  {
    variant: 'shine',
    component: ({ children, className, ...props }) => (
      <div
        {...props}
        className={cn(
          'relative overflow-hidden rounded-xl border border-primary/10 bg-main-background px-4 py-5',
          'shadow-[var(--highlight-top),var(--shadow-sm)]',
          className
        )}
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-0 animate-shine bg-size-[400%_100%]',
            'bg-[linear-gradient(110deg,transparent,45%,rgb(0_0_0_/_0.15),55%,transparent)]',
            'dark:bg-[linear-gradient(110deg,transparent,45%,rgb(255_255_255_/_0.1),55%,transparent)]'
          )}
        />
        <div className="relative z-10">{children}</div>
      </div>
    ),
  },
  {
    variant: 'revealed-pointer',
    component: ({ children, className, ...props }) => {
      const mouseX = useMotionValue(0);
      const mouseY = useMotionValue(0);

      return (
        <div
          {...props}
          aria-hidden="true"
          className={cn(
            'group relative overflow-hidden rounded-xl bg-border/50 p-px shadow-[var(--highlight-top-subtle)]',
            className
          )}
          onMouseMove={(e) => {
            const { left, top } = e.currentTarget.getBoundingClientRect();

            mouseX.set(e.clientX - left);
            mouseY.set(e.clientY - top);
          }}
          tabIndex={-1}
        >
          <motion.div
            className={cn(
              '-inset-px pointer-events-none absolute rounded-xl opacity-0 transition duration-300 group-hover:opacity-20',
              '[--color:var(--color-primary)]'
            )}
            style={{
              background: useMotionTemplate`radial-gradient(200px circle at ${mouseX}px ${mouseY}px, var(--color), transparent 80%)`,
            }}
          />
          <div className="relative size-full select-none rounded-[11px] bg-main-background px-4 py-5">
            {children}
          </div>
        </div>
      );
    },
  },
] as const satisfies readonly Variant[];

export type CardProps = {
  variant?: (typeof variants)[number]['variant'];
} & React.ComponentProps<'div'>;

export function Card({ variant = 'default', className, ...props }: CardProps) {
  const FALLBACK_INDEX = 0;

  const variantComponent = variants.find(
    (v) => v.variant === variant
  )?.component;

  const Component = variantComponent || variants[FALLBACK_INDEX].component;

  return (
    <Slot className="w-full max-w-[350px]">
      <Component {...props} className={className} />
    </Slot>
  );
}
