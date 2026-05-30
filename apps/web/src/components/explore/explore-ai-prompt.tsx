'use client';

import { SparklesIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  };

  return (
    <Card className="py-0">
      <CardContent className="space-y-4 p-4">
        <div>
          <h2 className="font-semibold text-muted-foreground text-sm uppercase">
            Ask a question
          </h2>
          <p className="text-muted-foreground text-sm">
            Describe what you want to analyze in plain language
          </p>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <textarea
            className={cn(
              'flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none',
              'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            disabled={generateQuery.isPending}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="e.g. Users who clicked paywall, broken down by platform"
            value={prompt}
          />

          {generateQuery.error ? (
            <p className="text-destructive text-sm">
              {generateQuery.error.message}
            </p>
          ) : null}

          <Button disabled={!trimmed || generateQuery.isPending} type="submit">
            {generateQuery.isPending ? (
              <>
                <Spinner className="size-4" />
                Generating...
              </>
            ) : (
              <>
                <HugeiconsIcon className="size-4" icon={SparklesIcon} />
                Generate query
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
