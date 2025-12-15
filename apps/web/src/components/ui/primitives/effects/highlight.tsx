'use client';

import { motion, type Transition } from 'motion/react';
import {
  Children,
  type ComponentProps,
  type CSSProperties,
  cloneElement,
  createContext,
  type ElementType,
  isValidElement,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { cn } from '@/lib/utils';

type HighlightMode = 'children' | 'parent';

type Bounds = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type HighlightContextType<T extends string> = {
  as?: keyof HTMLElementTagNameMap;
  mode: HighlightMode;
  activeValue: T | null;
  setActiveValue: (value: T | null) => void;
  setBounds: (bounds: DOMRect) => void;
  clearBounds: () => void;
  id: string;
  hover: boolean;
  click: boolean;
  className?: string;
  style?: CSSProperties;
  activeClassName?: string;
  setActiveClassName: (className: string) => void;
  transition?: Transition;
  disabled?: boolean;
  enabled?: boolean;
  exitDelay?: number;
  forceUpdateBounds?: boolean;
};

const HighlightContext = createContext<
  // biome-ignore lint/suspicious/noExplicitAny: <>
  HighlightContextType<any> | undefined
>(undefined);

function useHighlight<T extends string>(): HighlightContextType<T> {
  const context = useContext(HighlightContext);
  if (!context) {
    throw new Error('useHighlight must be used within a HighlightProvider');
  }
  return context as unknown as HighlightContextType<T>;
}

type BaseHighlightProps<T extends ElementType = 'div'> = {
  as?: T;
  ref?: Ref<HTMLDivElement>;
  mode?: HighlightMode;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  className?: string;
  style?: CSSProperties;
  transition?: Transition;
  hover?: boolean;
  click?: boolean;
  disabled?: boolean;
  enabled?: boolean;
  exitDelay?: number;
};

type ParentModeHighlightProps = {
  boundsOffset?: Partial<Bounds>;
  containerClassName?: string;
  forceUpdateBounds?: boolean;
};

type ControlledParentModeHighlightProps<T extends ElementType = 'div'> =
  BaseHighlightProps<T> &
    ParentModeHighlightProps & {
      mode: 'parent';
      controlledItems: true;
      children: ReactNode;
    };

type ControlledChildrenModeHighlightProps<T extends ElementType = 'div'> =
  BaseHighlightProps<T> & {
    mode?: 'children' | undefined;
    controlledItems: true;
    children: ReactNode;
  };

type UncontrolledParentModeHighlightProps<T extends ElementType = 'div'> =
  BaseHighlightProps<T> &
    ParentModeHighlightProps & {
      mode: 'parent';
      controlledItems?: false;
      itemsClassName?: string;
      children: ReactElement | ReactElement[];
    };

type UncontrolledChildrenModeHighlightProps<T extends ElementType = 'div'> =
  BaseHighlightProps<T> & {
    mode?: 'children';
    controlledItems?: false;
    itemsClassName?: string;
    children: ReactElement | ReactElement[];
  };

type HighlightProps<T extends ElementType = 'div'> =
  | ControlledParentModeHighlightProps<T>
  | ControlledChildrenModeHighlightProps<T>
  | UncontrolledParentModeHighlightProps<T>
  | UncontrolledChildrenModeHighlightProps<T>;

function Highlight<T extends ElementType = 'div'>({
  ref,
  ...props
}: HighlightProps<T>) {
  const {
    as: Component = 'div',
    children,
    value,
    defaultValue,
    onValueChange,
    className,
    style,
    transition = { type: 'spring', stiffness: 500, damping: 25 },
    hover = false,
    click = true,
    enabled = true,
    controlledItems,
    disabled = false,
    exitDelay = 200,
    mode = 'children',
  } = props;

  const localRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

  const [activeValue, setActiveValue] = useState<string | null>(
    value ?? defaultValue ?? null
  );
  const [boundsState, setBoundsState] = useState<Bounds | null>(null);
  const [activeClassNameState, setActiveClassNameState] = useState<string>('');
  const [hasInitialized, setHasInitialized] = useState(false);

  const boundsOffset = (props as ParentModeHighlightProps)?.boundsOffset;

  const safeSetActiveValue = useCallback(
    (newId: string | null) => {
      setActiveValue((prev) => (prev === newId ? prev : newId));
      if (newId !== activeValue) {
        onValueChange?.(newId);
      }
    },
    [activeValue, onValueChange]
  );

  const safeSetBounds = useCallback(
    (bounds: DOMRect) => {
      if (!localRef.current) {
        return;
      }

      const offset = boundsOffset ?? {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
      };

      const containerRect = localRef.current.getBoundingClientRect();
      const newBounds: Bounds = {
        top: bounds.top - containerRect.top + (offset.top ?? 0),
        left: bounds.left - containerRect.left + (offset.left ?? 0),
        width: bounds.width + (offset.width ?? 0),
        height: bounds.height + (offset.height ?? 0),
      };

      setBoundsState((prev) => {
        if (
          prev &&
          prev.top === newBounds.top &&
          prev.left === newBounds.left &&
          prev.width === newBounds.width &&
          prev.height === newBounds.height
        ) {
          return prev;
        }
        return newBounds;
      });

      if (!hasInitialized) {
        setHasInitialized(true);
      }
    },
    [boundsOffset, hasInitialized]
  );

  const clearBounds = useCallback(() => {
    setBoundsState((prev) => (prev === null ? prev : null));
  }, []);

  useEffect(() => {
    if (value !== undefined) {
      setActiveValue(value);
    } else if (defaultValue !== undefined) {
      setActiveValue(defaultValue);
    }
  }, [value, defaultValue]);

  const id = useId();

  useEffect(() => {
    if (mode !== 'parent') {
      return;
    }
    const container = localRef.current;
    if (!container) {
      return;
    }

    const onScroll = () => {
      if (!activeValue) {
        return;
      }
      const activeEl = container.querySelector<HTMLElement>(
        `[data-value="${activeValue}"][data-highlight="true"]`
      );
      if (activeEl) {
        safeSetBounds(activeEl.getBoundingClientRect());
      }
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [mode, activeValue, safeSetBounds]);

  const containerClassName = (props as ParentModeHighlightProps)
    ?.containerClassName;

  const render = useCallback(
    (renderChildren: ReactNode) => {
      if (mode === 'parent') {
        const Comp = Component as 'div';
        return (
          <Comp
            className={containerClassName}
            data-slot="motion-highlight-container"
            ref={localRef}
            style={{ position: 'relative', zIndex: 1 }}
          >
            {boundsState && (
              <motion.div
                animate={{
                  top: boundsState.top,
                  left: boundsState.left,
                  width: boundsState.width,
                  height: boundsState.height,
                  opacity: 1,
                }}
                className={cn(className, activeClassNameState)}
                data-slot="motion-highlight"
                exit={{
                  opacity: 0,
                  transition: {
                    ...transition,
                    delay: (transition?.delay ?? 0) + (exitDelay ?? 0) / 1000,
                  },
                }}
                initial={
                  hasInitialized
                    ? false
                    : {
                        top: boundsState.top,
                        left: boundsState.left,
                        width: boundsState.width,
                        height: boundsState.height,
                        opacity: 0,
                      }
                }
                layout
                style={{
                  position: 'absolute',
                  zIndex: 0,
                  ...style,
                }}
                transition={transition}
              />
            )}
            {renderChildren}
          </Comp>
        );
      }

      return renderChildren;
    },
    [
      mode,
      Component,
      containerClassName,
      boundsState,
      transition,
      exitDelay,
      style,
      className,
      activeClassNameState,
      hasInitialized,
    ]
  );

  return (
    <HighlightContext.Provider
      value={{
        mode,
        activeValue,
        setActiveValue: safeSetActiveValue,
        id,
        hover,
        click,
        className,
        style,
        transition,
        disabled,
        enabled,
        exitDelay,
        setBounds: safeSetBounds,
        clearBounds,
        activeClassName: activeClassNameState,
        setActiveClassName: setActiveClassNameState,
        forceUpdateBounds: (props as ParentModeHighlightProps)
          ?.forceUpdateBounds,
      }}
    >
      {!enabled && children}
      {enabled && controlledItems && render(children)}
      {enabled &&
        !controlledItems &&
        render(
          Children.map(children, (child) => {
            const childElement = child as ReactElement;

            let key: string | undefined;
            if (
              isValidElement(childElement) &&
              typeof childElement.props === 'object' &&
              childElement.props !== null &&
              'id' in childElement.props
            ) {
              key = (childElement.props as { id: string }).id;
            } else if (
              isValidElement(childElement) &&
              typeof childElement.props === 'object' &&
              childElement.props !== null &&
              'data-value' in childElement.props
            ) {
              key = (childElement.props as { 'data-value': string })[
                'data-value'
              ];
            }
            return (
              <HighlightItem className={props?.itemsClassName} key={key}>
                {child}
              </HighlightItem>
            );
          })
        )}
    </HighlightContext.Provider>
  );
}

function getNonOverridingDataAttributes(
  element: ReactElement,
  dataAttributes: Record<string, unknown>
): Record<string, unknown> {
  return Object.keys(dataAttributes).reduce<Record<string, unknown>>(
    (acc, key) => {
      if ((element.props as Record<string, unknown>)[key] === undefined) {
        acc[key] = dataAttributes[key];
      }
      return acc;
    },
    {}
  );
}

type ExtendedChildProps = ComponentProps<'div'> & {
  id?: string;
  ref?: Ref<HTMLElement>;
  'data-active'?: string;
  'data-value'?: string;
  'data-disabled'?: boolean;
  'data-highlight'?: boolean;
  'data-slot'?: string;
};

type HighlightItemProps<T extends ElementType = 'div'> = ComponentProps<T> & {
  as?: T;
  children: ReactElement;
  id?: string;
  value?: string;
  className?: string;
  style?: CSSProperties;
  transition?: Transition;
  activeClassName?: string;
  disabled?: boolean;
  exitDelay?: number;
  asChild?: boolean;
  forceUpdateBounds?: boolean;
};

function HighlightItem<T extends ElementType>({
  ref,
  as,
  children,
  id,
  value,
  className,
  style,
  transition,
  disabled = false,
  activeClassName,
  exitDelay,
  asChild = false,
  forceUpdateBounds,
  ...props
}: HighlightItemProps<T>) {
  const itemId = useId();
  const {
    activeValue,
    setActiveValue,
    mode,
    setBounds,
    clearBounds,
    hover,
    click,
    enabled,
    className: contextClassName,
    style: contextStyle,
    transition: contextTransition,
    id: contextId,
    disabled: contextDisabled,
    forceUpdateBounds: contextForceUpdateBounds,
    setActiveClassName,
  } = useHighlight();

  const ComponentTag = (as ?? 'div') as 'div';
  const element = children as ReactElement<ExtendedChildProps>;
  const childValue =
    id ?? value ?? element.props?.['data-value'] ?? element.props?.id ?? itemId;
  const isActive = activeValue === childValue;
  const isDisabled = disabled === undefined ? contextDisabled : disabled;
  const itemTransition = transition ?? contextTransition;

  const localRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => localRef.current as HTMLDivElement);

  useEffect(() => {
    if (mode !== 'parent') {
      return;
    }
    let rafId: number;
    let previousBounds: Bounds | null = null;
    const shouldUpdateBounds =
      forceUpdateBounds === true ||
      (contextForceUpdateBounds && forceUpdateBounds !== false);

    const updateBounds = () => {
      if (!localRef.current) {
        return;
      }

      const bounds = localRef.current.getBoundingClientRect();

      if (shouldUpdateBounds) {
        if (
          previousBounds &&
          previousBounds.top === bounds.top &&
          previousBounds.left === bounds.left &&
          previousBounds.width === bounds.width &&
          previousBounds.height === bounds.height
        ) {
          rafId = requestAnimationFrame(updateBounds);
          return;
        }
        previousBounds = bounds;
        rafId = requestAnimationFrame(updateBounds);
      }

      setBounds(bounds);
    };

    if (isActive) {
      updateBounds();
      setActiveClassName(activeClassName ?? '');
    } else if (!activeValue) {
      clearBounds();
    }

    if (shouldUpdateBounds) {
      return () => cancelAnimationFrame(rafId);
    }
  }, [
    mode,
    isActive,
    activeValue,
    setBounds,
    clearBounds,
    activeClassName,
    setActiveClassName,
    forceUpdateBounds,
    contextForceUpdateBounds,
  ]);

  if (!isValidElement(children)) {
    return children;
  }

  const dataAttributes = {
    'data-active': isActive ? 'true' : 'false',
    'aria-selected': isActive,
    'data-disabled': isDisabled,
    'data-value': childValue,
    'data-highlight': true,
  };

  const getCommonHandlers = () => {
    if (hover) {
      return {
        onMouseEnter: (e: MouseEvent<HTMLDivElement>) => {
          setActiveValue(childValue);
          element.props.onMouseEnter?.(e);
        },
        onMouseLeave: (e: MouseEvent<HTMLDivElement>) => {
          setActiveValue(null);
          element.props.onMouseLeave?.(e);
        },
      };
    }
    if (click) {
      return {
        onClick: (e: MouseEvent<HTMLDivElement>) => {
          setActiveValue(childValue);
          element.props.onClick?.(e);
        },
      };
    }
    return {};
  };

  const commonHandlers = getCommonHandlers();

  if (asChild) {
    if (mode === 'children') {
      return cloneElement(
        element,
        {
          key: childValue,
          ref: localRef,
          className: cn('relative', element.props.className),
          ...getNonOverridingDataAttributes(element, {
            ...dataAttributes,
            'data-slot': 'motion-highlight-item-container',
          }),
          ...commonHandlers,
          ...props,
        },
        <>
          {isActive && !isDisabled && (
            <motion.div
              className={cn(contextClassName, activeClassName)}
              data-slot="motion-highlight"
              layoutId={`highlight-${contextId}`}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 0,
                ...contextStyle,
                ...style,
              }}
              transition={itemTransition}
              {...dataAttributes}
            />
          )}

          <ComponentTag
            className={className}
            data-slot="motion-highlight-item"
            style={{ position: 'relative', zIndex: 1 }}
            {...dataAttributes}
          >
            {children}
          </ComponentTag>
        </>
      );
    }

    return cloneElement(element, {
      ref: localRef,
      ...getNonOverridingDataAttributes(element, {
        ...dataAttributes,
        'data-slot': 'motion-highlight-item',
      }),
      ...commonHandlers,
    });
  }

  if (!enabled) {
    return children;
  }

  return (
    <ComponentTag
      className={cn(mode === 'children' && 'relative', className)}
      data-slot="motion-highlight-item-container"
      key={childValue}
      ref={localRef}
      {...dataAttributes}
      {...props}
      {...commonHandlers}
    >
      {mode === 'children' && isActive && !isDisabled && (
        <motion.div
          className={cn(contextClassName, activeClassName)}
          data-slot="motion-highlight"
          layoutId={`highlight-${contextId}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
            ...contextStyle,
            ...style,
          }}
          transition={itemTransition}
          {...dataAttributes}
        />
      )}

      {cloneElement(element, {
        style: { position: 'relative', zIndex: 1 },
        className: element.props.className,
        ...getNonOverridingDataAttributes(element, {
          ...dataAttributes,
          'data-slot': 'motion-highlight-item',
        }),
      })}
    </ComponentTag>
  );
}

export {
  Highlight,
  HighlightItem,
  useHighlight,
  type HighlightProps,
  type HighlightItemProps,
};
