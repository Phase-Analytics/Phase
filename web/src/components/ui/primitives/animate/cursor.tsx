'use client';

import {
  AnimatePresence,
  type HTMLMotionProps,
  motion,
  type SpringOptions,
  useMotionValue,
  useSpring,
} from 'motion/react';
import type { ReactNode, RefObject } from 'react';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Slot,
  type WithAsChild,
} from '@/components/ui/primitives/animate/slot';
import { getStrictContext } from '@/hooks/get-strict-context';

type CursorContextType = {
  cursorPos: { x: number; y: number };
  active: boolean;
  global: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  cursorRef: RefObject<HTMLDivElement | null>;
};

const [LocalCursorProvider, useCursor] =
  getStrictContext<CursorContextType>('CursorContext');

type CursorProviderProps = {
  children: ReactNode;
  global?: boolean;
};

function CursorProvider({ children, global = false }: CursorProviderProps) {
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = '__cursor_none_style__';
    if (document.getElementById(id)) {
      return;
    }

    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .animate-ui-cursor-none, .animate-ui-cursor-none * { cursor: none !important; }
    `;
    document.head.appendChild(style);
  }, []);

  useEffect(() => {
    let removeListeners: () => void;

    if (global) {
      const handlePointerMove = (e: PointerEvent) => {
        setCursorPos({ x: e.clientX, y: e.clientY });
        setActive(true);
      };

      const handlePointerOut = (e: PointerEvent | MouseEvent) => {
        if (e instanceof PointerEvent && e.relatedTarget === null) {
          setActive(false);
        }
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          setActive(false);
        }
      };

      window.addEventListener('pointermove', handlePointerMove, {
        passive: true,
      });
      window.addEventListener('pointerout', handlePointerOut, {
        passive: true,
      });
      window.addEventListener('mouseout', handlePointerOut, { passive: true });
      document.addEventListener('visibilitychange', handleVisibilityChange);

      removeListeners = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerout', handlePointerOut);
        window.removeEventListener('mouseout', handlePointerOut);
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange
        );
      };
    } else {
      if (!containerRef.current) {
        return;
      }

      const parent = containerRef.current.parentElement;
      if (!parent) {
        return;
      }

      if (getComputedStyle(parent).position === 'static') {
        parent.style.position = 'relative';
      }

      const handlePointerMove = (e: PointerEvent) => {
        const rect = parent.getBoundingClientRect();
        setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setActive(true);
      };

      const handlePointerOut = (e: PointerEvent | MouseEvent) => {
        if (
          e.relatedTarget === null ||
          !(parent as Node).contains(e.relatedTarget as Node)
        ) {
          setActive(false);
        }
      };

      parent.addEventListener('pointermove', handlePointerMove, {
        passive: true,
      });
      parent.addEventListener('pointerout', handlePointerOut, {
        passive: true,
      });
      parent.addEventListener('mouseout', handlePointerOut, { passive: true });

      removeListeners = () => {
        parent.removeEventListener('pointermove', handlePointerMove);
        parent.removeEventListener('pointerout', handlePointerOut);
        parent.removeEventListener('mouseout', handlePointerOut);
      };
    }

    return removeListeners;
  }, [global]);

  return (
    <LocalCursorProvider
      value={{ cursorPos, active, global, containerRef, cursorRef }}
    >
      {children}
    </LocalCursorProvider>
  );
}

type CursorContainerProps = WithAsChild<HTMLMotionProps<'div'>>;

function CursorContainer({
  ref,
  asChild = false,
  ...props
}: CursorContainerProps) {
  const { containerRef, global, active } = useCursor();
  useImperativeHandle(ref, () => containerRef.current as HTMLDivElement);

  const Component = asChild ? Slot : motion.div;

  return (
    <Component
      data-active={active}
      data-global={global}
      data-slot="cursor-container"
      ref={containerRef}
      {...props}
    />
  );
}

type CursorProps = WithAsChild<
  HTMLMotionProps<'div'> & {
    children: ReactNode;
  }
>;

function Cursor({ ref, asChild = false, style, ...props }: CursorProps) {
  const { cursorPos, active, containerRef, cursorRef, global } = useCursor();
  useImperativeHandle(ref, () => cursorRef.current as HTMLDivElement);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    const target = global
      ? document.documentElement
      : containerRef.current?.parentElement;

    if (!target) {
      return;
    }

    if (active) {
      target.classList.add('animate-ui-cursor-none');
    } else {
      target.classList.remove('animate-ui-cursor-none');
    }

    return () => {
      target.classList.remove('animate-ui-cursor-none');
    };
  }, [active, global, containerRef]);

  useEffect(() => {
    x.set(cursorPos.x);
    y.set(cursorPos.y);
  }, [cursorPos, x, y]);

  const Component = asChild ? Slot : motion.div;

  return (
    <AnimatePresence>
      {active && (
        <Component
          animate={{ scale: 1, opacity: 1 }}
          data-active={active}
          data-global={global}
          data-slot="cursor"
          exit={{ scale: 0, opacity: 0 }}
          initial={{ scale: 0, opacity: 0 }}
          ref={cursorRef}
          style={{
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none',
            zIndex: 9999,
            position: global ? 'fixed' : 'absolute',
            top: y,
            left: x,
            ...style,
          }}
          {...props}
        />
      )}
    </AnimatePresence>
  );
}

type CursorFollowSide = 'top' | 'right' | 'bottom' | 'left';
type CursorFollowAlign = 'start' | 'center' | 'end';

type CursorFollowProps = WithAsChild<
  Omit<HTMLMotionProps<'div'>, 'transition'> & {
    side?: CursorFollowSide;
    sideOffset?: number;
    align?: CursorFollowAlign;
    alignOffset?: number;
    transition?: SpringOptions;
    children: ReactNode;
  }
>;

function CursorFollow({
  ref,
  asChild = false,
  side = 'bottom',
  sideOffset = 0,
  align = 'end',
  alignOffset = 0,
  style,
  transition = { stiffness: 500, damping: 50, bounce: 0 },
  ...props
}: CursorFollowProps) {
  const { cursorPos, active, cursorRef, global } = useCursor();
  const cursorFollowRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => cursorFollowRef.current as HTMLDivElement);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, transition);
  const springY = useSpring(y, transition);

  const calculateOffset = useCallback(() => {
    const rect = cursorFollowRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 0;
    const height = rect?.height ?? 0;

    let offsetX = 0;
    let offsetY = 0;

    switch (side) {
      case 'top':
        offsetY = height + sideOffset;
        switch (align) {
          case 'start':
            offsetX = width + alignOffset;
            break;
          case 'center':
            offsetX = width / 2;
            break;
          case 'end':
            offsetX = -alignOffset;
            break;
          default:
            break;
        }
        break;

      case 'bottom':
        offsetY = -sideOffset;
        switch (align) {
          case 'start':
            offsetX = width + alignOffset;
            break;
          case 'center':
            offsetX = width / 2;
            break;
          case 'end':
            offsetX = -alignOffset;
            break;
          default:
            break;
        }
        break;

      case 'left':
        offsetX = width + sideOffset;
        switch (align) {
          case 'start':
            offsetY = height + alignOffset;
            break;
          case 'center':
            offsetY = height / 2;
            break;
          case 'end':
            offsetY = -alignOffset;
            break;
          default:
            break;
        }
        break;

      case 'right':
        offsetX = -sideOffset;
        switch (align) {
          case 'start':
            offsetY = height + alignOffset;
            break;
          case 'center':
            offsetY = height / 2;
            break;
          case 'end':
            offsetY = -alignOffset;
            break;
          default:
            break;
        }
        break;

      default:
        break;
    }

    return { x: offsetX, y: offsetY };
  }, [side, align, sideOffset, alignOffset]);

  useEffect(() => {
    const offset = calculateOffset();
    const cursorRect = cursorRef.current?.getBoundingClientRect();
    const cursorWidth = cursorRect?.width ?? 20;
    const cursorHeight = cursorRect?.height ?? 20;

    x.set(cursorPos.x - offset.x + cursorWidth / 2);
    y.set(cursorPos.y - offset.y + cursorHeight / 2);
  }, [calculateOffset, cursorPos, cursorRef, x, y]);

  const Component = asChild ? Slot : motion.div;

  return (
    <AnimatePresence>
      {active && (
        <Component
          animate={{ scale: 1, opacity: 1 }}
          data-active={active}
          data-global={global}
          data-slot="cursor-follow"
          exit={{ scale: 0, opacity: 0 }}
          initial={{ scale: 0, opacity: 0 }}
          ref={cursorFollowRef}
          style={{
            transform: 'translate(-50%,-50%)',
            pointerEvents: 'none',
            zIndex: 9998,
            position: global ? 'fixed' : 'absolute',
            top: springY,
            left: springX,
            ...style,
          }}
          {...props}
        />
      )}
    </AnimatePresence>
  );
}

export {
  CursorProvider,
  Cursor,
  CursorContainer,
  CursorFollow,
  useCursor,
  type CursorProviderProps,
  type CursorProps,
  type CursorContainerProps,
  type CursorFollowProps,
  type CursorFollowAlign,
  type CursorFollowSide,
  type CursorContextType,
};
