'use client';

import { type HTMLMotionProps, motion } from 'motion/react';

import {
  Slot,
  type WithAsChild,
} from '@/components/ui/primitives/animate/slot';

type ButtonProps = WithAsChild<
  HTMLMotionProps<'button'> & {
    hoverScale?: number;
    tapScale?: number;
  }
>;

function Button({
  hoverScale = 1.05,
  tapScale = 0.95,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : motion.button;

  return (
    <Component
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: tapScale }}
      {...props}
    />
  );
}

export { Button, type ButtonProps };
