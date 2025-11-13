'use client';

import { motion } from 'motion/react';
import {
  type ComponentProps,
  type CSSProperties,
  cloneElement,
  isValidElement,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

type ShineProps = ComponentProps<'div'> & {
  color?: string;
  opacity?: number;
  delay?: number;
  duration?: number;
  loop?: boolean;
  loopDelay?: number;
  deg?: number;
  enable?: boolean;
  enableOnHover?: boolean;
  enableOnTap?: boolean;
  asChild?: boolean;
  children?: ReactNode;
};

const Shine = ({
  color = 'currentColor',
  opacity = 0.3,
  delay = 0,
  duration = 1200,
  loop = false,
  loopDelay = 0,
  deg = -15,
  enable = true,
  enableOnHover = false,
  enableOnTap = false,
  asChild = false,
  style,
  children,
  onMouseEnter,
  onMouseLeave,
  onPointerDown,
  ...props
}: ShineProps) => {
  const isAlwaysOn = enable && !enableOnHover && !enableOnTap;
  const [animateState, setAnimateState] = useState<'initial' | 'shine'>(
    isAlwaysOn ? 'shine' : 'initial'
  );
  const hoverLoopTimeoutRef = useRef<number | undefined>(undefined);
  const hoverLoopRafRef = useRef<number | undefined>(undefined);
  const [isHovered, setIsHovered] = useState(false);
  const [currentDelay, setCurrentDelay] = useState(delay);

  useEffect(() => {
    setAnimateState(isAlwaysOn ? 'shine' : 'initial');
    if (isAlwaysOn) {
      setCurrentDelay(delay);
    }
  }, [isAlwaysOn, delay]);

  useEffect(
    () => () => {
      if (hoverLoopTimeoutRef.current !== undefined) {
        window.clearTimeout(hoverLoopTimeoutRef.current);
      }
      if (hoverLoopRafRef.current !== undefined) {
        window.cancelAnimationFrame(hoverLoopRafRef.current);
      }
    },
    []
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      onPointerDown?.(e);
      if (!(enable && enableOnTap) || isAlwaysOn) {
        return;
      }
      setCurrentDelay(delay);
      setAnimateState('shine');
    },
    [enable, enableOnTap, isAlwaysOn, delay, onPointerDown]
  );

  const handleMouseEnter = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      onMouseEnter?.(e);
      if (!(enable && enableOnHover) || isAlwaysOn) {
        return;
      }
      setIsHovered(true);
      setCurrentDelay(delay);
      setAnimateState('shine');
    },
    [enable, enableOnHover, isAlwaysOn, delay, onMouseEnter]
  );

  const handleMouseLeave = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      onMouseLeave?.(e);
      if (!(enable && enableOnHover) || isAlwaysOn) {
        return;
      }
      setIsHovered(false);
      if (hoverLoopTimeoutRef.current !== undefined) {
        window.clearTimeout(hoverLoopTimeoutRef.current);
        hoverLoopTimeoutRef.current = undefined;
      }
      if (hoverLoopRafRef.current !== undefined) {
        window.cancelAnimationFrame(hoverLoopRafRef.current);
        hoverLoopRafRef.current = undefined;
      }
    },
    [enable, enableOnHover, isAlwaysOn, onMouseLeave]
  );

  const scheduleNextShine = useCallback((delayMs: number) => {
    if (hoverLoopTimeoutRef.current !== undefined) {
      window.clearTimeout(hoverLoopTimeoutRef.current);
      hoverLoopTimeoutRef.current = undefined;
    }
    if (hoverLoopRafRef.current !== undefined) {
      window.cancelAnimationFrame(hoverLoopRafRef.current);
      hoverLoopRafRef.current = undefined;
    }
    if (delayMs > 0) {
      hoverLoopTimeoutRef.current = window.setTimeout(() => {
        setAnimateState('shine');
        hoverLoopTimeoutRef.current = undefined;
      }, delayMs);
    } else {
      hoverLoopRafRef.current = window.requestAnimationFrame(() => {
        hoverLoopRafRef.current = window.requestAnimationFrame(() => {
          setAnimateState('shine');
          hoverLoopRafRef.current = undefined;
        });
      });
    }
  }, []);

  const handleAnimationComplete = useCallback(() => {
    if (animateState !== 'shine') {
      return;
    }
    if (isAlwaysOn) {
      if (loop) {
        setAnimateState('initial');
        setCurrentDelay(0);
        scheduleNextShine(loopDelay);
      }
      return;
    }

    if (enableOnHover) {
      if (isHovered) {
        if (loop) {
          setAnimateState('initial');
          setCurrentDelay(0);
          scheduleNextShine(loopDelay);
        } else {
          setAnimateState('initial');
        }
      } else {
        setAnimateState('initial');
      }
      return;
    }

    if (enableOnTap) {
      setAnimateState('initial');
    }
  }, [
    animateState,
    isAlwaysOn,
    loop,
    enableOnHover,
    isHovered,
    enableOnTap,
    scheduleNextShine,
    loopDelay,
  ]);

  const overlayElement = (
    <motion.div
      animate={animateState}
      initial="initial"
      onAnimationComplete={handleAnimationComplete}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
        willChange: 'transform, opacity',
        background: `linear-gradient(to right, transparent, ${color}, transparent)`,
        opacity,
        ...style,
      }}
      transition={{
        duration: duration / 1000,
        ease: [0.4, 0, 0.2, 1],
        delay: currentDelay / 1000,
      }}
      variants={{
        initial: { x: '-100%', skewX: deg, transition: { duration: 0 } },
        shine: { x: '100%', skewX: deg },
      }}
    />
  );

  if (asChild) {
    if (!isValidElement(children)) {
      return null;
    }

    const child = children as ReactElement<Record<string, unknown>>;
    const childProps = (child.props ?? {}) as Record<string, unknown> & {
      className?: string;
      style?: CSSProperties;
      onMouseEnter?: (e: MouseEvent) => void;
      onMouseLeave?: (e: MouseEvent) => void;
      onPointerDown?: (e: PointerEvent) => void;
      children?: ReactNode;
    };

    const mergedClassName = [
      childProps.className,
      (props as { className?: string }).className,
    ]
      .filter(Boolean)
      .join(' ');
    const mergedStyle = {
      ...(childProps.style || {}),
      ...(style || {}),
      position: 'relative',
      overflow: 'hidden',
    } as CSSProperties;

    const mergedMouseEnter = (e: MouseEvent) => {
      if (typeof childProps.onMouseEnter === 'function') {
        childProps.onMouseEnter(e);
      }
      handleMouseEnter(e as MouseEvent<HTMLDivElement>);
    };
    const mergedMouseLeave = (e: MouseEvent) => {
      if (typeof childProps.onMouseLeave === 'function') {
        childProps.onMouseLeave(e);
      }
      handleMouseLeave(e as MouseEvent<HTMLDivElement>);
    };
    const mergedPointerDown = (e: PointerEvent) => {
      if (typeof childProps.onPointerDown === 'function') {
        childProps.onPointerDown(e);
      }
      handlePointerDown(e as PointerEvent<HTMLDivElement>);
    };

    const newChildren = (
      <>
        {childProps.children}
        {enable && overlayElement}
      </>
    );

    return cloneElement(child, {
      ...props,
      className: mergedClassName,
      style: mergedStyle,
      onMouseEnter: mergedMouseEnter,
      onMouseLeave: mergedMouseLeave,
      onPointerDown: mergedPointerDown,
      children: newChildren,
    });
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Shine effect wrapper with interactive handlers
    // biome-ignore lint/a11y/noNoninteractiveElementInteractions: Shine effect wrapper with interactive handlers
    <div
      style={{ position: 'relative', overflow: 'hidden', ...style }}
      {...props}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onPointerDown={handlePointerDown}
    >
      {children}
      {enable && overlayElement}
    </div>
  );
};

export { Shine, type ShineProps };
