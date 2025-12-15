'use client';

import {
  type HTMLMotionProps,
  motion,
  type TargetAndTransition,
  type VariantLabels,
} from 'motion/react';
import { Switch as SwitchPrimitives } from 'radix-ui';
import { useMemo, useState } from 'react';
import { getStrictContext } from '@/hooks/get-strict-context';
import { useControlledState } from '@/hooks/use-controlled-state';

type SwitchContextType = {
  isChecked: boolean;
  setIsChecked: (isChecked: boolean) => void;
  isPressed: boolean;
  setIsPressed: (isPressed: boolean) => void;
};

const [SwitchProvider, useSwitch] =
  getStrictContext<SwitchContextType>('SwitchContext');

type SwitchProps = Omit<
  React.ComponentProps<typeof SwitchPrimitives.Root>,
  'asChild'
> &
  HTMLMotionProps<'button'>;

function Switch(props: SwitchProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isChecked, setIsChecked] = useControlledState({
    value: props.checked,
    defaultValue: props.defaultChecked,
    onChange: props.onCheckedChange,
  });

  const {
    onCheckedChange: _onCheckedChange,
    checked,
    defaultChecked,
    ...motionProps
  } = props;

  return (
    <SwitchProvider
      value={{ isChecked, setIsChecked, isPressed, setIsPressed }}
    >
      <SwitchPrimitives.Root
        asChild
        checked={checked}
        defaultChecked={defaultChecked}
        onCheckedChange={setIsChecked}
      >
        <motion.button
          data-slot="switch"
          initial={false}
          onTap={() => setIsPressed(false)}
          onTapCancel={() => setIsPressed(false)}
          onTapStart={() => setIsPressed(true)}
          whileTap="tap"
          {...motionProps}
        />
      </SwitchPrimitives.Root>
    </SwitchProvider>
  );
}

type SwitchThumbProps = Omit<
  React.ComponentProps<typeof SwitchPrimitives.Thumb>,
  'asChild'
> &
  HTMLMotionProps<'div'> & {
    pressedAnimation?: TargetAndTransition | VariantLabels | boolean;
  };

function SwitchThumb({
  pressedAnimation,
  transition = { type: 'spring', stiffness: 300, damping: 25 },
  ...props
}: SwitchThumbProps) {
  const { isPressed } = useSwitch();

  return (
    <SwitchPrimitives.Thumb asChild>
      <motion.div
        animate={isPressed ? pressedAnimation : undefined}
        data-slot="switch-thumb"
        layout
        transition={transition}
        whileTap="tab"
        {...props}
      />
    </SwitchPrimitives.Thumb>
  );
}

type SwitchIconPosition = 'left' | 'right' | 'thumb';

type SwitchIconProps = HTMLMotionProps<'div'> & {
  position: SwitchIconPosition;
};

function SwitchIcon({
  position,
  transition = { type: 'spring', bounce: 0 },
  ...props
}: SwitchIconProps) {
  const { isChecked } = useSwitch();

  const isAnimated = useMemo(() => {
    if (position === 'right') {
      return !isChecked;
    }
    if (position === 'left') {
      return isChecked;
    }
    if (position === 'thumb') {
      return true;
    }
    return false;
  }, [position, isChecked]);

  return (
    <motion.div
      animate={isAnimated ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
      data-slot={`switch-${position}-icon`}
      transition={transition}
      {...props}
    />
  );
}

export {
  Switch,
  SwitchThumb,
  SwitchIcon,
  useSwitch,
  type SwitchProps,
  type SwitchThumbProps,
  type SwitchIconProps,
  type SwitchIconPosition,
  type SwitchContextType,
};
