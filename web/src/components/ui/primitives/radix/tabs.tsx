'use client';

import {
  AnimatePresence,
  type HTMLMotionProps,
  motion,
  type Transition,
} from 'motion/react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import type * as React from 'react';
import {
  AutoHeight,
  type AutoHeightProps,
} from '@/components/ui/primitives/effects/auto-height';
import {
  Highlight,
  HighlightItem,
  type HighlightItemProps,
  type HighlightProps,
} from '@/components/ui/primitives/effects/highlight';
import { getStrictContext } from '@/hooks/get-strict-context';
import { useControlledState } from '@/hooks/use-controlled-state';

type TabsContextType = {
  value: string | undefined;
  setValue: TabsProps['onValueChange'];
};

const [TabsProvider, useTabs] =
  getStrictContext<TabsContextType>('TabsContext');

type TabsProps = React.ComponentProps<typeof TabsPrimitive.Root>;

function Tabs(props: TabsProps) {
  const [value, setValue] = useControlledState({
    value: props.value,
    defaultValue: props.defaultValue,
    onChange: props.onValueChange,
  });

  return (
    <TabsProvider value={{ value, setValue }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        suppressHydrationWarning
        {...props}
        onValueChange={setValue}
      />
    </TabsProvider>
  );
}

type TabsHighlightProps = Omit<HighlightProps, 'controlledItems' | 'value'>;

function TabsHighlight({
  transition = { type: 'spring', stiffness: 200, damping: 25 },
  ...props
}: TabsHighlightProps) {
  const { value } = useTabs();

  return (
    <Highlight
      click={false}
      controlledItems
      data-slot="tabs-highlight"
      transition={transition}
      value={value}
      {...props}
    />
  );
}

type TabsListProps = React.ComponentProps<typeof TabsPrimitive.List>;

function TabsList(props: TabsListProps) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      suppressHydrationWarning
      {...props}
    />
  );
}

type TabsHighlightItemProps = HighlightItemProps & {
  value: string;
};

function TabsHighlightItem(props: TabsHighlightItemProps) {
  return <HighlightItem data-slot="tabs-highlight-item" {...props} />;
}

type TabsTriggerProps = React.ComponentProps<typeof TabsPrimitive.Trigger>;

function TabsTrigger(props: TabsTriggerProps) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      suppressHydrationWarning
      {...props}
    />
  );
}

type TabsContentProps = React.ComponentProps<typeof TabsPrimitive.Content> &
  HTMLMotionProps<'div'>;

function TabsContent({
  value,
  forceMount,
  transition = { duration: 0.5, ease: 'easeInOut' },
  ...props
}: TabsContentProps) {
  return (
    <AnimatePresence mode="wait">
      <TabsPrimitive.Content asChild forceMount={forceMount} value={value}>
        <motion.div
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          data-slot="tabs-content"
          exit={{ opacity: 0, filter: 'blur(4px)' }}
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          layout
          layoutDependency={value}
          transition={transition}
          {...props}
        />
      </TabsPrimitive.Content>
    </AnimatePresence>
  );
}

type TabsContentsAutoProps = AutoHeightProps & {
  mode?: 'auto-height';
  children: React.ReactNode;
  transition?: Transition;
};

type TabsContentsLayoutProps = Omit<HTMLMotionProps<'div'>, 'transition'> & {
  mode: 'layout';
  children: React.ReactNode;
  transition?: Transition;
};

type TabsContentsProps = TabsContentsAutoProps | TabsContentsLayoutProps;

const defaultTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
};

function isAutoMode(props: TabsContentsProps): props is TabsContentsAutoProps {
  return !('mode' in props) || props.mode === 'auto-height';
}

function TabsContents(props: TabsContentsProps) {
  const { value } = useTabs();

  if (isAutoMode(props)) {
    const { transition: autoTransition = defaultTransition, ...autoProps } =
      props;

    return (
      <AutoHeight
        data-slot="tabs-contents"
        deps={[value]}
        transition={autoTransition}
        {...autoProps}
      />
    );
  }

  const {
    transition: layoutTransition = defaultTransition,
    style,
    ...layoutProps
  } = props;

  return (
    <motion.div
      data-slot="tabs-contents"
      layout="size"
      layoutDependency={value}
      style={{ overflow: 'hidden', ...style }}
      transition={{ layout: layoutTransition }}
      {...layoutProps}
    />
  );
}

export {
  Tabs,
  TabsHighlight,
  TabsHighlightItem,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabsContents,
  type TabsProps,
  type TabsHighlightProps,
  type TabsHighlightItemProps,
  type TabsListProps,
  type TabsTriggerProps,
  type TabsContentProps,
  type TabsContentsProps,
};
