'use client';

import { Slot } from '@radix-ui/react-slot';

import { motion, type Variants } from 'motion/react';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const content: Variants = {
  hidden: {
    clipPath: 'inset(10% 50% 90% 50% round 12px)',
    transition: {
      type: 'spring',
      bounce: 0,
      duration: 0.2,
    },
  },
  show: {
    clipPath: 'inset(0% 0% 0% 0% round 12px)',
    transition: {
      type: 'spring',
      bounce: 0,
      duration: 0.2,
      delayChildren: 0.03,
      staggerChildren: 0.03,
    },
  },
};

const item: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.3,
    filter: 'blur(20px)',
    transition: {
      duration: 0.15,
    },
  },
  show: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.15,
    },
  },
};

type DropdownMenuProps = React.ComponentProps<'nav'>;

function DropdownMenuInner({
  className,
  children,
  ...props
}: DropdownMenuProps) {
  const ref = useRef<HTMLElement>(null);
  const { isOpen, setIsOpen } = useDropdownMenu();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  return (
    <nav
      className={cn('mx-auto w-full max-w-[200px] space-y-2', className)}
      ref={ref}
      {...props}
    >
      {children}
    </nav>
  );
}

export function DropdownMenu(props: DropdownMenuProps) {
  return (
    <DropdownMenuProvider>
      <DropdownMenuInner {...props} />
    </DropdownMenuProvider>
  );
}

type DropdownMenuTriggerProps = {
  asChild?: boolean;
  icon?: React.ReactNode;
  iconOpen?: React.ReactNode;
} & React.ComponentProps<'button'>;

export function DropdownMenuTrigger({
  asChild = false,
  children,
  className,
  icon,
  iconOpen,
  ...props
}: DropdownMenuTriggerProps) {
  const { isOpen, setIsOpen } = useDropdownMenu();

  const Comp = asChild ? Slot : 'button';

  const hasIconTransition = icon && iconOpen;

  const shouldShowIcon = icon || iconOpen;

  return (
    <Comp
      className={cn(
        'flex w-full max-w-[300px] items-center justify-between rounded-xl border border-border bg-main-secondary px-4 py-2 text-primary-foreground transition-all duration-200',
        'shadow-[var(--highlight-top-subtle),var(--shadow-xs)]',
        'hover:scale-[1.02] hover:bg-main-foreground/40 hover:shadow-[var(--highlight-top-subtle),var(--shadow-sm)]',
        'active:scale-[0.98] active:shadow-[var(--highlight-top-subtle),var(--shadow-xs)]',
        'focus-visible:outline-none',
        className
      )}
      onClick={() => setIsOpen((prev) => !prev)}
      {...props}
    >
      {children}
      {shouldShowIcon && (
        <span className="relative inline-flex items-center justify-center">
          {hasIconTransition ? (
            <>
              <span
                className={cn(
                  'absolute transition-all duration-300 ease-out',
                  isOpen
                    ? 'rotate-90 scale-0 opacity-0'
                    : 'rotate-0 scale-100 opacity-100'
                )}
              >
                {icon}
              </span>
              <span
                className={cn(
                  'absolute transition-all duration-300 ease-out',
                  isOpen
                    ? 'rotate-0 scale-100 opacity-100'
                    : '-rotate-90 scale-0 opacity-0'
                )}
              >
                {iconOpen}
              </span>
            </>
          ) : (
            <span>{icon || iconOpen}</span>
          )}
        </span>
      )}
    </Comp>
  );
}

type DropdownMenuContentProps = {
  floating?: boolean;
} & React.ComponentProps<typeof motion.ul>;

export function DropdownMenuContent({
  children,
  floating = false,
  className,
  ...props
}: DropdownMenuContentProps) {
  const { isOpen } = useDropdownMenu();

  return (
    <motion.ul
      animate={isOpen ? 'show' : 'hidden'}
      className={cn(
        'z-1 mx-auto flex w-full max-w-[200px] flex-col gap-1 rounded-xl px-1.5 py-2',
        'border border-border bg-main-secondary shadow-[var(--highlight-top-subtle),var(--shadow-md)]',
        floating ? 'absolute' : 'relative',
        className
      )}
      exit="hidden"
      initial="hidden"
      style={{
        pointerEvents: isOpen ? 'auto' : 'none',
      }}
      variants={content}
      {...props}
    >
      {children}
    </motion.ul>
  );
}

type DropdownMenuItemProps = {
  asChild?: boolean;
  shortcut?: React.ReactNode;
} & React.ComponentProps<'button'>;

export function DropdownMenuItem({
  asChild = false,
  children,
  className,
  shortcut,
  ...props
}: DropdownMenuItemProps) {
  const Comp = asChild ? Slot : 'button';

  return (
    <motion.li variants={item}>
      <Comp
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border border-transparent py-1 text-primary-muted transition-colors',
          'hover:text-primary-foreground focus-visible:border-border focus-visible:text-primary-foreground focus-visible:outline-none',
          'select-none px-1.5 hover:bg-main-foreground/80 focus-visible:bg-main-foreground/80',
          className
        )}
        {...props}
      >
        <span className="flex items-center gap-2">{children}</span>
        {shortcut && (
          <span className="ml-auto text-primary-muted/50 text-xs">
            {shortcut}
          </span>
        )}
      </Comp>
    </motion.li>
  );
}

type DropdownMenuGroupProps = {
  title?: string;
} & React.ComponentProps<'div'>;

export function DropdownMenuGroup({
  title,
  children,
  className,
}: DropdownMenuGroupProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {title && (
        <div className="px-1.5 py-0.5 font-medium text-primary-muted/70 text-xs">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return <Separator className={cn('my-1.5', className)} {...props} />;
}

const Context = createContext(
  {} as {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  }
);

function DropdownMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const value = { isOpen, setIsOpen };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

function useDropdownMenu() {
  const { isOpen, setIsOpen } = useContext(Context);

  return { isOpen, setIsOpen };
}
