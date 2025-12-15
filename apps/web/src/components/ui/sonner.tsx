'use client';

import {
  Alert01Icon,
  AlertDiamondIcon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { Spinner } from '@/components/ui/spinner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      className="toaster group"
      icons={{
        success: (
          <HugeiconsIcon className="size-4" icon={CheckmarkCircle02Icon} />
        ),
        info: <HugeiconsIcon className="size-4" icon={InformationCircleIcon} />,
        warning: <HugeiconsIcon className="size-4" icon={Alert01Icon} />,
        error: <HugeiconsIcon className="size-4" icon={AlertDiamondIcon} />,
        loading: <Spinner className="size-4" />,
      }}
      theme={theme as ToasterProps['theme']}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'group relative w-full rounded-lg border border-border bg-card p-4 pr-10 shadow-[var(--shadow-elevated)] font-mono flex items-center gap-3',
          title: 'text-sm font-medium text-card-foreground leading-none',
          description: 'text-sm text-muted-foreground mt-1',
          actionButton:
            'bg-primary text-primary-foreground text-xs font-medium px-3 py-1.5 rounded-md hover:bg-primary/90 transition-colors',
          cancelButton:
            'bg-secondary text-secondary-foreground text-xs font-medium px-3 py-1.5 rounded-md hover:bg-secondary/80 transition-colors',
          closeButton:
            'absolute right-3 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 [&_svg]:size-3.5',
          success:
            'border-success/30 bg-success text-white shadow-[var(--shadow),var(--highlight)] [&>[data-icon]]:text-white [&_[data-title]]:text-white [&_[data-description]]:text-white/80 [&_[data-close-button]]:text-white/70 [&_[data-close-button]:hover]:text-white [&_[data-close-button]:hover]:bg-white/20',
          error:
            'border-destructive/30 bg-destructive text-white shadow-[var(--shadow),var(--highlight)] dark:bg-destructive/80 [&>[data-icon]]:text-white [&_[data-title]]:text-white [&_[data-description]]:text-white/80 [&_[data-close-button]]:text-white/70 [&_[data-close-button]:hover]:text-white [&_[data-close-button]:hover]:bg-white/20',
          warning:
            'border-amber-500/30 bg-amber-500 text-white shadow-[var(--shadow),var(--highlight)] [&>[data-icon]]:text-white [&_[data-title]]:text-white [&_[data-description]]:text-white/80 [&_[data-close-button]]:text-white/70 [&_[data-close-button]:hover]:text-white [&_[data-close-button]:hover]:bg-white/20',
          info: 'border-blue-500/30 bg-blue-500 text-white shadow-[var(--shadow),var(--highlight)] [&>[data-icon]]:text-white [&_[data-title]]:text-white [&_[data-description]]:text-white/80 [&_[data-close-button]]:text-white/70 [&_[data-close-button]:hover]:text-white [&_[data-close-button]:hover]:bg-white/20',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
