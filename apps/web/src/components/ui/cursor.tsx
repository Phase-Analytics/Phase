import {
  CursorContainer as CursorContainerPrimitive,
  type CursorContainerProps as CursorContainerPropsPrimitive,
  CursorFollow as CursorFollowPrimitive,
  type CursorFollowProps as CursorFollowPropsPrimitive,
  Cursor as CursorPrimitive,
  type CursorProps as CursorPropsPrimitive,
  CursorProvider as CursorProviderPrimitive,
  type CursorProviderProps as CursorProviderPropsPrimitive,
} from '@/components/ui/primitives/animate/cursor';
import { cn } from '@/lib/utils';

type CursorProviderProps = Omit<CursorProviderPropsPrimitive, 'children'> &
  CursorContainerPropsPrimitive;

function CursorProvider({ global, ...props }: CursorProviderProps) {
  return (
    <CursorProviderPrimitive global={global}>
      <CursorContainerPrimitive {...props} />
    </CursorProviderPrimitive>
  );
}

type CursorProps = Omit<CursorPropsPrimitive, 'children' | 'asChild'>;

function Cursor({ className, ...props }: CursorProps) {
  return (
    <CursorPrimitive asChild {...props}>
      <svg
        aria-label="Cursor"
        className={cn('size-6 text-foreground', className)}
        role="img"
        viewBox="0 0 40 40"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M1.8 4.4 7 36.2c.3 1.8 2.6 2.3 3.6.8l3.9-5.7c1.7-2.5 4.5-4.1 7.5-4.3l6.9-.5c1.8-.1 2.5-2.4 1.1-3.5L5 2.5c-1.4-1.1-3.5 0-3.3 1.9Z"
          fill="currentColor"
        />
      </svg>
    </CursorPrimitive>
  );
}

type CursorFollowProps = Omit<CursorFollowPropsPrimitive, 'asChild'>;

function CursorFollow({
  className,
  children,
  sideOffset = 15,
  alignOffset = 5,
  ...props
}: CursorFollowProps) {
  return (
    <CursorFollowPrimitive
      alignOffset={alignOffset}
      asChild
      sideOffset={sideOffset}
      {...props}
    >
      <div
        className={cn(
          'rounded-md bg-foreground px-2 py-1 text-background text-sm',
          className
        )}
      >
        {children}
      </div>
    </CursorFollowPrimitive>
  );
}

export {
  CursorProvider,
  Cursor,
  CursorFollow,
  type CursorProviderProps,
  type CursorProps,
  type CursorFollowProps,
};
