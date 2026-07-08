'use client';

import { Copy01Icon, InformationCircleIcon, PlayIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ExploreSqlQuery } from '@phase/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { EXPLORE_INSTRUCTIONS } from '@/components/explore/explore-instructions';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type ExploreSqlEditorProps = {
  query: ExploreSqlQuery;
  onChange: (query: ExploreSqlQuery) => void;
  onRun: () => void;
  isRunning: boolean;
};

export function ExploreSqlEditor({
  query,
  onChange,
  onRun,
  isRunning,
}: ExploreSqlEditorProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyInstructions = async () => {
    try {
      await navigator.clipboard.writeText(EXPLORE_INSTRUCTIONS);
      setCopied(true);
      toast.success('Instructions copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy instructions');
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/25 px-4 py-2.5">
        <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
          Query
        </p>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCopyInstructions}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon className="size-4" icon={InformationCircleIcon} />
            {copied ? 'Copied' : 'Instructions'}
            {!copied ? (
              <HugeiconsIcon className="size-3.5 opacity-60" icon={Copy01Icon} />
            ) : null}
          </Button>
          <Button
            className="relative min-w-24"
            disabled={isRunning || !query.sql.trim()}
            onClick={onRun}
            size="sm"
            type="button"
          >
            {isRunning ? (
              <Spinner className="absolute inset-0 m-auto size-4" />
            ) : (
              <HugeiconsIcon className="size-4" icon={PlayIcon} />
            )}
            <span className={cn(isRunning && 'invisible')}>Run</span>
          </Button>
        </div>
      </div>

      <textarea
        className="min-h-[220px] w-full resize-y bg-background p-4 font-mono text-sm leading-relaxed outline-none"
        onChange={(event) =>
          onChange({ version: 1, sql: event.target.value })
        }
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            onRun();
          }
        }}
        placeholder="SELECT ..."
        spellCheck={false}
        value={query.sql}
      />
    </div>
  );
}
