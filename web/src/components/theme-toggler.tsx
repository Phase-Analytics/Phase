'use client';

import { Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { type HTMLMotionProps, motion } from 'motion/react';
import { useTheme } from 'next-themes';
import {
  Fragment,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ThemeSelection = 'light' | 'dark' | 'system';
type Resolved = 'light' | 'dark';
type Direction = 'btt' | 'ttb' | 'ltr' | 'rtl';

function getSystemEffective(): Resolved {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getClipKeyframes(direction: Direction): [string, string] {
  switch (direction) {
    case 'ltr':
      return ['inset(0 100% 0 0)', 'inset(0 0 0 0)'];
    case 'rtl':
      return ['inset(0 0 0 100%)', 'inset(0 0 0 0)'];
    case 'ttb':
      return ['inset(0 0 100% 0)', 'inset(0 0 0 0)'];
    case 'btt':
      return ['inset(100% 0 0 0)', 'inset(0 0 0 0)'];
    default:
      return ['inset(0 100% 0 0)', 'inset(0 0 0 0)'];
  }
}

const getIcon = (resolved: Resolved) => {
  if (resolved === 'dark') {
    return <HugeiconsIcon icon={Moon02Icon} />;
  }
  return <HugeiconsIcon icon={Sun03Icon} />;
};

const getNextTheme = (
  effective: ThemeSelection,
  modes: ThemeSelection[]
): ThemeSelection => {
  const i = modes.indexOf(effective);
  if (i === -1) {
    return modes[0];
  }
  return modes[(i + 1) % modes.length];
};

type BlurProps = {
  children?: ReactNode;
  delay?: number;
  initialBlur?: number;
  blur?: number;
  inView?: boolean;
  asChild?: boolean;
  ref?: Ref<HTMLElement>;
} & HTMLMotionProps<'div'>;

function Blur({
  ref,
  transition = { type: 'spring', stiffness: 200, damping: 20 },
  delay = 0,
  initialBlur = 10,
  blur = 0,
  inView = true,
  ...props
}: BlurProps) {
  return (
    <motion.div
      animate={inView ? 'visible' : 'hidden'}
      exit="hidden"
      initial="hidden"
      ref={ref as Ref<HTMLDivElement>}
      transition={{
        ...transition,
        delay: (transition?.delay ?? 0) + delay / 1000,
      }}
      variants={{
        hidden: { filter: `blur(${initialBlur}px)` },
        visible: { filter: `blur(${blur}px)` },
      }}
      {...props}
    />
  );
}

type ThemeTogglerProps = {
  theme: ThemeSelection;
  resolvedTheme: Resolved;
  setTheme: (theme: ThemeSelection) => void;
  direction?: Direction;
  onImmediateChange?: (theme: ThemeSelection) => void;
  children?: (state: {
    resolved: Resolved;
    effective: ThemeSelection;
    toggleTheme: (theme: ThemeSelection) => void;
  }) => ReactNode;
};

function ThemeToggler({
  theme,
  resolvedTheme,
  setTheme,
  onImmediateChange,
  direction = 'ltr',
  children,
  ...props
}: ThemeTogglerProps) {
  const [preview, setPreview] = useState<null | {
    effective: ThemeSelection;
    resolved: Resolved;
  }>(null);
  const [current, setCurrent] = useState<{
    effective: ThemeSelection;
    resolved: Resolved;
  }>({
    effective: theme,
    resolved: resolvedTheme,
  });

  useEffect(() => {
    if (
      preview &&
      theme === preview.effective &&
      resolvedTheme === preview.resolved
    ) {
      setPreview(null);
    }
  }, [theme, resolvedTheme, preview]);

  const [fromClip, toClip] = getClipKeyframes(direction);

  const toggleTheme = useCallback(
    async (newTheme: ThemeSelection) => {
      const resolved = newTheme === 'system' ? getSystemEffective() : newTheme;

      setCurrent({ effective: newTheme, resolved });
      onImmediateChange?.(newTheme);

      if (newTheme === 'system' && resolved === resolvedTheme) {
        setTheme(newTheme);
        return;
      }

      if (!document.startViewTransition) {
        flushSync(() => {
          setPreview({ effective: newTheme, resolved });
        });
        setTheme(newTheme);
        return;
      }

      await document.startViewTransition(() => {
        flushSync(() => {
          setPreview({ effective: newTheme, resolved });
          document.documentElement.classList.toggle(
            'dark',
            resolved === 'dark'
          );
        });
      }).ready;

      document.documentElement
        .animate(
          { clipPath: [fromClip, toClip] },
          {
            duration: 700,
            easing: 'ease-in-out',
            pseudoElement: '::view-transition-new(root)',
          }
        )
        .finished.finally(() => {
          setTheme(newTheme);
        });
    },
    [onImmediateChange, resolvedTheme, fromClip, toClip, setTheme]
  );

  return (
    <Fragment {...props}>
      {typeof children === 'function'
        ? children({
            effective: current.effective,
            resolved: current.resolved,
            toggleTheme,
          })
        : children}
      <style>
        {
          '::view-transition-old(root), ::view-transition-new(root){animation:none;mix-blend-mode:normal;}'
        }
      </style>
    </Fragment>
  );
}

type ThemeTogglerButtonProps = {
  modes?: ThemeSelection[];
  onImmediateChange?: (theme: ThemeSelection) => void;
  direction?: Direction;
  className?: string;
  size?: 'default' | 'sm' | 'lg';
} & Omit<React.ComponentProps<'button'>, 'children'>;

function ThemeTogglerButton({
  size = 'default',
  modes = ['light', 'dark'],
  direction = 'rtl',
  onImmediateChange,
  onClick,
  className,
  ...props
}: ThemeTogglerButtonProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isReady = mounted && resolvedTheme;

  const sizeStyles = {
    default: 'size-9',
    sm: 'size-8',
    lg: 'size-10',
  };

  const buttonClassName = cn(
    'flex items-center justify-center rounded-full p-0 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    sizeStyles[size],
    className
  );

  if (!isReady) {
    return (
      <Button
        className={buttonClassName}
        data-slot="theme-toggler-button"
        disabled
        variant="outline"
        {...props}
      >
        <Blur blur={0} initialBlur={10} inView>
          <HugeiconsIcon icon={Sun03Icon} />
        </Blur>
      </Button>
    );
  }

  return (
    <ThemeToggler
      direction={direction}
      onImmediateChange={onImmediateChange}
      resolvedTheme={resolvedTheme as Resolved}
      setTheme={setTheme}
      theme={theme as ThemeSelection}
    >
      {({ effective, resolved, toggleTheme }) => (
        <Button
          className={buttonClassName}
          data-slot="theme-toggler-button"
          onClick={(e) => {
            onClick?.(e);
            toggleTheme(getNextTheme(effective, modes));
          }}
          variant="outline"
          {...props}
        >
          <Blur blur={0} initialBlur={0} inView>
            {getIcon(resolved)}
          </Blur>
        </Button>
      )}
    </ThemeToggler>
  );
}

export { ThemeTogglerButton, type ThemeTogglerButtonProps };
