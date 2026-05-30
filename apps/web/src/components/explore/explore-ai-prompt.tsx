'use client';

import { SparklesIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useExploreGenerateQuery } from '@/lib/queries/use-explore';
import { cn } from '@/lib/utils';
import type { ExploreQueryDefinition } from './explore-query-utils';

type ExploreAiPromptProps = {
  appId: string;
  onGenerated: (payload: {
    query: ExploreQueryDefinition;
    summary: string;
  }) => void;
};

export function ExploreAiPrompt({ appId, onGenerated }: ExploreAiPromptProps) {
  const [prompt, setPrompt] = useState('');
  const generateQuery = useExploreGenerateQuery();
  const trimmed = prompt.trim();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!trimmed || generateQuery.isPending) {
      return;
    }

    const result = await generateQuery.mutateAsync({
      appId,
      prompt: trimmed,
    });

    onGenerated({
      query: result.query,
      summary: result.summary,
    });
    setPrompt('');
  };

  return (
    <form
      className="overflow-hidden rounded-xl border bg-card shadow-xs"
      onSubmit={handleSubmit}
    >
      <div className="border-b bg-muted/25 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            className="size-4 text-muted-foreground"
            icon={SparklesIcon}
          />
          <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
            Natural language
          </p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <textarea
          className={cn(
            'min-h-[88px] w-full resize-y rounded-lg border border-input bg-background px-3 py-2.5 text-sm shadow-xs outline-none',
            'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'disabled:cursor-not-allowed disabled:opacity-50'
          )}
          disabled={generateQuery.isPending}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder='e.g. "Count devices who performed paywall_clicked where platform is ios, split by country"'
          value={prompt}
        />

        {generateQuery.error ? (
          <p className="text-destructive text-sm">
            {generateQuery.error.message}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button disabled={!trimmed || generateQuery.isPending} type="submit">
            {generateQuery.isPending ? (
              <>
                <Spinner className="size-4" />
                Generating
              </>
            ) : (
              <>
                <HugeiconsIcon className="size-4" icon={SparklesIcon} />
                Generate rule
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
