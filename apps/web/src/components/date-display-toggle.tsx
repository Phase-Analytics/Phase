'use client';

import { Calendar03Icon, Time03Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  type DateDisplayMode,
  useDateDisplayStore,
} from '@/stores/date-display-store';

const MODES: Array<{
  value: DateDisplayMode;
  label: string;
  icon: typeof Calendar03Icon;
}> = [
  { value: 'absolute', label: 'Exact', icon: Calendar03Icon },
  { value: 'relative', label: 'Relative', icon: Time03Icon },
];

export function DateDisplayToggle({ className }: { className?: string }) {
  const mode = useDateDisplayStore((s) => s.mode);
  const setMode = useDateDisplayStore((s) => s.setMode);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            'inline-flex items-center rounded-md border border-input bg-transparent p-0.5 shadow-xs',
            className
          )}
        >
          {MODES.map((item) => {
            const active = mode === item.value;
            return (
              <Button
                aria-pressed={active}
                className={cn(
                  'h-7 gap-1.5 px-2 text-xs',
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                key={item.value}
                onClick={() => setMode(item.value)}
                size="sm"
                type="button"
                variant="ghost"
              >
                <HugeiconsIcon className="size-3.5" icon={item.icon} />
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            );
          })}
        </div>
      </TooltipTrigger>
      <TooltipContent>Date display</TooltipContent>
    </Tooltip>
  );
}
