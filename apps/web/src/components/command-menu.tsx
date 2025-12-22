'use client';

import { FolderSearchIcon, Search01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import Fuse from 'fuse.js';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Blur } from '@/components/ui/blur';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import { getModifierKey } from '@/lib/platform';
import { cn } from '@/lib/utils';

type CommandItem = {
  id: string;
  name: string;
  description?: string;
  category?: string;
  icon: typeof Search01Icon;
  keywords: string[];
  path: string;
  external?: boolean;
  onSelect?: () => void | Promise<void>;
};

type CommandMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
};

function CommandMenuItem({
  item,
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
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isSelected && ref.current) {
      ref.current.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [isSelected]);

  return (
    <motion.button
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors duration-100',
        isSelected && 'bg-accent text-accent-foreground'
      )}
      exit={{ opacity: 0, scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      ref={ref}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      type="button"
    >
      <HugeiconsIcon className="size-4 shrink-0" icon={item.icon} />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="font-medium text-sm">{item.name}</span>
        {item.description && (
          <span className="text-muted-foreground text-xs">
            {item.description}
          </span>
        )}
      </div>
      {item.category && (
        <span className="shrink-0 self-center text-muted-foreground text-xs">
          {item.category}
        </span>
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
    setSelectedIndex((prev) => {
      if (prev >= filteredItems.length) {
        return 0;
      }
      return prev;
    });
  }, [filteredItems.length]);

  const handleSelect = useCallback(
    async (item: CommandItem) => {
      if (item.onSelect) {
        await item.onSelect();
      } else if (item.external) {
        window.open(item.path, '_blank', 'noopener,noreferrer');
      } else {
        router.push(item.path);
      }
      onOpenChange(false);
    },
    [router, onOpenChange]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
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
      <DialogContent className="gap-0 p-0 sm:max-w-md" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Command Menu</DialogTitle>
        </DialogHeader>
        <Input
          className="h-auto rounded-none border-none bg-transparent px-4 py-3 shadow-none focus-within:ring-0 [&_input]:px-0 [&_input]:py-0 [&_span]:left-4"
          maxLength={24}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Type a command or search..."
          type="text"
          value={search}
        />
        <div className="max-h-[300px] min-h-[300px] overflow-y-auto px-2 py-2">
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
        {filteredItems.length > 0 && filteredItems[selectedIndex] && (
          <div className="flex items-center gap-2 px-4 py-2">
            <Kbd>↵</Kbd>
            <span className="text-muted-foreground text-xs">
              {filteredItems[selectedIndex].description ||
                filteredItems[selectedIndex].name}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export type { CommandItem };

export function CommandMenuTrigger({ onClick }: { onClick: () => void }) {
  const [modKey, setModKey] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setModKey(getModifierKey());
  }, []);

  return (
    <button
      className="hidden h-9 w-full items-center gap-2 rounded-md border bg-background px-3 text-muted-foreground text-sm shadow-[var(--shadow),var(--highlight)] transition-colors hover:bg-accent hover:text-accent-foreground sm:flex sm:w-48"
      onClick={onClick}
      type="button"
    >
      <HugeiconsIcon className="size-4 shrink-0" icon={Search01Icon} />
      <span className="flex-1 text-left">Search</span>
      {mounted && modKey && (
        <KbdGroup>
          <Kbd>{modKey}</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      )}
    </button>
  );
}
