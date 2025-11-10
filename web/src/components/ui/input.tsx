'use client';

import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useState } from 'react';

import { cn } from '@/lib/utils';

type InputProps = React.ComponentPropsWithRef<'input'>;

type FieldState = 'idle' | 'filled';

export function Input({
  placeholder,
  onChange,
  className,
  ...props
}: InputProps) {
  const [fieldState, setFieldState] = useState<FieldState>('idle');

  const animatedPlaceholderVariants: Variants = {
    show: {
      x: 0,
      opacity: 1,
      filter: 'blur(var(--blur-none))',
    },
    hidden: {
      x: 28,
      opacity: 0,
      filter: 'blur(var(--blur-xs))',
    },
  };

  return (
    <div
      className={cn(
        'relative inline-flex h-11 w-64 items-center overflow-hidden rounded-xl border border-border bg-main-secondary shadow-xs transition-colors ease-out focus-within:border-primary/20 data-[filled=true]:border-border',
        'has-disabled:opacity-80 has-disabled:*:cursor-not-allowed',
        className
      )}
      data-filled={fieldState === 'filled'}
    >
      <input
        {...props}
        className={cn(
          'peer h-full flex-1 bg-transparent px-3 py-2 caret-primary outline-none placeholder:sr-only',
          'font-normal font-sans text-primary-foreground text-sm/5.5'
        )}
        onChange={(event) => {
          setFieldState(event.target.value.length > 0 ? 'filled' : 'idle');
          onChange?.(event);
        }}
        placeholder={placeholder}
      />
      <AnimatePresence initial={false} mode="popLayout">
        {fieldState !== 'filled' && (
          <motion.span
            animate="show"
            className={cn(
              'pointer-events-none absolute left-3',
              'font-normal font-sans text-primary-muted/70 text-sm/5.5'
            )}
            exit="hidden"
            initial="hidden"
            transition={{
              type: 'spring',
              duration: 0.6,
              bounce: 0,
            }}
            variants={animatedPlaceholderVariants}
          >
            {placeholder}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
