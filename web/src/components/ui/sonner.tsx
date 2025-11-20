'use client';

import {
  Alert01Icon,
  CancelSquareIcon,
  CheckmarkSquare01Icon,
  InformationSquareIcon,
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
          <HugeiconsIcon className="size-4" icon={CheckmarkSquare01Icon} />
        ),
        info: <HugeiconsIcon className="size-4" icon={InformationSquareIcon} />,
        warning: <HugeiconsIcon className="size-4" icon={Alert01Icon} />,
        error: <HugeiconsIcon className="size-4" icon={CancelSquareIcon} />,
        loading: <Spinner className="size-4" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      theme={theme as ToasterProps['theme']}
      {...props}
    />
  );
};

export { Toaster };
