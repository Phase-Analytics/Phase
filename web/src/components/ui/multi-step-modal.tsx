'use client';

import {
  Close as RadixDialogClose,
  Content as RadixDialogContent,
  Description as RadixDialogDescription,
  Overlay as RadixDialogOverlay,
  Portal as RadixDialogPortal,
  Root as RadixDialogRoot,
  Title as RadixDialogTitle,
  Trigger as RadixDialogTrigger,
} from '@radix-ui/react-dialog';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  type Variants,
} from 'motion/react';
import { useState } from 'react';

import useMeasure from 'react-use-measure';

import { cn } from '@/lib/utils';

export const MultiStepModal = RadixDialogRoot;
export const MultiStepModalTrigger = RadixDialogTrigger;
export const MultiStepModalClose = RadixDialogClose;

type MultiStepModalSteps = {
  title: string;
  description: string;
};

type MultiStepModalContentProps = React.CustomComponentPropsWithRef<
  typeof RadixDialogContent
> & {
  steps: MultiStepModalSteps[];
};

export function MultiStepModalContent({
  steps,
  ...props
}: MultiStepModalContentProps) {
  const TOTAL_STEPS = steps.length;
  const MIN_STEP = 0;

  const [activeContentIndex, setActiveContentIndex] = useState(MIN_STEP);
  const [direction, setDirection] = useState<number>(1);

  const [ref, { height: heightContent }] = useMeasure();

  const { title, description } = steps[activeContentIndex];

  function handleControlsNavigation(control: 'previous' | 'next') {
    const newDirection = control === 'next' ? 1 : -1;
    setDirection(newDirection);

    setActiveContentIndex((prev) => {
      const nextIndex = prev + newDirection;
      return Math.min(TOTAL_STEPS - 1, Math.max(MIN_STEP, nextIndex));
    });
  }

  const slideMotionVariants: Variants = {
    initial: (dir: number) => ({
      x: `${110 * dir}%`,
      opacity: 0,
      height: heightContent > 0 ? heightContent : 'auto',
    }),
    active: {
      x: '0%',
      opacity: 1,
      height: heightContent > 0 ? heightContent : 'auto',
    },
    exit: (dir: number) => ({
      x: `${-110 * dir}%`,
      opacity: 0,
    }),
  };

  return (
    <MotionConfig transition={{ type: 'spring', duration: 0.6, bounce: 0 }}>
      <RadixDialogPortal>
        <RadixDialogOverlay
          className={cn(
            'fixed inset-0 z-999 bg-black/80 ease-out',
            'motion-safe:data-[state=open]:fade-in motion-safe:data-[state=open]:animate-in',
            'motion-safe:data-[state=closed]:fade-out motion-safe:data-[state=closed]:animate-out'
          )}
        />
        <RadixDialogContent
          {...props}
          className={cn(
            'w-[calc(100vw---spacing(4))] max-w-96 overflow-hidden rounded-xl border border-border bg-main focus:outline-none',
            '-translate-x-1/2 fixed top-1/3 left-1/2 z-1001 motion-safe:ease-out',
            'motion-safe:data-[state=open]:fade-in motion-safe:data-[state=open]:animate-in',
            'motion-safe:data-[state=closed]:fade-out motion-safe:data-[state=closed]:animate-out'
          )}
        >
          <div className="px-4 pt-4 pb-3">
            <AnimatePresence
              custom={direction}
              initial={false}
              mode="popLayout"
            >
              <motion.div
                animate="active"
                custom={direction}
                exit="exit"
                initial="initial"
                key={activeContentIndex}
                variants={slideMotionVariants}
              >
                <div className="flex flex-col gap-2" ref={ref}>
                  <RadixDialogTitle className="font-medium text-base text-primary-foreground">
                    {title}
                  </RadixDialogTitle>
                  <RadixDialogDescription className="font-normal text-primary-muted text-sm/5.5">
                    {description}
                  </RadixDialogDescription>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <footer
            className={cn(
              'mt-2 flex items-center justify-between border-border border-t px-4 py-2',
              'bg-main-muted *:rounded-full *:border *:border-border *:bg-main-secondary *:text-primary',
              '*:h-8 *:w-24 *:px-3 *:font-medium *:text-[13px]/5.5',
              '*:disabled:cursor-not-allowed *:disabled:opacity-50'
            )}
          >
            <button
              disabled={activeContentIndex === MIN_STEP}
              onClick={() => handleControlsNavigation('previous')}
              type="button"
            >
              Back
            </button>
            <button
              disabled={activeContentIndex === TOTAL_STEPS - 1}
              onClick={() => handleControlsNavigation('next')}
              type="button"
            >
              Continue
            </button>
          </footer>
        </RadixDialogContent>
      </RadixDialogPortal>
    </MotionConfig>
  );
}
