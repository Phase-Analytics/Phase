'use client';

import { SparklesIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useExploreGenerateQuery } from '@/lib/queries/use-explore';
import { cn } from '@/lib/utils';
import type { ExploreQueryDefinition } from './explore-query-utils';

type ExploreAiPromptProps = {
  appId: string;
  summary: string | null;
  onDraftingChange?: (isDrafting: boolean) => void;
  onGenerated: (payload: {
    query: ExploreQueryDefinition;
    summary: string;
  }) => void;
};

export function ExploreAiPrompt({
  appId,
  summary,
  onDraftingChange,
  onGenerated,
}: ExploreAiPromptProps) {
  const [input, setInput] = useState('');
  const [isDrafting, setIsDrafting] = useState(false);
  const generateQuery = useExploreGenerateQuery();
  const lastAppliedSummary = useRef<string | null>(null);

  useEffect(() => {
    if (isDrafting) {
      return;
    }
    if (summary === lastAppliedSummary.current) {
      return;
    }
    lastAppliedSummary.current = summary;
    setInput(summary ?? '');
  }, [summary, isDrafting]);

  const setDrafting = (next: boolean) => {
    setIsDrafting(next);
    onDraftingChange?.(next);
  };

  const trimmed = input.trim();
  const showingSummary = Boolean(summary) && !isDrafting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trimmed || generateQuery.isPending) {
      return;
    }

    if (showingSummary && trimmed === summary?.trim()) {
      return;
    }

    const result = await generateQuery.mutateAsync({
      appId,
      prompt: trimmed,
    });

    setDrafting(false);
    onGenerated({
      query: result.query,
      summary: result.summary,
    });
  };

  return (
    <form
      className="overflow-hidden rounded-xl border bg-card shadow-xs"
      onSubmit={handleSubmit}
    >
      <div className="border-b bg-muted/25 px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              className="size-4 text-muted-foreground"
              icon={SparklesIcon}
            />
            <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Natural language
            </p>
          </div>
          {showingSummary ? (
            <Button
              onClick={() => {
                setDrafting(true);
                setInput('');
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              New question
            </Button>
          ) : null}
        </div>
      </div>
      <div className="space-y-3 p-4">
        <textarea
          className={cn(
            'min-h-[88px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-xs outline-none',
            'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
            showingSummary && 'text-foreground'
          )}
          disabled={generateQuery.isPending}
          onChange={(event) => {
            setInput(event.target.value);
            if (!isDrafting) {
              setDrafting(true);
            }
          }}
          placeholder="e.g. How many times do iOS users in the US open the game each day, shown day by day"
          readOnly={showingSummary}
          value={input}
        />

        {generateQuery.error ? (
          <p className="text-destructive text-sm">
            {generateQuery.error.message}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button
            disabled={
              !trimmed ||
              generateQuery.isPending ||
              (showingSummary && trimmed === summary?.trim())
            }
            type="submit"
          >
            {generateQuery.isPending ? (
              <>
                <Spinner className="size-4" />
                Generating
              </>
            ) : (
              <>
                <HugeiconsIcon className="size-4" icon={SparklesIcon} />
                {showingSummary ? 'Regenerate rule' : 'Generate rule'}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
