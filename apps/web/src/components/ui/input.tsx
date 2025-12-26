'use client';

import { AnimatePresence, motion, type Variants } from 'motion/react';
import {
  type ComponentProps,
  type MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

type InputProps = ComponentProps<'input'>;

function Input({
  placeholder,
  onChange,
  onFocus,
  className,
  type,
  autoComplete,
  value,
  defaultValue,
  ref,
  ...props
}: InputProps) {
  const [isFilled, setIsFilled] = useState(() => {
    if (value !== undefined) {
      return String(value).length > 0;
    }
    if (defaultValue !== undefined) {
      return String(defaultValue).length > 0;
    }
    return false;
  });

  const internalRef = useRef<HTMLInputElement>(null);

  const handleRef = useCallback(
    (node: HTMLInputElement | null) => {
      internalRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref !== null && ref !== undefined) {
        (ref as MutableRefObject<HTMLInputElement | null>).current = node;
      }
    },
    [ref]
  );

  useEffect(() => {
    if (value !== undefined) {
      setIsFilled(String(value).length > 0);
    }
  }, [value]);

  useEffect(() => {
    if (value === undefined && internalRef.current) {
      setIsFilled(internalRef.current.value.length > 0);
    }
  }, [value]);

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
        'relative inline-flex h-9 w-full items-center overflow-hidden rounded-md border border-input bg-transparent shadow-[var(--shadow),var(--highlight)] transition-colors ease-out focus-within:rounded-md focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50 dark:bg-input/30',
        'has-disabled:opacity-50 has-disabled:*:pointer-events-none has-disabled:*:cursor-not-allowed',
        'aria-invalid:rounded-md aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        className
      )}
      data-filled={isFilled}
      data-slot="input"
    >
      <input
        ref={handleRef}
        {...props}
        autoComplete={autoComplete}
        autoCorrect="off"
        className={cn(
          'peer h-full w-full flex-1 bg-transparent px-3 py-1 text-base caret-primary outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm md:text-sm',
          'font-normal font-sans text-foreground'
        )}
        defaultValue={defaultValue}
        onChange={(event) => {
          setIsFilled(event.target.value.length > 0);
          onChange?.(event);
        }}
        onFocus={(event) => {
          const input = event.target;
          const valueLength = input.value.length;
          requestAnimationFrame(() => {
            try {
              input.setSelectionRange(valueLength, valueLength);
            } catch {
              // Some input types don't support selection
            }
          });
          onFocus?.(event);
        }}
        spellCheck={false}
        type={type}
        value={value}
      />
      <AnimatePresence initial={false} mode="popLayout">
        {!isFilled && placeholder && (
          <motion.span
            animate="show"
            className={cn(
              'pointer-events-none absolute left-3',
              'font-normal font-sans text-muted-foreground text-sm'
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

Input.displayName = 'Input';

export { Input };
