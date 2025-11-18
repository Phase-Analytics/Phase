'use client';

import type { ComponentProps } from 'react';
import { DotLoader } from '@/components/ui/dot-flow';
import { cn } from '@/lib/utils';

const FLOW_FRAMES = [
  [24],
  [24, 17, 23, 25, 31],
  [24, 17, 23, 25, 31, 16, 18, 30, 32],
  [16, 17, 18, 23, 24, 25, 30, 31, 32, 10, 12, 22, 26, 36, 38],
  [
    8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30, 31, 32,
    33, 36, 37, 38, 39, 40,
  ],
  [
    8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30, 31, 32,
    33, 36, 37, 38, 39, 40, 2, 4, 20, 28, 44, 46,
  ],
  [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
    40, 41, 42, 43, 44, 45, 46, 47, 48,
  ],

  [
    0, 1, 2, 3, 4, 5, 6, 7, 13, 14, 20, 21, 27, 28, 34, 35, 41, 42, 43, 44, 45,
    46, 47, 48, 16, 17, 18, 23, 25, 30, 31, 32, 24,
  ],
  [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
    40, 41, 42, 43, 44, 45, 46, 47, 48,
  ],

  [
    8, 9, 10, 11, 12, 15, 16, 17, 18, 19, 22, 23, 24, 25, 26, 29, 30, 31, 32,
    33, 36, 37, 38, 39, 40,
  ],
  [16, 17, 18, 23, 24, 25, 30, 31, 32, 10, 12, 36, 38],
  [16, 17, 18, 23, 24, 25, 30, 31, 32],
  [24, 17, 23, 25, 31],
  [24],
];

type LoadingProps = {
  dotClassName?: string;
  activeDotClassName?: string;
} & Omit<ComponentProps<'div'>, 'children'>;

export const Loading = ({
  dotClassName,
  activeDotClassName,
  className,
  ...props
}: LoadingProps) => (
  <DotLoader
    {...props}
    className={cn('gap-1', className)}
    dotClassName={cn(
      'h-1.5 w-1.5 rounded-sm bg-muted transition-colors duration-150',
      '[&.active]:bg-primary',
      dotClassName,
      activeDotClassName && `[&.active]:${activeDotClassName}`
    )}
    duration={135}
    frames={FLOW_FRAMES}
  />
);
