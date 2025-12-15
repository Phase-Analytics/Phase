'use client';

import {
  Fallback as AvatarFallbackPrimitive,
  Image as AvatarImagePrimitive,
  Root as AvatarRootPrimitive,
} from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarRootPrimitive>) {
  return (
    <AvatarRootPrimitive
      className={cn(
        'relative flex size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-border',
        className
      )}
      data-slot="avatar"
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarImagePrimitive>) {
  return (
    <AvatarImagePrimitive
      className={cn('aspect-square size-full', className)}
      data-slot="avatar-image"
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarFallbackPrimitive>) {
  return (
    <AvatarFallbackPrimitive
      className={cn(
        'flex size-full items-center justify-center rounded-full bg-muted',
        className
      )}
      data-slot="avatar-fallback"
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
