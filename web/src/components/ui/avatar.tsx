import { Fallback, Image, Root } from '@radix-ui/react-avatar';

import { cn } from '@/lib/utils';

type AvatarProps = {
  hasBorder?: boolean;
} & React.ComponentProps<typeof Root>;

export function Avatar({ className, hasBorder, ...props }: AvatarProps) {
  return (
    <Root
      className={cn(
        'group inline-flex size-10 overflow-hidden rounded-full outline-2 outline-transparent',
        hasBorder && 'data-[has-border=true]:outline-border',
        className
      )}
      data-has-border={hasBorder}
      data-slot="avatar"
      {...props}
    />
  );
}

type AvatarImageProps = React.ComponentProps<typeof Image>;

export function AvatarImage({ className, ...props }: AvatarImageProps) {
  return (
    <Image
      className={cn('size-full object-cover', className)}
      data-slot="avatar-image"
      {...props}
    />
  );
}

type AvatarFallbackProps = React.ComponentProps<typeof Fallback>;

export function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return (
    <Fallback
      className={cn(
        'pointer flex size-full select-none items-center justify-center bg-main-foreground text-primary-muted',
        'group-data-[has-border=true]:bg-main-background',
        className
      )}
      data-slot="avatar-fallback"
      {...props}
    />
  );
}
