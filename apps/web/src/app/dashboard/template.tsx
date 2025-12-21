'use client';

import { motion } from 'motion/react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const pageVariants = {
  initial: {
    opacity: 0,
    y: 12,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    y: -12,
    filter: 'blur(4px)',
  },
};

const pageTransition = {
  duration: 0.35,
  ease: [0.25, 0.1, 0.25, 1] as const,
};

export default function DashboardTemplate({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <motion.div
      animate="animate"
      className="flex h-full w-full flex-1 flex-col"
      exit="exit"
      initial="initial"
      key={pathname}
      transition={pageTransition}
      variants={pageVariants}
    >
      {children}
    </motion.div>
  );
}
