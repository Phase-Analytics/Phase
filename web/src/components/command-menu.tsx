'use client';

import { FolderSearchIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Fuse from 'fuse.js';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Blur } from '@/components/ui/blur';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { getAltKey, getModifierKey } from '@/lib/platform';
import { cn } from '@/lib/utils';

const NUMBER_KEY_REGEX = /^[1-9]$/;

type CommandItem = {
  id: string;
  name: string;
  icon: typeof Search01Icon;
  keywords: string[];
  path: string;
};

type CommandMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
};

function CommandMenuItem({
  item,
  index,
  isSelected,
  onClick,
  onMouseEnter,
}: {
  item: CommandItem;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  const [altKey, setAltKey] = useState<string | null>('⌥');

  useEffect(() => {
    setAltKey(getAltKey());
  }, []);

  return (
    <motion.button
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors duration-100 hover:bg-accent/50',
        isSelected && 'bg-accent text-accent-foreground hover:bg-accent'
      )}
      exit={{ opacity: 0, scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      type="button"
    >
      <HugeiconsIcon className="size-4 shrink-0" icon={item.icon} />
      <span className="flex-1 text-sm">{item.name}</span>
      {index < 9 && altKey && (
        <KbdGroup>
          <Kbd>{altKey}</Kbd>
          <Kbd>{index + 1}</Kbd>
        </KbdGroup>
      )}
    </motion.button>
  );
}

export function CommandMenu({ open, onOpenChange, items }: CommandMenuProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ['name', 'keywords'],
        threshold: 0.3,
        distance: 55,
        minMatchCharLength: 1,
        includeScore: true,
      }),
    [items]
  );

  const filteredItems = useMemo(() => {
    if (!search.trim()) {
      return items;
    }
    return fuse.search(search).map((result) => result.item);
  }, [search, items, fuse]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, []);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      router.push(item.path);
      onOpenChange(false);
    },
    [router, onOpenChange]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.code.startsWith('Digit') && e.code.length === 6) {
        const digit = e.code.slice(-1);
        if (NUMBER_KEY_REGEX.test(digit)) {
          e.preventDefault();
          const index = Number.parseInt(digit, 10) - 1;
          if (filteredItems[index]) {
            handleSelect(filteredItems[index]);
          }
          return;
        }
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
        e.preventDefault();
        handleSelect(filteredItems[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filteredItems, selectedIndex, handleSelect]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="gap-2 p-0 sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Command Menu</DialogTitle>
        </DialogHeader>
        <div className="relative border-b px-4 py-3">
          <div className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-7 z-10">
            <HugeiconsIcon
              className="size-4 text-muted-foreground"
              icon={Search01Icon}
            />
          </div>
          <Input
            className="h-8 border-none shadow-none focus-within:ring-0 [&_.absolute]:left-9 [&_input]:pl-9"
            maxLength={24}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search..."
            type="text"
            value={search}
          />
        </div>
        <div className="max-h-[200px] min-h-[200px] overflow-y-auto px-2">
          {filteredItems.length > 0 ? (
            <div className="flex flex-col gap-1">
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, index) => (
                  <CommandMenuItem
                    index={index}
                    isSelected={index === selectedIndex}
                    item={item}
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                  />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex min-h-[184px] items-center justify-center">
              <Blur
                blur={0}
                className="flex flex-col items-center justify-center gap-3 text-center"
                initialBlur={10}
                inView
                key={search.length === 0 ? 'empty' : 'search'}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  duration: 0.3,
                }}
              >
                <HugeiconsIcon
                  className="size-8 text-muted-foreground/50"
                  icon={search.length === 0 ? Search01Icon : FolderSearchIcon}
                />
                <p className="text-muted-foreground text-sm">
                  {search.length === 0
                    ? 'Start typing to search...'
                    : `No results found for "${search}"`}
                </p>
              </Blur>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type { CommandItem };

export function CommandMenuTrigger({ onClick }: { onClick: () => void }) {
  const [modKey, setModKey] = useState<string | null>('⌘');

  useEffect(() => {
    setModKey(getModifierKey());
  }, []);

  return (
    <button
      className="hidden h-9 w-full items-center gap-2 rounded-md border bg-background px-3 text-muted-foreground text-sm shadow-[var(--shadow),var(--highlight)] transition-colors hover:bg-accent hover:text-accent-foreground sm:flex sm:w-54"
      onClick={onClick}
      type="button"
    >
      <HugeiconsIcon className="size-4 shrink-0" icon={Search01Icon} />
      <span className="flex-1 text-left">Search...</span>
      {modKey && (
        <KbdGroup>
          <Kbd>{modKey}</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      )}
    </button>
  );
}
