import { type HTMLMotionProps, motion } from 'motion/react';
import type { ReactNode, Ref } from 'react';

type BlurProps = {
  children?: ReactNode;
  delay?: number;
  initialBlur?: number;
  blur?: number;
  inView?: boolean;
  asChild?: boolean;
  ref?: Ref<HTMLElement>;
} & HTMLMotionProps<'div'>;

function Blur({
  ref,
  transition = { type: 'spring', stiffness: 200, damping: 20 },
  delay = 0,
  initialBlur = 10,
  blur = 0,
  inView = true,
  ...props
}: BlurProps) {
  return (
    <motion.div
      animate={inView ? 'visible' : 'hidden'}
      exit="hidden"
      initial="hidden"
      ref={ref as Ref<HTMLDivElement>}
      transition={{
        ...transition,
        delay: (transition?.delay ?? 0) + delay / 1000,
      }}
      variants={{
        hidden: { filter: `blur(${initialBlur}px)` },
        visible: { filter: `blur(${blur}px)` },
      }}
      {...props}
    />
  );
}

export { Blur, type BlurProps };
