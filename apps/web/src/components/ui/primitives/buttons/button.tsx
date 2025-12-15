'use client';

import { type HTMLMotionProps, motion } from 'motion/react';
import { useEffect, useState } from 'react';

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
  tapScale = 0.98,
  asChild = false,
  ...props
}: ButtonProps) {
  const [isClient, setIsClient] = useState(false);
  const Component = asChild ? Slot : motion.button;

  useEffect(() => {
    setIsClient(true);
  }, []);

  const motionProps = isClient
    ? {
        whileHover: { scale: hoverScale, transition: { duration: 0.1 } },
        whileTap: { scale: tapScale, transition: { duration: 0.1 } },
      }
    : {};

  return <Component {...motionProps} {...props} />;
}

export { Button, type ButtonProps };
