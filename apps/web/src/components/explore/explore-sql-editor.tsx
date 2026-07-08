'use client';

import { InformationCircleIcon, PlayIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ExploreSqlQuery } from '@phase/shared';
import { useState } from 'react';
import { ExploreInstructionsDialog } from '@/components/explore/explore-instructions-dialog';
import { SqlHighlightTextarea } from '@/components/explore/sql-highlight-textarea';
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
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  return (
    <>
      <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/25 px-4 py-2.5">
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            SQL
          </p>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setInstructionsOpen(true)}
              size="sm"
              type="button"
              variant="outline"
            >
              <HugeiconsIcon className="size-4" icon={InformationCircleIcon} />
              Instructions
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

        <SqlHighlightTextarea
          onChange={(sql) => onChange({ version: 1, sql })}
          onRun={onRun}
          value={query.sql}
        />
      </div>

      <ExploreInstructionsDialog
        onOpenChange={setInstructionsOpen}
        open={instructionsOpen}
      />
    </>
  );
}
