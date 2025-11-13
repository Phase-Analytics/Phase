import {
  TabsContent as TabsContentPrimitive,
  type TabsContentProps as TabsContentPrimitiveProps,
  TabsContents as TabsContentsPrimitive,
  type TabsContentsProps as TabsContentsPrimitiveProps,
  TabsHighlightItem as TabsHighlightItemPrimitive,
  TabsHighlight as TabsHighlightPrimitive,
  TabsList as TabsListPrimitive,
  type TabsListProps as TabsListPrimitiveProps,
  Tabs as TabsPrimitive,
  type TabsProps as TabsPrimitiveProps,
  TabsTrigger as TabsTriggerPrimitive,
  type TabsTriggerProps as TabsTriggerPrimitiveProps,
} from '@/components/ui/primitives/radix/tabs';
import { cn } from '@/lib/utils';

type TabsProps = TabsPrimitiveProps;

function Tabs({ className, ...props }: TabsProps) {
  return (
    <TabsPrimitive
      className={cn('flex flex-col gap-2', className)}
      {...props}
    />
  );
}

type TabsListProps = TabsListPrimitiveProps;

function TabsList({ className, ...props }: TabsListProps) {
  return (
    <TabsHighlightPrimitive className="absolute inset-0 z-0 rounded-md border border-transparent bg-background shadow-sm dark:border-input dark:bg-input/30">
      <TabsListPrimitive
        className={cn(
          'inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground',
          className
        )}
        {...props}
      />
    </TabsHighlightPrimitive>
  );
}

type TabsTriggerProps = TabsTriggerPrimitiveProps;

function TabsTrigger({ className, ...props }: TabsTriggerProps) {
  return (
    <TabsHighlightItemPrimitive className="flex-1" value={props.value}>
      <TabsTriggerPrimitive
        className={cn(
          "inline-flex h-[calc(100%-1px)] w-full flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 font-medium text-muted-foreground text-sm transition-colors duration-500 ease-in-out focus-visible:border-ring focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
          className
        )}
        {...props}
      />
    </TabsHighlightItemPrimitive>
  );
}

type TabsContentsProps = TabsContentsPrimitiveProps;

function TabsContents(props: TabsContentsProps) {
  return <TabsContentsPrimitive {...props} />;
}

type TabsContentProps = TabsContentPrimitiveProps;

function TabsContent({ className, ...props }: TabsContentProps) {
  return (
    <TabsContentPrimitive
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  );
}

export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContents,
  TabsContent,
  type TabsProps,
  type TabsListProps,
  type TabsTriggerProps,
  type TabsContentsProps,
  type TabsContentProps,
};
