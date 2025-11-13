'use client';

import { AnimatePresence, motion, type Variants } from 'motion/react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

type InputProps = React.ComponentPropsWithRef<'input'>;

type FieldState = 'idle' | 'filled';

function Input({
  placeholder,
  onChange,
  className,
  type,
  ...props
}: InputProps) {
  const [fieldState, setFieldState] = useState<FieldState>('idle');

  const animatedPlaceholderVariants: Variants = {
    show: {
      x: 0,
      opacity: 1,
      filter: 'blur(0px)',
    },
    hidden: {
      x: 28,
      opacity: 0,
      filter: 'blur(4px)',
    },
  };

  return (
    <div
      className={cn(
        'relative inline-flex h-9 w-full items-center overflow-hidden rounded-md border border-input bg-transparent shadow-[var(--shadow),var(--highlight)] transition-colors ease-out focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 data-[filled=true]:border-input dark:bg-input/30',
        'has-disabled:opacity-50 has-disabled:*:pointer-events-none has-disabled:*:cursor-not-allowed',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        className
      )}
      data-filled={fieldState === 'filled'}
      data-slot="input"
    >
      <input
        {...props}
        className={cn(
          'peer h-full w-full flex-1 bg-transparent px-3 py-1 text-base caret-primary outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:sr-only md:text-sm',
          'font-normal text-foreground'
        )}
        onChange={(event) => {
          setFieldState(event.target.value.length > 0 ? 'filled' : 'idle');
          onChange?.(event);
        }}
        placeholder={placeholder}
        type={type}
      />
      <AnimatePresence initial={false} mode="popLayout">
        {fieldState !== 'filled' && placeholder && (
          <motion.span
            animate="show"
            className={cn(
              'pointer-events-none absolute left-3',
              'font-normal text-muted-foreground text-sm'
            )}
            exit="hidden"
            initial="hidden"
            transition={{
              type: 'spring',
              duration: 0.4,
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

export { Input };
