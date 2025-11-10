import {
  Content,
  Header,
  Item,
  Root,
  Trigger,
} from '@radix-ui/react-accordion';

import { cn } from '@/utils/cn';

export const Accordion = Root;

type AccordionItemProps = React.ComponentProps<typeof Item>;

export function AccordionItem({
  children,
  value,
  className,
  ...props
}: AccordionItemProps) {
  return (
    <Item
      className={cn(
        'mt-px w-full overflow-hidden border-border border-b last:border-none focus-within:relative focus-within:z-10',
        className
      )}
      value={value}
      {...props}
    >
      {children}
    </Item>
  );
}

type AccordionTriggerProps = React.ComponentProps<typeof Trigger>;

export function AccordionTrigger({
  children,
  className,
  ...props
}: AccordionTriggerProps) {
  return (
    <Header className="flex">
      <Trigger
        className={cn(
          'group flex h-11 w-full items-center justify-between px-3.5 text-base/none text-primary outline-none',
          'motion-safe:ease-out [&[data-state=open]>svg]:rotate-45',
          className
        )}
        {...props}
      >
        {children}
        <svg
          className="text-neutral-500 transition-transform duration-300"
          fill="none"
          height="18"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width="18"
        >
          <title>Trigger</title>
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      </Trigger>
    </Header>
  );
}

type AccordionContentProps = React.ComponentProps<typeof Content>;

export function AccordionContent({
  children,
  className,
  ...props
}: AccordionContentProps) {
  return (
    <Content
      className={cn(
        'transition-transform motion-safe:data-[state=closed]:animate-accordion-close motion-safe:data-[state=open]:animate-accordion-open',
        className
      )}
      {...props}
    >
      <div className="px-3.5 pb-3 text-primary-muted">{children}</div>
    </Content>
  );
}
