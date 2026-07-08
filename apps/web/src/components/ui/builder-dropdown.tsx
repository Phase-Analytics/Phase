'use client';

import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type BuilderDropdownOption = {
  value: string;
  label: string;
};

type BuilderDropdownProps = {
  value: string;
  options: BuilderDropdownOption[];
  onValueChange: (value: string) => void;
  className?: string;
};

export function BuilderDropdown({
  value,
  options,
  onValueChange,
  className,
}: BuilderDropdownProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn('justify-between font-normal', className)}
          type="button"
          variant="outline"
        >
          <span className="truncate">{selected?.label ?? 'Select'}</span>
          <HugeiconsIcon className="size-4 opacity-60" icon={ArrowDown01Icon} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
      >
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onValueChange(option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
